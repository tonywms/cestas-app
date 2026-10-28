"use client";

import {
  Barcode,
  CheckCircle2,
  MapPin,
  PackageCheck,
  ScanLine,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { registrarEntregaVolume, type EntregaVolumeState } from "./actions";

type Cliente = { id: number; codigo: string; nome: string; endereco: string };
type TipoCesta = { id: number; codigo: string; nome: string; saldo: number; volumesDisponiveis: number };

const initialState: EntregaVolumeState = {
  success: false,
  message: "",
  quantidade: 0,
  saldoAnterior: null,
  saldoAtual: null,
  rotaClienteId: null,
};

export default function EntregaVolumeForm({
  cargaId,
  cargaCodigo,
  clientes,
  clienteSelecionado,
  rotaClienteId,
  tipos,
  exigirBipagem,
}: {
  cargaId: number;
  cargaCodigo: string;
  clientes: Cliente[];
  clienteSelecionado: Cliente | null;
  rotaClienteId: number | null;
  tipos: TipoCesta[];
  exigirBipagem: boolean;
}) {
  const [state, formAction, pending] = useActionState(registrarEntregaVolume, initialState);
  const [modal, setModal] = useState(false);
  const [tipoId, setTipoId] = useState(tipos[0]?.id ? String(tipos[0].id) : "");
  const [codigo, setCodigo] = useState("");
  const [codigos, setCodigos] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.message) setModal(true);
  }, [state]);

  const tipoSelecionado = useMemo(
    () => tipos.find((item) => String(item.id) === tipoId) ?? null,
    [tipos, tipoId],
  );

  function adicionarCodigo() {
    const normalizado = codigo.trim().toUpperCase();
    if (!normalizado) return inputRef.current?.focus();
    if (codigos.includes(normalizado)) {
      setCodigo("");
      return inputRef.current?.focus();
    }
    if (tipoSelecionado && codigos.length >= tipoSelecionado.volumesDisponiveis) return;
    setCodigos((atual) => [...atual, normalizado]);
    setCodigo("");
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }

  const podeConfirmar = exigirBipagem ? codigos.length > 0 : true;

  return (
    <>
      <section className="rounded-[26px] border border-black/[0.04] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
            <PackageCheck size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">Carga atual</p>
            <h2 className="mt-1 text-[16px] font-black">{cargaCodigo}</h2>
            <p className="mt-1 text-[9px] text-slate-400">Controle físico por volume</p>
          </div>
        </div>
      </section>

      {clienteSelecionado && (
        <section className="mt-4 rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.06)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
              <UserRound size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">{rotaClienteId ? "Cliente da rota" : "Cliente da venda"}</p>
              <h3 className="mt-1 text-[16px] font-black">{clienteSelecionado.nome}</h3>
              <p className="mt-1 text-[8px] font-bold text-slate-400">{clienteSelecionado.codigo}</p>
              <div className="mt-3 flex items-start gap-2 text-[9px] leading-5 text-slate-500">
                <MapPin size={13} className="mt-0.5 shrink-0" />
                <span>{clienteSelecionado.endereco}</span>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[7px] font-black text-emerald-700">{rotaClienteId ? "ROTA" : "CAMPO"}</span>
          </div>
        </section>
      )}

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="carga_id" value={cargaId} />
        {rotaClienteId && <input type="hidden" name="rota_cliente_id" value={rotaClienteId} />}

        {clienteSelecionado ? (
          <input type="hidden" name="cliente_id" value={clienteSelecionado.id} />
        ) : (
          <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
            <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Cliente</label>
            <select name="cliente_id" required className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-bold outline-none focus:border-emerald-400">
              <option value="">Selecione</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome} — {cliente.codigo}</option>
              ))}
            </select>
          </section>
        )}

        <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Tipo de cesta</label>
          <select
            name="tipo_cesta_id"
            required
            value={tipoId}
            onChange={(event) => {
              setTipoId(event.target.value);
              setCodigos([]);
              setCodigo("");
            }}
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-bold outline-none focus:border-emerald-400"
          >
            {tipos.map((item) => (
              <option key={item.id} value={item.id}>{item.nome} — saldo {item.saldo}</option>
            ))}
          </select>

          {tipoSelecionado && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniResumo label="Saldo móvel" valor={tipoSelecionado.saldo} />
              <MiniResumo label="Volumes ativos" valor={tipoSelecionado.volumesDisponiveis} destaque />
            </div>
          )}
        </section>

        {exigirBipagem ? (
          <section className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">Bipagem obrigatória</p>
                <h3 className="mt-1 text-[17px] font-black">Volumes da entrega</h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black text-emerald-700">{codigos.length}</span>
            </div>

            <div className="relative mt-4">
              <ScanLine size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]" />
              <input
                ref={inputRef}
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    adicionarCodigo();
                  }
                }}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Bipe o QR da cesta"
                className="h-[60px] w-full rounded-[18px] border-2 border-emerald-100 bg-white pl-12 pr-4 font-mono text-[11px] font-black uppercase outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
              />
            </div>

            <button type="button" onClick={adicionarCodigo} className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-[15px] border border-emerald-100 bg-emerald-50 text-[9px] font-black text-emerald-800">
              <Barcode size={15} /> Adicionar volume
            </button>

            {codigos.length === 0 ? (
              <div className="mt-4 rounded-[17px] bg-[#f6f9f6] p-5 text-center">
                <ScanLine size={23} className="mx-auto text-slate-300" />
                <p className="mt-2 text-[9px] font-black text-slate-500">Nenhum volume bipado</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {codigos.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-[16px] bg-[#f5faf6] px-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-emerald-100 text-emerald-700"><CheckCircle2 size={17} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Volume {index + 1}</p>
                      <p className="mt-1 truncate font-mono text-[9px] font-black">{item}</p>
                    </div>
                    <button type="button" onClick={() => setCodigos((atual) => atual.filter((codigoAtual) => codigoAtual !== item))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white text-red-500 shadow-sm"><Trash2 size={15} /></button>
                    <input type="hidden" name="codigos_volume" value={item} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
            <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Quantidade entregue</label>
            <input type="number" name="quantidade" min={1} max={tipoSelecionado?.saldo} defaultValue={1} required className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-emerald-500" />
            <p className="mt-2 text-[8px] leading-4 text-slate-400">A empresa controla volumes, mas não exige bipagem na entrega. O sistema consumirá volumes disponíveis da carga.</p>
          </section>
        )}

        <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Observação</label>
          <input name="observacao" placeholder="Opcional" className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[11px] font-semibold outline-none focus:border-emerald-500" />
        </section>

        <button type="submit" disabled={pending || !podeConfirmar} className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40">
          <PackageCheck size={18} />
          {pending ? "Concluindo entrega..." : exigirBipagem ? `Confirmar ${codigos.length} volume(s)` : "Confirmar entrega"}
        </button>
      </form>

      {modal && state.message && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[400px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${state.success ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
              {state.success ? <CheckCircle2 size={31} /> : <XCircle size={31} />}
            </div>
            <p className="mt-5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{state.success ? "Operação concluída" : "Entrega não concluída"}</p>
            <h3 className="mt-2 text-[21px] font-black">{state.success ? "Entrega rastreada" : "Verifique a bipagem"}</h3>
            <p className="mt-3 text-[10px] leading-5 text-slate-500">{state.message}</p>
            {state.success && state.saldoAnterior !== null && state.saldoAtual !== null && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniResumo label="Antes" valor={state.saldoAnterior} />
                <MiniResumo label="Agora" valor={state.saldoAtual} destaque />
              </div>
            )}
            {state.success ? (
              <Link href={rotaClienteId ? "/mobile/rota" : "/mobile/carga"} className="mt-6 flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white">{rotaClienteId ? "Continuar rota" : "Ver Minha Carga"}</Link>
            ) : (
              <button type="button" onClick={() => setModal(false)} className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white">Entendi</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MiniResumo({ label, valor, destaque = false }: { label: string; valor: number; destaque?: boolean }) {
  return (
    <div className={`rounded-[16px] p-3 ${destaque ? "bg-emerald-50" : "bg-[#f6f9f6]"}`}>
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 text-[19px] font-black ${destaque ? "text-emerald-700" : ""}`}>{valor}</p>
    </div>
  );
}