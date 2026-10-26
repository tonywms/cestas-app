/**
 * Remove o fundo branco da logo e salva um PNG transparente (sem halo branco).
 *
 * Uso (na raiz do projeto):
 *   npm run logo:transparent
 *
 * Opcional:
 *   npm run logo:transparent -- entrada.png saida.png --tolerance 40 --feather 2
 *
 * Como funciona:
 *  1. Marca como "fundo" apenas o branco CONECTADO às bordas da imagem
 *     (o branco que faz parte da logo, como letras e brilhos, é preservado).
 *  2. Faz "color-to-alpha" numa faixa fina ao redor do contorno, removendo o
 *     halo branco do anti-aliasing e deixando a borda suave.
 *  3. Recorta o espaço vazio em volta e salva um PNG RGBA otimizado.
 */
import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_INPUT = "public/branding/cestas-app-logo.png";

type Options = { tolerance: number; feather: number; pad: number };

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const opts: Options = { tolerance: 28, feather: 2, pad: 12 };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tolerance") opts.tolerance = Number(argv[++i]);
    else if (arg === "--feather") opts.feather = Number(argv[++i]);
    else if (arg === "--pad") opts.pad = Number(argv[++i]);
    else positional.push(arg);
  }

  return { input: positional[0] ?? DEFAULT_INPUT, output: positional[1], opts };
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function removeBackground(inputPath: string, opts: Options) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const total = width * height;
  const min = 255 - opts.tolerance;

  // Pixel "quase branco" (ou já transparente)
  const nearWhite = new Uint8Array(total);
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    const lowest = Math.min(data[i], data[i + 1], data[i + 2]);
    nearWhite[p] = lowest >= min || data[i + 3] < 13 ? 1 : 0;
  }

  // Flood fill a partir das bordas: só o branco conectado ao exterior vira fundo
  const bg = new Uint8Array(total);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    const p = y * width + x;
    if (nearWhite[p] && !bg[p]) {
      bg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }

  // Faixa de transição ao redor do fundo (onde mora o halo branco)
  let reach = bg;
  for (let n = 0; n < opts.feather; n++) {
    const next = reach.slice();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (reach[p]) continue;
        if (
          (x > 0 && reach[p - 1]) ||
          (x < width - 1 && reach[p + 1]) ||
          (y > 0 && reach[p - width]) ||
          (y < height - 1 && reach[p + width])
        ) {
          next[p] = 1;
        }
      }
    }
    reach = next;
  }

  const out = Buffer.from(data); // cópia RGBA
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let p = 0; p < total; p++) {
    const i = p * 4;

    if (bg[p]) {
      out[i + 3] = 0;
      continue;
    }

    if (reach[p]) {
      // color-to-alpha (branco) só na faixa de borda
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const a = Math.min(1, Math.max(0, (255 - Math.min(r, g, b)) / 255));
      const aSafe = Math.max(a, 1e-3);
      const clamp = (v: number) => Math.max(0, Math.min(255, v));
      out[i] = clamp((r - 255 * (1 - aSafe)) / aSafe);
      out[i + 1] = clamp((g - 255 * (1 - aSafe)) / aSafe);
      out[i + 2] = clamp((b - 255 * (1 - aSafe)) / aSafe);
      out[i + 3] = Math.round(Math.min(data[i + 3] / 255, Math.min(1, a * 1.15)) * 255);
    }

    if (out[i + 3] > 8) {
      const x = p % width;
      const y = (p - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Recorta o vazio em volta (mantém uma folga para sombras/brilho)
  const left = Math.max(minX - opts.pad, 0);
  const top = Math.max(minY - opts.pad, 0);
  const right = Math.min(maxX + opts.pad, width - 1);
  const bottom = Math.min(maxY + opts.pad, height - 1);

  const image = sharp(out, { raw: { width, height, channels: 4 } });
  return maxX < 0
    ? image
    : image.extract({ left, top, width: right - left + 1, height: bottom - top + 1 });
}

async function main() {
  const { input, output, opts } = parseArgs(process.argv.slice(2));

  if (!(await exists(input))) {
    console.error(`Arquivo não encontrado: ${input}`);
    process.exit(1);
  }

  const dest = output ?? input;

  if (path.resolve(dest) === path.resolve(input)) {
    const backupDir = "branding-src";
    const backup = path.join(backupDir, `${path.parse(input).name}.original.png`);
    await mkdir(backupDir, { recursive: true });
    if (!(await exists(backup))) {
      await copyFile(input, backup);
      console.log(`Backup do original: ${backup}`);
    }
  }

  const result = await removeBackground(input, opts);
  const buffer = await result.png({ compressionLevel: 9 }).toBuffer();
  const meta = await sharp(buffer).metadata();
  await sharp(buffer).toFile(dest);

  console.log(`Logo transparente salva em: ${dest} (${meta.width}x${meta.height})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
