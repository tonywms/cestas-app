"use client";

import {
  CheckCircle2,
  MapPin,
  Save,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  editarCliente,
  type EditarClienteState,
} from "./actions";

type Cliente = {
  id: number;
  codigo: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  ativo: boolean;
};

const initialState: EditarClienteState = {
  success: false,
  message: "",
};

export default function EditarClienteForm({
  cliente,
}: {
  cliente: Cliente;
}) {
  const router = useRouter();

  const [
    state,
    action,
    pending,
  ] = useActionState(
    editarCliente,
    initialState,
  );

  const [
    modal,
    setModal,
  ] = useState(false);

  useEffect(() => {
    if (state.message) {
      setModal(true);
    }
  }, [state]);

  function fecharModal() {
    if (state.success) {
      /*
       * Após uma alteração concluída,
       * voltamos para o Cliente 360°.
       */
      router.push(
        `/admin/clientes/${cliente.id}`,
      );

      router.refresh();

      return;
    }

    /*
     * Em caso de erro, permanece
     * na tela de edição para corrigir.
     */
    setModal(false);
  }

  return (
    <>
      <form
        action={action}
        className="space-y-5"
      >
        <input
          type="hidden"
          name="cliente_id"
          value={cliente.id}
        />

        {/* =========================================
            DADOS PRINCIPAIS
        ========================================== */}

        <section className="card-premium overflow-hidden rounded-[30px]">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                <UserRound size={21} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Cadastro
                </p>

                <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Dados principais
                </h2>

                <p className="mt-1 text-[9px] text-slate-400">
                  Código {cliente.codigo}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <Campo
              name="nome"
              label="Nome"
              defaultValue={cliente.nome}
              required
            />

            <Campo
              name="cpf_cnpj"
              label="CPF / CNPJ"
              defaultValue={
                cliente.cpf_cnpj ?? ""
              }
              placeholder="Opcional"
            />

            <Campo
              name="telefone"
              label="Telefone"
              defaultValue={
                cliente.telefone ?? ""
              }
              placeholder="(85) 99999-9999"
            />

            <label className="flex min-h-[72px] items-center justify-between rounded-[18px] border border-emerald-200 bg-emerald-50/60 px-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Status
                </p>

                <p className="mt-1 text-[11px] font-black">
                  Cliente ativo
                </p>
              </div>

              <input
                type="checkbox"
                name="ativo"
                defaultChecked={
                  cliente.ativo
                }
                className="h-5 w-5 accent-[#176f3c]"
              />
            </label>
          </div>
        </section>

        {/* =========================================
            ENDEREÇO
        ========================================== */}

        <section className="card-premium overflow-hidden rounded-[30px]">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                <MapPin size={21} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Localização
                </p>

                <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Endereço atual
                </h2>

                <p className="mt-1 max-w-xl text-[9px] leading-4 text-slate-400">
                  Se o endereço for alterado, o sistema preservará
                  o endereço das rotas já criadas. O novo endereço
                  será aplicado somente às próximas rotas.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <Campo
              name="logradouro"
              label="Endereço"
              defaultValue={
                cliente.logradouro ?? ""
              }
              placeholder="Rua / Avenida"
            />

            <Campo
              name="numero"
              label="Número"
              defaultValue={
                cliente.numero ?? ""
              }
              placeholder="123"
            />

            <Campo
              name="complemento"
              label="Complemento"
              defaultValue={
                cliente.complemento ?? ""
              }
              placeholder="Casa, apartamento..."
            />

            <Campo
              name="bairro"
              label="Bairro"
              defaultValue={
                cliente.bairro ?? ""
              }
            />

            <Campo
              name="cidade"
              label="Cidade"
              defaultValue={
                cliente.cidade ?? ""
              }
            />

            <Campo
              name="uf"
              label="UF"
              defaultValue={
                cliente.uf ?? ""
              }
              maxLength={2}
            />

            <Campo
              name="cep"
              label="CEP"
              defaultValue={
                cliente.cep ?? ""
              }
            />

            <div className="flex min-h-[72px] items-center gap-3 rounded-[18px] border border-emerald-100 bg-[#f3faf5] px-4">
              <ShieldCheck
                size={18}
                className="shrink-0 text-[#176f3c]"
              />

              <div>
                <p className="text-[9px] font-black text-[#176f3c]">
                  Histórico automático
                </p>

                <p className="mt-1 text-[8px] leading-4 text-slate-400">
                  Toda alteração de endereço gera uma nova versão.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            SALVAR
        ========================================== */}

        <button
          type="submit"
          disabled={pending}
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[12px] font-black text-white shadow-[0_16px_35px_rgba(23,111,60,0.22)] disabled:opacity-50"
        >
          <Save size={17} />

          {pending
            ? "Salvando alterações..."
            : "Salvar alterações"}
        </button>
      </form>

      {/* =========================================
          MODAL RESULTADO
      ========================================== */}

      {modal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[420px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                state.success
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {state.success ? (
                <CheckCircle2
                  size={31}
                />
              ) : (
                <XCircle
                  size={31}
                />
              )}
            </div>

            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              {state.success
                ? "Alteração concluída"
                : "Não foi possível salvar"}
            </p>

            <h3 className="mt-2 text-[20px] font-black">
              {state.success
                ? "Cliente atualizado"
                : "Verifique os dados"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {state.message}
            </p>

            <button
              type="button"
              onClick={
                fecharModal
              }
              className="mt-6 flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
            >
              {state.success
                ? "Voltar ao Cliente 360°"
                : "Entendi"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================
   CAMPO
========================================== */

function Campo({
  name,
  label,
  defaultValue,
  placeholder,
  required = false,
  maxLength,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label>
      <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>

      <input
        name={name}
        defaultValue={
          defaultValue
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
        className="mt-2 h-[56px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />
    </label>
  );
}