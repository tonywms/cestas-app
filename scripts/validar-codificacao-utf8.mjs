// Valida UTF-8 do codigo-fonte antes de cada build; nao altera arquivos.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname, relative } from "node:path";
const raiz = process.cwd();
const dirs = ["src", "database", "docs", "scripts", "supabase", "public"];
const extensoes = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css", ".md", ".sql", ".svg", ".txt", ".html", ".xml", ".yml", ".yaml"]);
const ignorar = new Set([".git", ".next", "node_modules", ".vercel", "dist", "out", "build", ".turbo"]);
const suspeito = /(?:\u00c3[\u0080-\u00bf\u00a0-\u00ff\u0192\u0152\u017d\u2021]|\u00c2[\u0080-\u00bf\u00a0-\u00ff]|\u00e2(?:\u20ac|\u02c6)|\ufffd|\u00f0\u0178)/u;
const decoder = new TextDecoder("utf-8", { fatal: true });
const falhas = [];
let analisados = 0;
function inspecionar(pasta) {
  if (!existsSync(pasta)) return;
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    if (ignorar.has(item.name)) continue;
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) { inspecionar(caminho); continue; }
    if (!item.isFile() || !extensoes.has(extname(item.name).toLowerCase())) continue;
    if (item.name === "validar-codificacao-utf8.mjs") continue;
    const nome = relative(raiz, caminho).replaceAll("\\", "/");
    let texto;
    try { texto = decoder.decode(readFileSync(caminho)); }
    catch { falhas.push(nome + ": bytes invalidos para UTF-8"); continue; }
    analisados++;
    const linhas = texto.split(/\r?\n/u);
    for (let i = 0; i < linhas.length; i++) {
      if (suspeito.test(linhas[i])) falhas.push(nome + ":" + (i + 1) + ": texto possivelmente corrompido");
    }
  }
}
for (const dir of dirs) inspecionar(join(raiz, dir));
if (falhas.length) {
  console.error("[CESTAS_UTF8] Falha de codificacao: " + falhas.length + " ocorrencia(s)");
  falhas.slice(0, 60).forEach(x => console.error("  " + x));
  process.exitCode = 1;
} else {
  console.log("[CESTAS_UTF8] " + analisados + " arquivos UTF-8 verificados, sem anomalias.");
}
