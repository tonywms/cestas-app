"use client";

import {
  Banknote,
  Landmark,
  Save,
  WalletCards,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { useConectividadeMobile } from "@/lib/mobile/use-conectividade";
import {
  EVENTO_VENDAS_OFFLINE, salvarRascunhoVendaOffline, concluirRascunhoVendaOffline,
  listarVendasRotaOffline, type VendaRotaOffline, type VendaRotaOfflineDados,
} from "@/lib/mobile/offline-vendas-rota";
import SincronizadorVendasRotaOffline from "@/components/mobile/SincronizadorVendasRotaOffline";

import {
  prepararVendaCampo,
} from "./actions";

type OpcaoCesta = {
  id: number;
  codigo: string;
  nome: string;
  valorVenda: number;
  saldo: number;
};

const initialState = {
  success: false,
  message: "",
};

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(valor);
}

export default function PrepararVendaForm({
  empresaId, usuarioId, clienteId, clienteNome, cargaId, modoControle,
  rotaClienteId, opcoes, primeiroVencimento, proximaEtapa,
}: {
  empresaId: string; usuarioId: string; clienteId: number; clienteNome: string;
  cargaId: number; modoControle: "QUANTIDADE" | "VOLUME";
  rotaClienteId: number;
  opcoes: OpcaoCesta[];
  primeiroVencimento: string;
  proximaEtapa: "BIPAGEM" | "CONFIRMACAO";
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    prepararVendaCampo,
    initialState,
  );

  const [
    tipoId,
    setTipoId,
  ] = useState(
    String(
      opcoes[0]?.id ??
        "",
    ),
  );

  const [
    quantidade,
    setQuantidade,
  ] = useState(1);

  const [
    tipoVenda,
    setTipoVenda,
  ] = useState<
    "AVISTA" |
    "SALDO_ABERTO" |
    "CREDIARIO"
  >("AVISTA");

  const [
    entrada,
    setEntrada,
  ] = useState("0");

  const opcao =
    useMemo(
      () =>
        opcoes.find(
          (item) =>
            String(
              item.id,
            ) ===
            tipoId,
        ) ??
        opcoes[0],
      [
        opcoes,
        tipoId,
      ],
    );

  const valorTotal =
    (
      opcao
        ?.valorVenda ??
      0
    ) *
    quantidade;

  const entradaNumero =
    useMemo(
      () => {
        const texto =
          entrada.trim();

        if (!texto) {
          return 0;
        }

        const valor =
          Number(
            texto.includes(",")
              ? texto
                  .replaceAll(
                    ".",
                    "",
                  )
                  .replace(
                    ",",
                    ".",
                  )
              : texto,
          );

        return Number.isFinite(
          valor,
        )
          ? valor
          : 0;
      },
      [
        entrada,
      ],
    );

  const saldo =
    Math.max(
      0,
      valorTotal -
        (
          tipoVenda ===
          "AVISTA"
            ? valorTotal
            : entradaNumero
        ),
    );

  const { conectado }=useConectividadeMobile();
  const [registroOffline,setRegistroOffline]=useState<VendaRotaOffline|null>(null);
  const [codigoBipado,setCodigoBipado]=useState("");
  const [codigosBipados,setCodigosBipados]=useState<string[]>([]);
  const [salvandoLocal,setSalvandoLocal]=useState(false);
  const [mensagemLocal,setMensagemLocal]=useState("");
  const [falhaLocal,setFalhaLocal]=useState(false);

  useEffect(()=>{
    let ativo=true;
    const verificar=()=>{
      void listarVendasRotaOffline(empresaId,usuarioId).then(itens=>{
        if(!ativo)return;
        const item=itens.find(x=>x.dados.rotaClienteId===rotaClienteId);
        setRegistroOffline(item??null);
        if(item&&item.status==="rascunho")setCodigosBipados(item.dados.codigosVolume);
      }).catch(()=>{
        if(ativo)setMensagemLocal("Não foi possível acessar os dados locais deste navegador.");
      });
    };
    verificar();
    window.addEventListener(EVENTO_VENDAS_OFFLINE,verificar);
    return()=>{ativo=false;window.removeEventListener(EVENTO_VENDAS_OFFLINE,verificar)};
  },[empresaId,usuarioId,rotaClienteId]);

  async function salvarOffline(evento:FormEvent<HTMLFormElement>){
    if (conectado && navigator.onLine!==false && !registroOffline) return;
    evento.preventDefault();
    if(salvandoLocal||registroOffline)return;
    const formulario=evento.currentTarget;
    const form=new FormData(formulario);
    setSalvandoLocal(true);
    setFalhaLocal(false);
    try {
      const tipo=opcoes.find(x=>x.id===Number(form.get("tipo_cesta_id")));
      const qtd=Number(form.get("quantidade"));
      const valor=Number((tipo?.valorVenda??0)*qtd);
      if(!tipo||!Number.isSafeInteger(qtd)||qtd<1||qtd>100||qtd>tipo.saldo||valor<=0){
        throw new Error("Quantidade inválida ou superior ao saldo previamente consultado.");
      }
      const forma=String(form.get("forma_pagamento")??"").trim();
      const observado=String(form.get("observacao")??"").trim();
      const parcelas=tipoVenda==="CREDIARIO"?Number(form.get("quantidade_parcelas")):null;
      const vencimento=tipoVenda==="AVISTA"?null:String(form.get("primeiro_vencimento")??"");
      if((tipoVenda!=="AVISTA"&&(!vencimento||entradaNumero>=valor))||
        (tipoVenda==="CREDIARIO"&&(!parcelas||parcelas<1||parcelas>120))||
        entradaNumero<0||observado.length>500){
        throw new Error("Revise as condições de pagamento antes de salvar offline.");
      }
      const dados:VendaRotaOfflineDados={
        rotaClienteId,clienteId,cargaId,tipoCestaId:tipo.id,
        quantidade:qtd,valorTotalEsperado:Math.round(valor*100)/100,
        tipoVenda,formaPagamento:forma,valorEntrada:tipoVenda==="AVISTA"?0:Math.round(entradaNumero*100)/100,
        quantidadeParcelas:parcelas,primeiroVencimento:vencimento,
        observacao:observado,modoControle,
        exigirBipagem:proximaEtapa==="BIPAGEM",codigosVolume:[],
      };
      const item:VendaRotaOffline={
        id:crypto.randomUUID(),empresaId,usuarioId,criadoEm:new Date().toISOString(),
        status:"rascunho",erro:null,clienteNome,dados,
      };
      await salvarRascunhoVendaOffline(item);
      setRegistroOffline(item);
      setMensagemLocal("Negociação salva neste aparelho. Conclua a conferência física abaixo; o banco ainda não foi alterado.");
    }catch(e){
      setFalhaLocal(true);
      setMensagemLocal(e instanceof Error?e.message:"Não foi possível armazenar a venda. Dados não enviados.");
    }finally{setSalvandoLocal(false)}
  }

  async function adicionarVolume(){
    if(!registroOffline||registroOffline.status!=="rascunho")return;
    const codigo=codigoBipado.trim().toUpperCase();
    if(!codigo||codigo.length>120||codigosBipados.includes(codigo)||
       codigosBipados.length>=registroOffline.dados.quantidade){
      setFalhaLocal(true);setMensagemLocal("Código vazio, duplicado ou acima do limite.");
      return;
    }
    const proximos=[...codigosBipados,codigo];
    try{
      const {atualizarCodigosRascunhoVendaOffline}=await import("@/lib/mobile/offline-vendas-rota");
      await atualizarCodigosRascunhoVendaOffline(registroOffline.id,proximos);
      setCodigosBipados(proximos);
      setCodigoBipado("");
      setFalhaLocal(false);
      setMensagemLocal("Volume gravado no aparelho, aguardando conclusão da operação.");
    }catch{
      setFalhaLocal(true);
      setMensagemLocal("Não foi possível salvar este volume no aparelho.");
    }
  }

  async function concluirOffline(){
    if(!registroOffline||registroOffline.status!=="rascunho")return;
    setSalvandoLocal(true);
    try{
      await concluirRascunhoVendaOffline(registroOffline.id,
        registroOffline.dados.exigirBipagem?codigosBipados:[]);
      setRegistroOffline({...registroOffline,status:"pendente",dados:{
        ...registroOffline.dados,codigosVolume:registroOffline.dados.exigirBipagem?codigosBipados:[],
      }});
      setFalhaLocal(false);
      setMensagemLocal("Operação offline concluída no aparelho. Venda, pagamento e estoque ainda não foram lançados no banco. O envio ocorrerá automaticamente quando a conexão voltar.");
    }catch{
      setFalhaLocal(true);
      setMensagemLocal("Não foi possível concluir o registro local. Confira os volumes.");
    }finally{setSalvandoLocal(false)}
  }


  if(registroOffline){
    const rascunho=registroOffline.status==="rascunho";
    const precisaBipar=registroOffline.dados.exigirBipagem;
    const disponivel= !precisaBipar || codigosBipados.length===registroOffline.dados.quantidade;
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <p className="text-xs font-black">Operação registrada no aparelho</p>
          <p className="mt-2 text-[11px]">Cliente: {registroOffline.clienteNome}</p>
          <p className="mt-1 text-[11px]">Quantidade: {registroOffline.dados.quantidade} cesta(s) · {moeda(registroOffline.dados.valorTotalEsperado)}</p>
          <p className="mt-2 text-[11px] font-bold">
            {rascunho?"Aguardando conferência física offline":registroOffline.status==="pendente"?"Aguardando sincronização com Supabase":"Revisão obrigatória"}
          </p>
          {registroOffline.erro&&<p className="mt-2 text-xs text-red-700">{registroOffline.erro}</p>}
        </div>
        {rascunho&&(
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-black">{precisaBipar?"Bipagem de volumes offline":"Confirmação da entrega offline"}</h3>
            <p className="mt-2 text-[11px] leading-5 text-slate-600">
              A confirmação local não baixa estoque nem registra recebimentos no banco.
              Essa validação ocorrerá quando voltar o Wi-Fi ou o 5G.
            </p>
            {precisaBipar&&<>
              <p className="mt-3 text-xs font-bold">{codigosBipados.length} de {registroOffline.dados.quantidade} volumes</p>
              <div className="mt-3 flex gap-2">
                <input value={codigoBipado} onChange={e=>setCodigoBipado(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();void adicionarVolume()}}}
                  placeholder="Bipe ou informe o código" autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-xs"/>
                <button type="button" onClick={()=>void adicionarVolume()}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Adicionar</button>
              </div>
              {codigosBipados.map(c=><p key={c} className="mt-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs">{c}</p>)}
            </>}
            <button type="button" disabled={!disponivel||salvandoLocal} onClick={()=>void concluirOffline()}
              className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-4 text-xs font-black text-white disabled:opacity-40">
              {salvandoLocal?"Gravando...":"Concluir e guardar operação offline"}
            </button>
          </div>
        )}
        {mensagemLocal&&<div role="status" className={`rounded-xl border p-4 text-[11px] font-semibold ${falhaLocal?"border-red-200 bg-red-50 text-red-900":"border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{mensagemLocal}</div>}
        <SincronizadorVendasRotaOffline empresaId={empresaId} usuarioId={usuarioId}/>
      </section>
    );
  }
  return (
    <>
    <SincronizadorVendasRotaOffline empresaId={empresaId} usuarioId={usuarioId}/>
    <form
      action={formAction}
      onSubmit={salvarOffline}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="rota_cliente_id"
        value={rotaClienteId}
      />

      <input
        type="hidden"
        name="tipo_venda"
        value={tipoVenda}
      />

      <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
        <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
          Tipo de cesta
        </label>

        <select
          name="tipo_cesta_id"
          value={tipoId}
          onChange={(
            event,
          ) => {
            setTipoId(
              event.target
                .value,
            );
            setQuantidade(
              1,
            );
          }}
          required
          className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black outline-none focus:border-emerald-400"
        >
          {opcoes.map(
            (item) => (
              <option
                key={
                  item.id
                }
                value={
                  item.id
                }
              >
                {item.nome} • {moeda(item.valorVenda)} • saldo {item.saldo}
              </option>
            ),
          )}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Quantidade
            </label>
            <input
              type="number"
              name="quantidade"
              min={1}
              max={
                opcao?.saldo ??
                1
              }
              value={
                quantidade
              }
              onChange={(
                event,
              ) =>
                setQuantidade(
                  Math.max(
                    1,
                    Math.min(
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                        1,
                      opcao
                        ?.saldo ??
                        1,
                    ),
                  ),
                )
              }
              required
              className="mt-2 h-[52px] w-full rounded-[15px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-emerald-400"
            />
          </div>

          <div className="rounded-[16px] bg-emerald-50 p-3.5">
            <p className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-700">
              Valor da venda
            </p>
            <p className="mt-2 text-[17px] font-black text-emerald-800">
              {moeda(
                valorTotal,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
          Como será a venda?
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              setTipoVenda(
                "AVISTA",
              )
            }
            className={`rounded-[18px] border p-3 text-left transition ${
              tipoVenda ===
              "AVISTA"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Banknote
              size={18}
            />
            <p className="mt-3 text-[10px] font-black">
              À vista
            </p>
            <p className="mt-1 text-[7px] leading-4 opacity-70">
              Recebe tudo.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setTipoVenda(
                "SALDO_ABERTO",
              )
            }
            className={`rounded-[18px] border p-3 text-left transition ${
              tipoVenda ===
              "SALDO_ABERTO"
                ? "border-sky-400 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <WalletCards
              size={18}
            />
            <p className="mt-3 text-[9px] font-black">
              Saldo aberto
            </p>
            <p className="mt-1 text-[7px] leading-4 opacity-70">
              Pagamentos livres.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setTipoVenda(
                "CREDIARIO",
              )
            }
            className={`rounded-[18px] border p-3 text-left transition ${
              tipoVenda ===
              "CREDIARIO"
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Landmark
              size={18}
            />
            <p className="mt-3 text-[9px] font-black">
              Parcelado
            </p>
            <p className="mt-1 text-[7px] leading-4 opacity-70">
              Parcelas fixas.
            </p>
          </button>
        </div>
      </section>

      {tipoVenda ===
      "AVISTA" ? (
        <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            Forma de pagamento
          </label>
          <select
            name="forma_pagamento"
            defaultValue="PIX"
            required
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black outline-none focus:border-emerald-400"
          >
            <option value="PIX">
              PIX
            </option>
            <option value="DINHEIRO">
              Dinheiro
            </option>
            <option value="CARTAO">
              Cartão
            </option>
            <option value="TRANSFERENCIA">
              Transferência
            </option>
            <option value="OUTRO">
              Outro
            </option>
          </select>

          <div className="mt-4 rounded-[18px] bg-emerald-50 p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.13em] text-emerald-700">
              Recebimento combinado
            </p>
            <p className="mt-1 text-[22px] font-black text-emerald-800">
              {moeda(
                valorTotal,
              )}
            </p>
          </div>
        </section>
      ) : (
        <section
          className={`rounded-[26px] border bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)] ${
            tipoVenda ===
            "SALDO_ABERTO"
              ? "border-sky-100"
              : "border-amber-100"
          }`}
        >
          <h3 className="text-[14px] font-black">
            {tipoVenda ===
            "SALDO_ABERTO"
              ? "Condições do saldo em aberto"
              : "Condições do parcelado"}
          </h3>

          <label className="mt-5 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            Recebido agora
          </label>
          <input
            name="valor_entrada"
            inputMode="decimal"
            value={entrada}
            onChange={(
              event,
            ) =>
              setEntrada(
                event.target
                  .value,
              )
            }
            placeholder="0,00"
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-sky-400"
          />

          <label className="mt-4 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            Forma do valor recebido
          </label>
          <select
            name="forma_pagamento"
            defaultValue="PIX"
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black outline-none focus:border-sky-400"
          >
            <option value="PIX">
              PIX
            </option>
            <option value="DINHEIRO">
              Dinheiro
            </option>
            <option value="CARTAO">
              Cartão
            </option>
            <option value="TRANSFERENCIA">
              Transferência
            </option>
            <option value="OUTRO">
              Outro
            </option>
          </select>

          {tipoVenda ===
            "CREDIARIO" && (
            <div className="mt-4">
              <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Parcelas
              </label>
              <input
                type="number"
                name="quantidade_parcelas"
                min={1}
                max={120}
                defaultValue={4}
                required
                className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-amber-400"
              />
            </div>
          )}

          <label className="mt-4 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            {tipoVenda ===
            "SALDO_ABERTO"
              ? "Próxima visita sugerida"
              : "1º vencimento"}
          </label>
          <input
            type="date"
            name="primeiro_vencimento"
            defaultValue={
              primeiroVencimento
            }
            required
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[10px] font-black outline-none focus:border-sky-400"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Resumo
              label="Recebido agora"
              valor={moeda(
                entradaNumero,
              )}
            />
            <Resumo
              label="Saldo depois"
              valor={moeda(
                saldo,
              )}
              destaque
            />
          </div>
        </section>
      )}

      <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
        <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
          Observação
        </label>
        <input
          name="observacao"
          placeholder="Opcional"
          className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[11px] font-semibold outline-none focus:border-emerald-400"
        />
      </section>

      {state.message && (
        <div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-[10px] font-bold leading-5 text-red-700">
          {state.message}
        </div>
      )}
      {mensagemLocal&&<div role="status" className={`rounded-xl border p-4 text-[11px] font-semibold ${falhaLocal?"border-red-200 bg-red-50 text-red-900":"border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{mensagemLocal}</div>}

      <button
        type="submit"
        disabled={
          pending ||
          salvandoLocal ||
          !opcao ||
          valorTotal <= 0
        }
        className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40"
      >
        <Save
          size={18}
        />
        {salvandoLocal
          ? "Gravando no aparelho..."
          : pending ? "Salvando operação..."
          : proximaEtapa ===
              "BIPAGEM"
            ? "Salvar e ir para bipagem"
            : "Salvar e confirmar entrega"}
      </button>
    </form>
    </>
  );
}

function Resumo({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] p-3 ${
        destaque
          ? "bg-sky-50"
          : "bg-[#f6f9f6]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-[15px] font-black ${
          destaque
            ? "text-sky-800"
            : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
