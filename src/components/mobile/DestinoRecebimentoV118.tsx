"use client";

import { AlertTriangle, Building2, ShieldCheck, Wallet } from "lucide-react";

export type DestinoV118 = "EMPRESA" | "ENTREGADOR" | null;

type Props = {
  forma: string;
  destinoPix: DestinoV118;
  destinoCartao: DestinoV118;
  semPagamento?: boolean;
};

export function titularPrevistoV118(
  forma: string, destinoPix: DestinoV118, destinoCartao: DestinoV118
): DestinoV118 {
  if (forma==="DINHEIRO") return "ENTREGADOR";
  if (forma==="PIX") return destinoPix;
  if (forma==="CARTAO") return destinoCartao;
  return null;
}

export default function DestinoRecebimentoV118({
  forma, destinoPix, destinoCartao, semPagamento=false,
}: Props) {
  if (semPagamento) return <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600">
    Nenhum pagamento será recebido nesta etapa. Quando o cliente pagar, o sistema identificará quem recebeu e incluirá o valor no acerto correto.
  </div>;

  const destino=titularPrevistoV118(forma,destinoPix,destinoCartao);
  const empresa=destino==="EMPRESA";
  const entregador=destino==="ENTREGADOR";
  const indefinido=!empresa&&!entregador;
  const titulo=forma==="DINHEIRO"?"Dinheiro fica com o entregador":
    forma==="PIX"?(empresa?"PIX na conta da empresa":entregador?"PIX na conta do entregador":"Destinatário PIX indisponível"):
    forma==="CARTAO"?(empresa?"Cartão na maquineta da empresa":entregador?"Cartão na maquineta do entregador":"Destinatário do cartão indisponível"):
    "Pagamento sem destinatário automático";
  const descricao=forma==="DINHEIRO"?
    "Receba o dinheiro físico. Ele ficará sob sua responsabilidade até a entrega e confirmação pelo CD.":
    forma==="PIX"?(empresa?
      "Oriente o cliente a pagar no PIX do dono/empresa. O CD fará a conferência; não existe novo repasse a cobrar do entregador.":
      entregador?
      "Oriente o cliente a pagar na sua conta PIX. Esse valor ficará sob sua responsabilidade e deverá ser repassado e confirmado pelo CD.":
      "Não é seguro confirmar o PIX sem configuração válida. Solicite ao CD a conferência do destinatário.") :
    forma==="CARTAO"?(empresa?
      "Use a maquineta da empresa. O CD concilia o recebimento, sem cobrar o valor novamente do entregador.":
      entregador?
      "Use sua maquineta própria. O valor será tratado como repasse do entregador ao CD, conforme a liquidação.":
      "Não é seguro confirmar o cartão sem configuração válida. Solicite ao CD a conferência do destinatário.") :
    "Transferência ou outro meio não identifica automaticamente o titular. O CD deve classificar o recebimento antes do acerto.";

  const Icone=indefinido?AlertTriangle:empresa?Building2:forma==="DINHEIRO"?Wallet:ShieldCheck;
  return <div role="status" aria-live="polite"
    className={`mt-4 rounded-[18px] border p-4 ${indefinido?
      "border-amber-300 bg-amber-50 text-amber-950":
      empresa?"border-sky-200 bg-sky-50 text-sky-950":"border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80">
        <Icone size={19}/>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">
          Destinatário do pagamento · V118
        </p>
        <p className="mt-1 text-[12px] font-black">{titulo}</p>
        <p className="mt-2 text-[10px] leading-5">{descricao}</p>
      </div>
    </div>
  </div>;
}
