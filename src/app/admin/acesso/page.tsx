export const instant = false;

import { redirect } from "next/navigation";

import {
  BadgeCheck,
  Barcode,
  Building2,
  Check,
  Crown,
  KeyRound,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

export default async function AcessoPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">

        <div className="rounded-[30px] bg-[linear-gradient(135deg,#176b3a,#0b4f29)] p-7 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck size={25} />
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                Diagnóstico de acesso
              </div>

              <h1 className="mt-1 text-2xl font-black">
                Contexto do usuário
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70">
            Esta tela mostra exatamente o contexto
            carregado pelo Cestas APP após o login.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">

          <Card
            icon={<UserRound size={20} />}
            titulo="Usuário"
          >
            <Linha
              label="Nome"
              valor={usuario.nome}
            />

            <Linha
              label="E-mail"
              valor={usuario.email ?? "-"}
            />

            <Linha
              label="Perfil"
              valor={usuario.perfilNome}
            />

            <Linha
              label="Código"
              valor={usuario.perfilCodigo}
            />
          </Card>

          <Card
            icon={<Building2 size={20} />}
            titulo="Empresa"
          >
            <Linha
              label="Código"
              valor={usuario.empresa.codigo}
            />

            <Linha
              label="Fornecedor"
              valor={
                usuario.empresa.nomeFantasia
              }
            />

            <Linha
              label="Status"
              valor={usuario.empresa.status}
            />
          </Card>

          <Card
            icon={<Barcode size={20} />}
            titulo="Operação"
          >
            <Linha
              label="Controle da carga"
              valor={
                usuario.configuracao
                  .modoControleCarga
              }
            />

            <Booleano
              label="Bipagem na carga"
              valor={
                usuario.configuracao
                  .exigirBipagemCarga
              }
            />

            <Booleano
              label="Bipagem na entrega"
              valor={
                usuario.configuracao
                  .exigirBipagemEntrega
              }
            />

            <Booleano
              label="Pagamento mobile"
              valor={
                usuario.configuracao
                  .permitirPagamentoMobile
              }
            />

            <Booleano
              label="Ocorrência mobile"
              valor={
                usuario.configuracao
                  .permitirOcorrenciaMobile
              }
            />
          </Card>

          <Card
            icon={<Crown size={20} />}
            titulo="Plataforma"
          >
            <Booleano
              label="Super Admin"
              valor={
                usuario.isPlatformAdmin
              }
            />

            <Linha
              label="Empresa ID"
              valor={usuario.empresa.id}
            />

            <Linha
              label="Usuário ID"
              valor={usuario.id}
            />
          </Card>
        </div>

        <div className="mt-4 rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <KeyRound size={21} />
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.17em] text-emerald-700">
                Segurança
              </div>

              <h2 className="mt-1 text-lg font-black">
                Permissões efetivas
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {usuario.permissoes.map(
              (permissao) => (
                <div
                  key={permissao}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check
                      size={15}
                      strokeWidth={3}
                    />
                  </div>

                  <span className="text-xs font-extrabold text-slate-700">
                    {permissao}
                  </span>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
            <BadgeCheck size={17} />

            {usuario.permissoes.length} permissões
            efetivas carregadas
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({
  icon,
  titulo,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          {icon}
        </div>

        <h2 className="font-black">
          {titulo}
        </h2>
      </div>

      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function Linha({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-semibold text-slate-400">
        {label}
      </span>

      <span className="max-w-[65%] break-all text-right text-xs font-black text-slate-700">
        {valor}
      </span>
    </div>
  );
}

function Booleano({
  label,
  valor,
}: {
  label: string;
  valor: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-semibold text-slate-400">
        {label}
      </span>

      <span
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black ${
          valor
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {valor ? (
          <Check size={13} />
        ) : (
          <X size={13} />
        )}

        {valor ? "SIM" : "NÃO"}
      </span>
    </div>
  );
}