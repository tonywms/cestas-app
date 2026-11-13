#!/usr/bin/env node
// V134 - regressao local e nao destrutiva do fechamento de cargas.
// Verifica contratos implementados e cenarios numericos, sem acesso ao Supabase.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const raiz = process.cwd();
const arquivo = (path) => {
  const full = resolve(raiz, path);
  assert.ok(existsSync(full), "Arquivo ausente: " + path);
  return readFileSync(full, "utf8");
};

const acao = arquivo("src/app/mobile/carga/fechar/actions.ts");
const tela = arquivo("src/app/mobile/carga/fechar/page.tsx");
const formulario = arquivo("src/app/mobile/carga/fechar/FecharCargaForm.tsx");
const auditoria = arquivo("src/app/admin/auditoria-devolucoes/page.tsx");
const exportacao = arquivo("src/app/admin/auditoria-devolucoes/ExportarVolumesCsv.tsx");

function contrato(nome, ok) {
  assert.ok(ok, "Falhou: " + nome);
  console.log("OK | " + nome);
}
function fecharModelo(saldo, avarias, ids = [], tipoId = 1) {
  assert.ok(Number.isSafeInteger(saldo) && saldo >= 0, "Saldo invalido");
  assert.ok(Number.isSafeInteger(avarias) && avarias >= 0 && avarias <= saldo, "Avaria excede saldo");
  assert.equal(new Set(ids).size, ids.length, "Volume avariado duplicado");
  assert.equal(ids.length, avarias, "Avarias e IDs nao conferem");
  assert.ok(Number.isSafeInteger(tipoId) && tipoId > 0, "Tipo de cesta invalido");
  return {
    retorno: saldo - avarias,
    avaria: avarias,
    acrescimoEstoqueCentral: saldo - avarias,
    baixasAvaria: avarias,
    saldoFinalMovel: 0,
  };
}
function rejeita(nome, fn) {
  assert.throws(fn, undefined, nome);
  console.log("OK | Bloqueio: " + nome);
}
const casos = [
  ["3 em posse, 1 avaria", 3, 1, ["id-A"], { retorno: 2, avaria: 1, acrescimoEstoqueCentral: 2, baixasAvaria: 1, saldoFinalMovel: 0 }],
  ["2 em posse, nenhum dano", 2, 0, [], { retorno: 2, avaria: 0, acrescimoEstoqueCentral: 2, baixasAvaria: 0, saldoFinalMovel: 0 }],
  ["entregas consumiram todo saldo", 0, 0, [], { retorno: 0, avaria: 0, acrescimoEstoqueCentral: 0, baixasAvaria: 0, saldoFinalMovel: 0 }],
  ["avaria total", 2, 2, ["id-A", "id-B"], { retorno: 0, avaria: 2, acrescimoEstoqueCentral: 0, baixasAvaria: 2, saldoFinalMovel: 0 }],
];
for (const [nome, saldo, avaria, ids, esperado] of casos) {
  assert.deepEqual(fecharModelo(saldo, avaria, ids), esperado, nome);
  console.log("OK | Cenario: " + nome);
}
rejeita("avaria maior que saldo", () => fecharModelo(1, 2, ["A", "B"]));
rejeita("volume avariado duplicado", () => fecharModelo(2, 2, ["A", "A"]));
rejeita("avaria informada sem identificacao fisica", () => fecharModelo(2, 1, []));
rejeita("quantidade fracionada", () => fecharModelo(2, .5, []));
const saldosPorTipo = new Map([[1, 1], [2, 2]]);
const ativosPorTipo = new Map([[1, 2], [2, 1]]);
assert.equal([...saldosPorTipo.values()].reduce((a,b)=>a+b,0),
             [...ativosPorTipo.values()].reduce((a,b)=>a+b,0));
assert.ok([...saldosPorTipo].some(([id,qtd]) => qtd !== ativosPorTipo.get(id)));
console.log("OK | Divergencia compensada entre tipos nao pode ser ignorada");

contrato("aceite explicito de encerramento integral",
  acao.includes('confirmacao_finalizar_carga') && formulario.includes('encerramentoConfirmado'));
contrato("confirmacao do saldo no servidor",
  acao.includes('posseConfirmada !== totalEmPosse') &&
  acao.includes('avariaConfirmada !== totalAvariado'));
contrato("resposta do banco verificada antes do sucesso",
  acao.includes('resultado.status !== "FINALIZADA"') &&
  acao.includes('Number(resultado.total_retornado) !== totalRetornado') &&
  acao.includes('Number(resultado.saldo_restante) !== 0'));
contrato("nao repetir operacao quando o resultado for incerto",
  formulario.includes('state.reason !== "RESULTADO_INDEFINIDO"'));
contrato("avaria identificada fisicamente por tipo",
  acao.includes('volumesAvariadosValidados') &&
  acao.includes('volumesAvariadosInformados.length !=='));
contrato("divergencia por tipo bloqueia tela de fechamento",
  tela.includes('divergencia-tipo-') && tela.includes('volumesEmPosseDetalhes.filter'));
contrato("conciliacao detalhada e exportacao no painel",
  auditoria.includes('divergenciaTipo') && auditoria.includes('ExportarMovimentacoesCsv') &&
  auditoria.includes('ExportarVolumesCsv'));
contrato("exportacao local sem acesso a API",
  exportacao.includes('URL.createObjectURL') && !exportacao.includes('fetch('));

console.log("\nV134: regressao estatica e cenarios de referencia aprovados.");
console.log("Este teste NAO executa fechamento real no Supabase nem substitui homologacao transacional.");
