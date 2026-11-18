import { ArrowRight, TriangleAlert } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { bucketDe, type Granularidade, type SerieTemporal } from '@/lib/cubo'
import { fmtBRL, fmtCompacto, fmtData, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { Alternador } from './ui'

export type ModoRecebimento = 'reportado' | 'corrigido'

export interface Duplicidade {
  data: string
  parcelas: number
  valor: number
  /** recebido do dia como reportado (com as duplicatas), no recorte filtrado */
  reportadoDia: number
}

/**
 * Previsto × recebido por bucket, com o alternador Reportado | Corrigido.
 * Reportado = valor como está na tabela (inclui o lote duplicado); Corrigido = reportado − duplicatas.
 */
export function Recebimento({
  serie,
  granularidade,
  modo,
  onModo,
  dup,
}: {
  serie: SerieTemporal
  granularidade: Granularidade
  modo: ModoRecebimento
  onModo: (m: ModoRecebimento) => void
  /** duplicidade dentro do período filtrado (null quando o período não inclui o dia do incidente) */
  dup: Duplicidade | null
}) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const previsto = serie.valores.valor_previsto ?? []
  const reportado = serie.valores.valor_recebido ?? []
  const dupSerie = serie.valores.valor_recebido_dup ?? []
  const limpo = useMemo(() => reportado.map((v, i) => v - (dupSerie[i] ?? 0)), [reportado, dupSerie])
  const iDup = dup ? serie.buckets.indexOf(bucketDe(dup.data, granularidade)) : -1
  const pctDia = dup && dup.reportadoDia > dup.valor ? dup.valor / (dup.reportadoDia - dup.valor) : null

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const titulo = (b: string) => (b.length === 7 ? fmtMes(b) : granularidade === 'semana' ? `Semana de ${fmtData(b)}` : fmtData(b))
    const rec = modo === 'reportado' ? reportado : limpo
    const marca =
      iDup >= 0 && dup
        ? {
            symbol: 'pin', symbolSize: 1, silent: true,
            data: [{ coord: [iDup, modo === 'reportado' ? reportado[iDup] : limpo[iDup]] as [number, number], value: `${fmtNumero(dup.parcelas)} parcelas duplicadas` }],
            label: {
              show: true, position: 'top' as const, distance: 10, formatter: modo === 'reportado' ? `{a|${fmtNumero(dup.parcelas)} parcelas duplicadas}\n{b|+${fmtCompacto(dup.valor, { moeda: true })} em ${fmtData(dup.data).slice(0, 5)}}` : `{a|Duplicatas removidas}\n{b|−${fmtCompacto(dup.valor, { moeda: true })} em ${fmtData(dup.data).slice(0, 5)}}`,
              backgroundColor: tema === 'escuro' ? '#3A2E0A' : '#FFF6DB', borderColor: t.status.amarelo, borderWidth: 1, borderRadius: 6, padding: [5, 8], align: 'right' as const,
              rich: { a: { color: tema === 'escuro' ? '#F6D98A' : '#7A5600', fontWeight: 700, fontSize: 11, lineHeight: 15, align: 'right' as const }, b: { color: tema === 'escuro' ? '#F6D98A' : '#7A5600', fontSize: 11, lineHeight: 15, align: 'right' as const } },
            },
          }
        : undefined
    return {
      legend: { data: ['Previsto', modo === 'reportado' ? 'Recebido (reportado)' : 'Recebido (corrigido)', ...(modo === 'reportado' && iDup >= 0 ? ['Duplicado'] : [])] },
      grid: { left: 8, right: 16, top: 64, bottom: 6, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const i = (params as { dataIndex: number }[])[0]?.dataIndex ?? 0
          const linha = (cor: string | null, nome: string, valor: string, forte = true) =>
            `<div style="display:flex;justify-content:space-between;gap:24px;line-height:1.7"><span style="opacity:.85">${cor ? `<span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${cor};margin-right:6px"></span>` : ''}${nome}</span><${forte ? 'strong' : 'span'} style="font-variant-numeric:tabular-nums">${valor}</${forte ? 'strong' : 'span'}></div>`
          const d = dupSerie[i] ?? 0
          return `<div style="min-width:230px"><div style="font-weight:600;margin-bottom:4px">${titulo(serie.buckets[i])}</div>
            ${linha(t.outros, 'Previsto', fmtCompacto(previsto[i], { moeda: true, casas: 2 }))}
            ${linha(t.series[0], modo === 'reportado' ? 'Recebido (reportado)' : 'Recebido (corrigido)', fmtCompacto(rec[i], { moeda: true, casas: 2 }))}
            ${linha(null, 'Recebido / previsto', fmtPct(previsto[i] ? rec[i] / previsto[i] : null))}
            ${d > 0 ? `<div style="border-top:1px solid rgba(128,150,170,.3);margin:5px 0"></div>${linha(t.status.amarelo, 'Duplicado no lote de 16/11', fmtBRL(d, 0))}${linha(null, modo === 'reportado' ? 'Valor corrigido' : 'Valor reportado', fmtCompacto(modo === 'reportado' ? limpo[i] : reportado[i], { moeda: true, casas: 2 }), false)}` : ''}</div>`
        },
      },
      xAxis: { type: 'category', data: serie.rotulos },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtCompacto(v, { moeda: true, casas: 0 }) } },
      series: [
        { type: 'bar', name: 'Previsto', data: previsto.map(Math.round), itemStyle: { color: t.outros, opacity: 0.45 }, barGap: '10%', barMaxWidth: 22 },
        {
          type: 'bar', name: modo === 'reportado' ? 'Recebido (reportado)' : 'Recebido (corrigido)', stack: 'rec', barMaxWidth: 22,
          data: limpo.map((v, i) => ({ value: Math.round(v), itemStyle: { color: t.series[0], borderRadius: modo === 'reportado' && (dupSerie[i] ?? 0) > 0 ? 0 : [4, 4, 0, 0] } })),
          markPoint: modo === 'corrigido' ? marca : undefined,
        },
        ...(modo === 'reportado' && iDup >= 0
          ? [{
              type: 'bar' as const, name: 'Duplicado', stack: 'rec', barMaxWidth: 22, barMinHeight: 4,
              data: dupSerie.map((v) => (v > 0 ? Math.round(v) : null)),
              itemStyle: { color: t.status.amarelo, borderRadius: [4, 4, 0, 0] as [number, number, number, number] },
              markPoint: marca,
            }]
          : []),
      ],
    }
  }, [serie, previsto, reportado, limpo, dupSerie, modo, tema, iDup, dup, granularidade])

  return (
    <ChartCard
      titulo="O recebimento acompanha o previsto?"
      subtitulo={modo === 'reportado' ? 'Previsto × recebido como reportado pela tabela de parcelas (inclui lançamentos duplicados).' : 'Previsto × recebido corrigido: sem as parcelas gravadas em duplicidade.'}
      chartRef={ref}
      nomeArquivo={`carteira-recebimento-${modo}`}
      acoes={
        <Alternador
          className="mr-1"
          rotulo="Visão do recebimento"
          valor={modo}
          onChange={onModo}
          opcoes={[{ id: 'reportado', rotulo: 'Reportado' }, { id: 'corrigido', rotulo: 'Corrigido' }]}
        />
      }
      vazio={!serie.buckets.length}
      csv={() => ({
        nome: 'carteira-recebimento',
        colunas: ['Período', 'Previsto (R$)', 'Recebido reportado (R$)', 'Duplicado (R$)', 'Recebido corrigido (R$)', 'Parcelas pagas', 'Parcelas duplicadas'],
        linhas: serie.buckets.map((b, i) => [b, Math.round(previsto[i]), Math.round(reportado[i]), Math.round(dupSerie[i] ?? 0), Math.round(limpo[i]), Math.round(serie.valores.parcelas_pagas?.[i] ?? 0), Math.round(serie.valores.parcelas_dup?.[i] ?? 0)]),
      })}
    >
      <EChart ref={ref} altura={300} option={option} descricao="Recebimento previsto e realizado por período" />
      {dup && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-status-amarelo/40 bg-status-amarelo-fundo px-3.5 py-2.5 text-[13px]">
          <TriangleAlert className="size-4 shrink-0 text-status-amarelo-texto" aria-hidden />
          <p className="min-w-0 flex-1 leading-snug">
            <strong className="font-semibold">{fmtData(dup.data)}: {fmtNumero(dup.parcelas)} parcelas duplicadas.</strong>{' '}
            O lote foi gravado duas vezes e infla o recebimento do dia em {fmtBRL(dup.valor, 0)}
            {pctDia != null && <> ({fmtPct(pctDia, 1, { sinal: true })})</>}. Reportado{' '}
            <span className="tabular font-medium">{fmtCompacto(dup.reportadoDia, { moeda: true, casas: 2 })}</span> · Corrigido{' '}
            <span className="tabular font-medium">{fmtCompacto(dup.reportadoDia - dup.valor, { moeda: true, casas: 2 })}</span>.
          </p>
          <Link to="/farol/fato_parcelas" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
            Ver <code className="rounded bg-card/70 px-1 py-0.5 text-xs">fato_parcelas</code> no Farol
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </ChartCard>
  )
}
