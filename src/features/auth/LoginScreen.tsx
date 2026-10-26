"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LoginScreenProps = {
  onBack: () => void;
};

export default function LoginScreen({ onBack }: LoginScreenProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");

    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }

    if (!senha) {
      setErro("Informe sua senha.");
      return;
    }

    try {
      setLoading(true);

      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

      if (error) {
        console.error("Erro Supabase Auth:", error);

        if (error.message.toLowerCase().includes("invalid login credentials")) {
          setErro("E-mail ou senha inválidos.");
          return;
        }

        if (error.message.toLowerCase().includes("email not confirmed")) {
          setErro("Seu e-mail ainda não foi confirmado.");
          return;
        }

        setErro("Não foi possível realizar o login. Tente novamente.");
        return;
      }

      if (!data.user) {
        setErro("Não foi possível identificar o usuário.");
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select(`
          id,
          nome,
          email,
          ativo,
          perfil_id,
          perfis (
            codigo,
            nome
          )
        `)
        .eq("id", data.user.id)
        .single();

      if (usuarioError) {
        console.error("Erro ao carregar usuário:", usuarioError);

        await supabase.auth.signOut();

        setErro(
          "Seu acesso foi autenticado, mas o perfil do usuário não foi encontrado."
        );
        return;
      }

      if (!usuario?.ativo) {
        await supabase.auth.signOut();

        setErro(
          "Este usuário está inativo. Entre em contato com o administrador."
        );
        return;
      }

      await supabase
        .from("usuarios")
        .update({
          ultimo_acesso: new Date().toISOString(),
        })
        .eq("id", data.user.id);

      router.push("/app");
      router.refresh();
    } catch (error) {
      console.error("Erro inesperado no login:", error);

      setErro(
        "Ocorreu um erro inesperado ao acessar o Cestas APP."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-transparent text-[#172117]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#f8fbf8] md:my-5 md:min-h-[calc(100dvh-40px)] md:rounded-[38px] md:border md:border-black/[0.05] md:shadow-[0_35px_95px_rgba(17,63,33,0.16)]">

        <div className="relative overflow-hidden bg-[linear-gradient(160deg,#edf8f0_0%,#dcefe1_55%,#cbe7d2_100%)] px-6 pb-9 pt-6">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#176b3a]/5" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/50 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/80 bg-white/80 text-[#176b3a] shadow-[0_10px_25px_rgba(17,63,33,0.08)] backdrop-blur transition hover:-translate-y-0.5"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-2 shadow-sm backdrop-blur">
              <ShieldCheck size={14} className="text-[#176b3a]" />

              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#176b3a]">
                Ambiente seguro
              </span>
            </div>
          </div>

          <div className="relative mt-6 flex flex-col items-center text-center">
            <div className="relative h-[145px] w-[260px]">
              <Image
                src="/branding/cestas-app-logo.svg"
                alt="Cestas APP"
                fill
                priority
                sizes="260px"
                className="object-contain drop-shadow-[0_18px_26px_rgba(17,63,33,0.12)]"
              />
            </div>

            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-[#23834b]">
              Gestão inteligente
            </p>

            <h1 className="mt-2 text-[36px] font-black leading-none tracking-[-0.05em] text-[#112015]">
              Bem-vindo<span className="text-[#f2ae3e]">.</span>
            </h1>

            <p className="mt-3 max-w-[320px] text-sm font-medium leading-6 text-[#667566]">
              Entre com suas credenciais para acessar sua operação no Cestas APP.
            </p>
          </div>
        </div>

        <div className="-mt-4 flex flex-1 flex-col rounded-t-[30px] bg-white px-6 pb-7 pt-8 shadow-[0_-10px_30px_rgba(17,63,33,0.04)]">

          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-[#dce4dc]" />

          <div className="mb-6">
            <h2 className="text-lg font-black tracking-[-0.03em] text-[#172117]">
              Acessar minha conta
            </h2>

            <p className="mt-1 text-xs font-medium text-[#8a938a]">
              Informe seu e-mail e senha para continuar.
            </p>
          </div>

          {erro && (
            <div className="mb-5 flex items-start gap-3 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3">
              <TriangleAlert
                size={18}
                className="mt-0.5 shrink-0 text-red-500"
              />

              <p className="text-xs font-semibold leading-5 text-red-700">
                {erro}
              </p>
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={handleLogin}
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-extrabold text-[#445044]"
              >
                E-mail
              </label>

              <div className="flex h-[58px] items-center rounded-[18px] border border-[#dde3dc] bg-[#fbfcfb] px-4 shadow-[0_8px_18px_rgba(17,63,33,0.03)] transition focus-within:border-[#176b3a] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#176b3a]/5">
                <UserRound size={19} className="mr-3 text-[#8a9589]" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Digite seu e-mail"
                  disabled={loading}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#172117] outline-none placeholder:font-medium placeholder:text-[#a8b0a7] disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="senha"
                  className="text-xs font-extrabold text-[#445044]"
                >
                  Senha
                </label>

                <button
                  type="button"
                  disabled={loading}
                  className="text-xs font-extrabold text-[#176b3a] transition hover:text-[#0d542c] disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="flex h-[58px] items-center rounded-[18px] border border-[#dde3dc] bg-[#fbfcfb] px-4 shadow-[0_8px_18px_rgba(17,63,33,0.03)] transition focus-within:border-[#176b3a] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#176b3a]/5">
                <LockKeyhole size={19} className="mr-3 text-[#8a9589]" />

                <input
                  id="senha"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder="Digite sua senha"
                  disabled={loading}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#172117] outline-none placeholder:font-medium placeholder:text-[#a8b0a7] disabled:cursor-not-allowed"
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  className="ml-3 flex h-9 w-9 items-center justify-center rounded-full text-[#8a9589] transition hover:bg-[#176b3a]/5 hover:text-[#176b3a]"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#187b43_0%,#0f5e30_100%)] text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(23,107,58,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(23,107,58,0.28)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />

                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-auto pt-8">
            <div className="flex items-center justify-center gap-2 text-[#98a398]">
              <ShieldCheck size={13} />

              <p className="text-[10px] font-semibold">
                Cestas APP • Plataforma segura
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

