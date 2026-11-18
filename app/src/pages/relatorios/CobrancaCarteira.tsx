import { Banknote, CircleDollarSign, Handshake, Layers, Percent, ShieldAlert, TrendingDown, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KpiCard } from '@/components/dados'
import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { compararPeriodos, filtrar, periodoAnterior, razao, serieTemporal, totais, type FiltrosCubo } from '@/lib/cubo'
import { useMeta, useRelatorio } from '@/lib/dados'
import { useFiltrosResolvidos } from '@/lib/filtros'
import { fmtCompacto, fmtData, fmtNumero, fmtPct, variacao } from '@/lib/formato'
import { ComposicaoFaixas } from './carteira/ComposicaoFaixas'
import { fmtPP, posicaoCarteira, serieEstoque, ultimaFotografia } from './carteira/dados'
import { Recebimento, type Duplicidade, type ModoRecebimento } from './carteira/Recebimento'
import { Recuperacao } from './carteira/Recuperacao'
import { RollRate } from './carteira/RollRate'
import { TendenciaCarteira } from './carteira/TendenciaCarteira'
import { Secao } from './carteira/ui'

const ID = 'cobranca-carteira'

/**
 * Cobrança: Carteira e Inadimplência.
 * KPIs (última fotografia) → tendência com drill-down → composição por faixa → roll rate → recebimento
 * (Reportado × Corrigido) → recuperação e efetividade por canal.
 */
export default function CobrancaCarteira() {
  const { dados, carregando } = useRelatorio(ID)
  const { dados: meta } = useMeta()
  const f = useFiltrosResolvidos({ dimCanal: 'canal_cobranca' })
  const [modo, setModo] = useState<ModoRecebimento>('reportado')

  const cubos = dados?.cubos
  /** segmento, regional e UF (sem período e sem canal: o canal de cobrança é filtro local da seção de recuperação) */
  const base = useMemo<FiltrosCubo>(() => ({ segmentos: f.segmentos, regionais: f.regionais, ufs: f.ufs }), [f.segmentos, f.regionais, f.ufs])
  const comPeriodo = useMemo<FiltrosCubo>(() => ({ ...base, inicio: f.periodo.inicio, fim: f.periodo.fim }), [base, f.periodo.inicio, f.periodo.fim])

  // ---- carteira (estoque): última fotografia até o fim do período; nunca soma datas ----
  const carteira = useMemo(() => {
    const cubo = cubos?.carteira
    if (!cubo) return null
    const linhasFoto = filtrar(cubo, { ...base, fim: f.periodo.fim }, f.meta)
    const atual = posicaoCarteira(cubo, linhasFoto)
    const dataFoto = ultimaFotografia(cubo, linhasFoto)
    const ant = periodoAnterior(f.periodo.inicio, f.periodo.fim)
    const linhasAnt = filtrar(cubo, { ...base, fim: ant.fim }, f.meta)
    const anterior = linhasAnt.idx.length ? posicaoCarteira(cubo, linhasAnt) : null
    const serie = serieEstoque(cubo, filtrar(cubo, comPeriodo, f.meta), f.granularidade)
    return { cubo, linhasFoto, atual, anterior, dataFoto, dataAnterior: anterior ? ultimaFotografia(cubo, linhasAnt) : null, serie }
  }, [cubos, base, comPeriodo, f.periodo.inicio, f.periodo.fim, f.meta, f.granularidade])

  // ---- recebimento (fluxo) ----
  const receb = useMemo(() => {
    const cubo = cubos?.recebimento
    if (!cubo) return null
    const linhas = filtrar(cubo, comPeriodo, f.meta)
    const comp = compararPeriodos(cubo, comPeriodo, f.meta)
    const serie = serieTemporal(cubo, linhas, f.granularidade, undefined, f.periodo)
    // duplicidade dentro do período: dia com parcelas duplicadas
    const porDia = serieTemporal(cubo, linhas, 'dia', ['valor_recebido', 'valor_recebido_dup', 'parcelas_dup'])
    let dup: Duplicidade | null = null
    porDia.buckets.forEach((b, i) => {
      if (porDia.valores.parcelas_dup[i] > 0 && (!dup || porDia.valores.valor_recebido_dup[i] > dup.valor)) {
        dup = { data: b, parcelas: Math.round(porDia.valores.parcelas_dup[i]), valor: porDia.valores.valor_recebido_dup[i], reportadoDia: porDia.valores.valor_recebido[i] }
      }
    })
    return { cubo, comp, serie, dup: dup as Duplicidade | null }
  }, [cubos, comPeriodo, f.meta, f.granularidade, f.periodo])

  // ---- recuperação (fluxo, todos os canais no KPI) ----
  const recup = useMemo(() => {
    const cubo = cubos?.recuperacao
    if (!cubo) return null
    const linhas = filtrar(cubo, comPeriodo, f.meta)
    return { cubo, tot: totais(cubo, linhas), comp: compararPeriodos(cubo, comPeriodo, f.meta, ['valor_recuperado']), serie: serieTemporal(cubo, linhas, f.granularidade, ['valor_recuperado'], f.periodo) }
  }, [cubos, comPeriodo, f.meta, f.granularidade, f.periodo])

  const a = carteira?.atual
  const b = carteira?.anterior
  const pos = carteira?.serie.posicoes ?? []
  const compFoto = carteira?.dataAnterior ? `vs ${fmtData(carteira.dataAnterior)}` : undefined
  const corrigir = (t: Record<string, number>) => (modo === 'corrigido' ? t.valor_recebido - t.valor_recebido_dup : t.valor_recebido)
  const recAtual = receb ? corrigir(receb.comp.atual) : null
  const recAnterior = receb?.comp.periodoAnterior && receb.comp.anterior.valor_recebido ? corrigir(receb.comp.anterior) : null
  const pctPrev = receb ? razao(recAtual, receb.comp.atual.valor_previsto) : null
  const pctPrevAnt = receb && recAnterior != null ? razao(recAnterior, receb.comp.anterior.valor_previsto) : null
  const recSerie = receb ? receb.serie.valores.valor_recebido.map((v, i) => (modo === 'corrigido' ? v - receb.serie.valores.valor_recebido_dup[i] : v)) : []
  const etiquetaModo = modo === 'corrigido' ? 'corrigido' : 'reportado'

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Carteira ativa, inadimplência por faixa de atraso, rolagem, recebimento e recuperação."
      filtros={{ filtros: ['periodo', 'granularidade', 'segmento', 'regional', 'uf'] }}
      carregando={carregando}
      vazio={!dados || !carteira || !receb || !recup}
    >
      {a && carteira && receb && recup && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              rotulo="Carteira ativa" icone={Wallet} valor={<span className="whitespace-nowrap">{fmtCompacto(a.saldo, { moeda: true })}</span>} variacao={variacao(a.saldo, b?.saldo)} maiorE="melhor" comparacao={compFoto}
              sparkline={pos.map((p) => p.saldo)} detalhe={`Posição de ${fmtData(carteira.dataFoto)}`}
              definicao="Saldo devedor das cotas ativas na última fotografia até o fim do período. É estoque: nunca se soma entre datas."
            />
            <KpiCard
              rotulo="Cotas ativas" icone={Layers} valor={<span className="whitespace-nowrap">{fmtNumero(a.cotas)}</span>} variacao={variacao(a.cotas, b?.cotas)} maiorE="melhor" comparacao={compFoto}
              sparkline={pos.map((p) => p.cotas)} detalhe={`${fmtNumero(a.cotas - (a.porFaixa['Em dia']?.cotas ?? 0))} com alguma parcela em atraso`}
              definicao="Quantidade de cotas ativas na última fotografia até o fim do período."
            />
            <KpiCard
              rotulo="Inadimplência over 30" icone={ShieldAlert} valor={<span className="whitespace-nowrap">{fmtPct(a.over30, 2)}</span>} variacao={b?.over30 != null && a.over30 != null ? a.over30 - b.over30 : null}
              variacaoTexto={fmtPP(a.over30, b?.over30)} maiorE="pior" comparacao={compFoto} sparkline={pos.map((p) => p.over30)}
              detalhe={`${fmtCompacto(a.saldoOver30, { moeda: true })} em atraso acima de 30 dias`}
              definicao="Saldo devedor das cotas nas faixas 31–60, 61–90 e 90+ dividido pelo saldo devedor total da carteira ativa."
            />
            <KpiCard
              rotulo="Over 90" icone={TrendingDown} valor={<span className="whitespace-nowrap">{fmtPct(a.over90, 2)}</span>} variacao={b?.over90 != null && a.over90 != null ? a.over90 - b.over90 : null}
              variacaoTexto={fmtPP(a.over90, b?.over90)} maiorE="pior" comparacao={compFoto} sparkline={pos.map((p) => p.over90)}
              detalhe={`${fmtNumero(a.porFaixa['90+']?.cotas ?? 0)} cotas com mais de 90 dias`}
              definicao="Saldo devedor das cotas com mais de 90 dias de atraso dividido pelo saldo devedor total da carteira ativa."
            />
            <KpiCard
              rotulo="Valor em atraso" icone={CircleDollarSign} valor={<span className="whitespace-nowrap">{fmtCompacto(a.atraso, { moeda: true })}</span>} variacao={variacao(a.atraso, b?.atraso)} maiorE="pior" comparacao={compFoto}
              sparkline={pos.map((p) => p.atraso)} detalhe={`${fmtPct(razao(a.atraso, a.saldo), 2)} do saldo devedor`}
              definicao="Soma das parcelas vencidas e não pagas das cotas ativas (diferente do saldo devedor das cotas em atraso)."
            />
            <KpiCard
              rotulo={`Recebimento do período (${etiquetaModo})`} icone={Banknote} valor={<span className="whitespace-nowrap">{fmtCompacto(recAtual, { moeda: true })}</span>} variacao={variacao(recAtual, recAnterior)} maiorE="melhor"
              sparkline={recSerie}
              detalhe={receb.dup ? (modo === 'corrigido' ? `Sem ${fmtCompacto(receb.dup.valor, { moeda: true })} de parcelas duplicadas` : `Inclui ${fmtCompacto(receb.dup.valor, { moeda: true })} de parcelas duplicadas`) : `${fmtNumero(receb.comp.atual.parcelas_pagas)} parcelas pagas`}
              definicao="Valor das parcelas pagas no período. Reportado: como está na tabela de parcelas. Corrigido: sem os lançamentos duplicados. Alterne a visão no card de recebimento."
            />
            <KpiCard
              rotulo="Recebido sobre o previsto" icone={Percent} valor={<span className="whitespace-nowrap">{fmtPct(pctPrev)}</span>} variacao={pctPrev != null && pctPrevAnt != null ? pctPrev - pctPrevAnt : null}
              variacaoTexto={fmtPP(pctPrev, pctPrevAnt, 1)} maiorE="melhor"
              sparkline={receb.serie.valores.valor_previsto.map((p, i) => (p ? recSerie[i] / p : null))}
              detalhe={`Previsto: ${fmtCompacto(receb.comp.atual.valor_previsto, { moeda: true })}`}
              definicao="Valor recebido dividido pelo valor previsto (parcelas com vencimento no período)."
            />
            <KpiCard
              rotulo="Recuperação" icone={Handshake} valor={<span className="whitespace-nowrap">{fmtCompacto(recup.tot.valor_recuperado, { moeda: true })}</span>} variacao={recup.comp.variacao.valor_recuperado} maiorE="melhor"
              sparkline={recup.serie.valores.valor_recuperado}
              detalhe={`${fmtNumero(recup.tot.acordos_cumpridos)} acordos cumpridos de ${fmtNumero(recup.tot.acordos_firmados)} firmados`}
              definicao="Valor efetivamente recuperado em acordos de cobrança no período, em todos os canais."
            />
          </div>

          <TendenciaCarteira cubo={carteira.cubo} filtrosBase={base} meta={f.meta} periodo={f.periodo} granularidade={f.granularidade} />

          <Secao titulo="Composição do atraso" descricao={`Fotografia de ${fmtData(carteira.dataFoto)}: onde o atraso está, por faixa, segmento e regional.`}>
            <ComposicaoFaixas cubo={carteira.cubo} linhasFoto={carteira.linhasFoto} posicao={a} dataFoto={fmtData(carteira.dataFoto)} meta={meta} />
            {cubos?.roll_rate && <RollRate cubo={cubos.roll_rate} filtrosBase={base} meta={f.meta} periodo={f.periodo} />}
          </Secao>

          <Secao titulo="Recebimento" descricao="Previsto × recebido. O alternador mostra o número como reportado pela tabela e o número corrigido, sem duplicidades.">
            <Recebimento serie={receb.serie} granularidade={f.granularidade} modo={modo} onModo={setModo} dup={receb.dup} />
          </Secao>

          <Recuperacao cubo={recup.cubo} filtros={comPeriodo} meta={f.meta} granularidade={f.granularidade} periodo={f.periodo} />
        </>
      )}
    </LayoutRelatorio>
  )
}
