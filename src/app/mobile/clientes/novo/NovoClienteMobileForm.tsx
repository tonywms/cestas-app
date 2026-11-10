"use client";

import {
  CheckCircle2,
  MapPin,
  Phone,
  Save,
  ShoppingBag,
  UserRound,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import { useState, type FormEvent } from "react";
import { CAMPOS_CLIENTE, salvarClienteOffline, type DadosCliente } from "@/lib/mobile/offline-clientes";
import SincronizadorOfflineClientes from "@/components/mobile/SincronizadorOfflineClientes";

export default function NovoClienteMobileForm({
  empresaId, usuarioId,
}: { empresaId: string; usuarioId: string }) {
  const [salvando, setSalvando] = useState(false);
  const [mensagemLocal, setMensagemLocal] = useState("");

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    const form = evento.currentTarget;
    const dadosFormulario = new FormData(form);
    const dados = {} as DadosCliente;
    for (const campo of CAMPOS_CLIENTE) {
      dados[campo] = String(dadosFormulario.get(campo) ?? "").trim();
    }
    if (dados.nome.length < 3) {
      setMensagemLocal("Informe um nome com pelo menos 3 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      await salvarClienteOffline({
        id: crypto.randomUUID(),
        empresaId, usuarioId,
        criadoEm: new Date().toISOString(),
        status: "pendente", erro: null, dados,
      });
      form.reset();
      setMensagemLocal(
        "Cadastro salvo no aparelho. Será enviado ao Supabase automaticamente quando houver conexão. Até a confirmação, ele ainda não está disponível para venda.",
      );
    } catch {
      setMensagemLocal("Não foi possível salvar no aparelho. Os dados continuam no formulário; tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <form onSubmit={salvar} className="space-y-4">
        <Card
          icon={
            <UserRound
              size={19}
            />
          }
          title="Dados do cliente"
        >
          <Campo
            label="Nome *"
            name="nome"
            placeholder="Ex.: Maria Silva"
            required
          />

          <Campo
            label="CPF / CNPJ"
            name="cpf_cnpj"
            placeholder="Opcional"
          />

          <Campo
            label="Telefone / WhatsApp"
            name="telefone"
            placeholder="(85) 99999-9999"
            icon={
              <Phone
                size={16}
              />
            }
          />
        </Card>

        <Card
          icon={
            <MapPin
              size={19}
            />
          }
          title="Endereço"
        >
          <Campo
            label="Rua / Avenida"
            name="logradouro"
            placeholder="Ex.: Av. Santos Dumont"
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              label="Número"
              name="numero"
              placeholder="2500"
            />

            <Campo
              label="Complemento"
              name="complemento"
              placeholder="Apto / casa"
            />
          </div>

          <Campo
            label="Bairro"
            name="bairro"
            placeholder="Ex.: Aldeota"
          />

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Campo
              label="Cidade"
              name="cidade"
              placeholder="Fortaleza"
            />

            <Campo
              label="UF"
              name="uf"
              placeholder="CE"
              maxLength={2}
            />
          </div>

          <Campo
            label="CEP"
            name="cep"
            placeholder="00000-000"
          />
        </Card>

        <button
          type="submit"
          disabled={salvando}
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[12px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.22)] disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {salvando ? "Salvando no aparelho..." : "Salvar cadastro"}
        </button>
      </form>


      {mensagemLocal && (
        <div role="status" aria-live="polite"
          className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[12px] font-semibold leading-relaxed text-emerald-900">
          {mensagemLocal}
        </div>
      )}
      <SincronizadorOfflineClientes empresaId={empresaId} usuarioId={usuarioId} />
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Cadastros pendentes ficam neste navegador, inclusive sem internet. Não limpe os dados do
        site nem use modo anônimo durante a operação. O cadastro só é confirmado após a
        sincronização no Supabase.
      </p>
    </>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon:
    React.ReactNode;
  title:
    string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
          {
            icon
          }
        </div>

        <h2 className="text-[16px] font-black">
          {
            title
          }
        </h2>
      </div>

      <div className="space-y-4">
        {
          children
        }
      </div>
    </section>
  );
}

function Campo({
  label,
  name,
  placeholder,
  required = false,
  icon,
  maxLength,
}: {
  label:
    string;
  name:
    string;
  placeholder:
    string;
  required?:
    boolean;
  icon?:
    React.ReactNode;
  maxLength?:
    number;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {
          label
        }
      </span>

      <div className="relative mt-2">
        {icon ? (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700">
            {
              icon
            }
          </div>
        ) : null}

        <input
          name={
            name
          }
          placeholder={
            placeholder
          }
          required={
            required
          }
          maxLength={
            maxLength
          }
          className={`h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[12px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 ${
            icon
              ? "pl-11"
              : ""
          }`}
        />
      </div>
    </label>
  );
}
