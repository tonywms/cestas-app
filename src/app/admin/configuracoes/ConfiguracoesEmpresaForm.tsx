"use client";

import {
  AlertTriangle,
  Barcode,
  Boxes,
  Check,
  CreditCard,
  PackageCheck,
  Save,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  atualizarConfiguracoesEmpresa,
} from "./actions";

const initialConfiguracaoEmpresaState = {
  success: false,
  message: "",
};

type ModoControleCarga =
  | "QUANTIDADE"
  | "VOLUME";

type Props = {
  empresaNome: string;

  configuracao: {
    modoControleCarga: ModoControleCarga;
    exigirBipagemCarga: boolean;
    exigirBipagemEntrega: boolean;
    permitirPagamentoMobile: boolean;
    permitirOcorrenciaMobile: boolean;
  };
};

export default function ConfiguracoesEmpresaForm({
  empresaNome,
  configuracao,
}: Props) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    atualizarConfiguracoesEmpresa,
    initialConfiguracaoEmpresaState,
  );

  const [
    modoControleCarga,
    setModoControleCarga,
  ] = useState<ModoControleCarga>(
    configuracao.modoControleCarga,
  );

  const [
    exigirBipagemCarga,
    setExigirBipagemCarga,
  ] = useState(
    configuracao.exigirBipagemCarga,
  );

  const [
    exigirBipagemEntrega,
    setExigirBipagemEntrega,
  ] = useState(
    configuracao.exigirBipagemEntrega,
  );

  const [
    permitirPagamentoMobile,
    setPermitirPagamentoMobile,
  ] = useState(
    configuracao.permitirPagamentoMobile,
  );

  const [
    permitirOcorrenciaMobile,
    setPermitirOcorrenciaMobile,
  ] = useState(
    configuracao.permitirOcorrenciaMobile,
  );

  useEffect(() => {
    if (
      modoControleCarga === "QUANTIDADE"
    ) {
      setExigirBipagemCarga(false);
      setExigirBipagemEntrega(false);
    }
  }, [modoControleCarga]);

  const usaVolume =
    modoControleCarga === "VOLUME";

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="modo_controle_carga"
        value={modoControleCarga}
      />

      <section className="overflow-hidden rounded-[30px] border border-black/[0.04] bg-white shadow-[0_18px_55px_rgba(17,63,33,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 md:px-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-[#14743d]">
              <Boxes size={21} />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#18834a]">
                Operação
              </p>

              <h2 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#122016]">
                Controle da carga
              </h2>

              <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500">
                Defina como a empresa controla as cestas
                que ficam em posse dos entregadores.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2 md:p-7">
          <button
            type="button"
            onClick={() =>
              setModoControleCarga(
                "QUANTIDADE",
              )
            }
            className={`relative rounded-[24px] border p-5 text-left transition-all ${
              modoControleCarga ===
              "QUANTIDADE"
                ? "border-[#19864b] bg-[#f0faf4] shadow-[0_12px_30px_rgba(25,134,75,0.09)]"
                : "border-slate-200 bg-white hover:border-emerald-200"
            }`}
          >
            {modoControleCarga ===
              "QUANTIDADE" && (
              <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[#19864b] text-white">
                <Check
                  size={15}
                  strokeWidth={3}
                />
              </div>
            )}

            <div
              className={`flex h-11 w-11 items-center justify-center rounded-[15px] ${
                modoControleCarga ===
                "QUANTIDADE"
                  ? "bg-[#19864b] text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <PackageCheck size={21} />
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#19864b]">
                Quantidade
              </p>

              <h3 className="mt-1 text-base font-black text-[#142019]">
                Controle simples
              </h3>

              <p className="mt-2 pr-6 text-xs leading-5 text-slate-500">
                O entregador possui apenas um saldo
                numérico de cestas. Não existe volume
                individual para bipar.
              </p>
            </div>

            <div className="mt-5 rounded-[16px] bg-white/80 px-4 py-3 text-[11px] font-bold text-slate-600">
              Exemplo: 10 cestas → entrega 1 → saldo 9.
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setModoControleCarga(
                "VOLUME",
              )
            }
            className={`relative rounded-[24px] border p-5 text-left transition-all ${
              modoControleCarga ===
              "VOLUME"
                ? "border-[#19864b] bg-[#f0faf4] shadow-[0_12px_30px_rgba(25,134,75,0.09)]"
                : "border-slate-200 bg-white hover:border-emerald-200"
            }`}
          >
            {modoControleCarga ===
              "VOLUME" && (
              <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[#19864b] text-white">
                <Check
                  size={15}
                  strokeWidth={3}
                />
              </div>
            )}

            <div
              className={`flex h-11 w-11 items-center justify-center rounded-[15px] ${
                modoControleCarga ===
                "VOLUME"
                  ? "bg-[#19864b] text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Barcode size={22} />
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#19864b]">
                Volume
              </p>

              <h3 className="mt-1 text-base font-black text-[#142019]">
                Rastreabilidade individual
              </h3>

              <p className="mt-2 pr-6 text-xs leading-5 text-slate-500">
                Cada cesta possui identificação
                individual por código de barras ou QR.
              </p>
            </div>

            <div className="mt-5 rounded-[16px] bg-white/80 px-4 py-3 text-[11px] font-bold text-slate-600">
              Exemplo: VOL001 até VOL010.
            </div>
          </button>
        </div>
      </section>

      <section className="rounded-[30px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_55px_rgba(17,63,33,0.06)] md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-[#14743d]">
            <ScanLine size={21} />
          </div>

          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#18834a]">
              Rastreabilidade
            </p>

            <h2 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#122016]">
              Bipagem de volumes
            </h2>

            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              Determine em quais etapas o código físico
              da cesta deve ser confirmado.
            </p>
          </div>
        </div>

        {!usaVolume && (
          <div className="mt-5 flex gap-3 rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-4">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <p className="text-[11px] font-semibold leading-5 text-amber-800">
              A empresa está operando por{" "}
              <strong>QUANTIDADE</strong>. As opções
              de bipagem permanecem desativadas.
            </p>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <SwitchOption
            name="exigir_bipagem_carga"
            titulo="Bipar ao receber a carga"
            descricao="O entregador precisa bipar cada volume antes de confirmar que recebeu a carga."
            checked={exigirBipagemCarga}
            disabled={!usaVolume}
            onChange={
              setExigirBipagemCarga
            }
          />

          <SwitchOption
            name="exigir_bipagem_entrega"
            titulo="Bipar na entrega"
            descricao="A entrega somente é concluída após identificar o volume entregue ao cliente."
            checked={exigirBipagemEntrega}
            disabled={!usaVolume}
            onChange={
              setExigirBipagemEntrega
            }
          />
        </div>
      </section>

      <section className="rounded-[30px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_55px_rgba(17,63,33,0.06)] md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-[#14743d]">
            <Smartphone size={21} />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#18834a]">
              Aplicativo do entregador
            </p>

            <h2 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#122016]">
              Funções mobile
            </h2>

            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              Ative apenas as funções que fazem sentido
              para a operação de {empresaNome}.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <SwitchOption
            name="permitir_pagamento_mobile"
            titulo="Recebimentos pelo entregador"
            descricao="Permite registrar pagamento e recebimento durante a visita ao cliente."
            icon={
              <CreditCard size={18} />
            }
            checked={
              permitirPagamentoMobile
            }
            onChange={
              setPermitirPagamentoMobile
            }
          />

          <SwitchOption
            name="permitir_ocorrencia_mobile"
            titulo="Ocorrências em campo"
            descricao="Permite registrar cliente ausente, recusa, endereço incorreto e demais ocorrências."
            icon={
              <AlertTriangle size={18} />
            }
            checked={
              permitirOcorrenciaMobile
            }
            onChange={
              setPermitirOcorrenciaMobile
            }
          />
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-[#effaf3] px-5 py-4">
        <ShieldCheck
          size={19}
          className="mt-0.5 shrink-0 text-[#14743d]"
        />

        <div>
          <p className="text-xs font-black text-[#146b3b]">
            Configuração protegida por empresa
          </p>

          <p className="mt-1 text-[11px] leading-5 text-[#548166]">
            Estas alterações afetam somente{" "}
            <strong>{empresaNome}</strong>.
            As políticas RLS impedem que um
            administrador altere configurações de outro
            fornecedor.
          </p>
        </div>
      </div>

      {state.message && (
        <div
          aria-live="polite"
          className={`rounded-[18px] border px-5 py-4 text-xs font-bold ${
            state.success
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="sticky bottom-4 z-20">
        <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/90 bg-white/90 p-4 shadow-[0_18px_50px_rgba(17,63,33,0.13)] backdrop-blur-xl">
          <div className="hidden md:block">
            <p className="text-xs font-black text-[#152019]">
              Configuração operacional
            </p>

            <p className="mt-0.5 text-[10px] text-slate-400">
              Salve para aplicar ao ambiente da empresa.
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[linear-gradient(135deg,#19864b,#0f6336)] px-7 text-sm font-black text-white shadow-[0_14px_30px_rgba(25,134,75,0.23)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            <Save size={18} />

            {pending
              ? "Salvando..."
              : "Salvar configurações"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SwitchOption({
  name,
  titulo,
  descricao,
  checked,
  disabled = false,
  onChange,
  icon,
}: {
  name: string;
  titulo: string;
  descricao: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  icon?: ReactNode;
}) {
  return (
    <label
      className={`flex items-center gap-4 rounded-[20px] border px-4 py-4 transition ${
        disabled
          ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
          : "cursor-pointer border-slate-100 bg-[#fbfdfb] hover:border-emerald-100"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="sr-only"
      />

      {icon && (
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700 sm:flex">
          {icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black text-[#152019]">
          {titulo}
        </p>

        <p className="mt-1 text-[10px] leading-4 text-slate-400">
          {descricao}
        </p>
      </div>

      <div
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked && !disabled
            ? "bg-[#18834a]"
            : "bg-slate-200"
        }`}
      >
        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked && !disabled
              ? "translate-x-6"
              : "translate-x-1"
          }`}
        />
      </div>
    </label>
  );
}