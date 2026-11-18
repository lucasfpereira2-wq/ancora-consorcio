import { ArrowRight, TriangleAlert } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { agrupar, filtrar, serieTemporal, totais } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtData, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { corDaSerie } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { Alternador, BarrasH, Secao, type ItemBarra } from './Comuns'
import { DIM_CANAL, MEDIDAS_NPS, mesesDoPeriodo, opcao, partesNps, semCanal, TABELA_NPS, tooltipHTML, useAlternarCanal, useTokens, type LinhaTooltip, type ModoNps } from './util'

const NOME_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ROTULO_MODO: Record<ModoNps, string> = { reportado: 'Reportado', corrigido: 'Corrigido' }
const nps0 = (v: number | null) => (v == null ? '–' : fmtNumero(v, 0))
const nps1 = (v: number | null) => (v == null ? '–' : fmtNumero(v, 1))

/** Último dia do mês "YYYY-MM". */
function fimDoMes(mes: string): string {
  const d = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate()
  return `${mes}-${String(d).padStart(2, '0')}`
}

/**
 * NPS: destaque do desvio reportado × corrigido, número do período com composição, evolução mensal
 * com as duas linhas e quebras por canal e segmento. O alternador vale para o KPI do topo também.
 */
export function BlocoNps({
  cubo,
  f,
  modo,
  aoMudarModo,
  inicioDuplicidade,
}: {
  cubo: Cubo
  f: FiltrosResolvidos
  modo: ModoNps
  aoMudarModo: (m: ModoNps) => void
  /** primeira data com respostas duplicadas (extras.cenario.nps_dup_inicio) */
  inicioDuplicidade: string | null
}) {
  const refComp = useRef<EChartHandle>(null)
  const refEvo = useRef<EChartHandle>(null)
  const refCanal = useRef<EChartHandle>(null)
  const refSeg = useRef<EChartHandle>(null)
  const { tema, t } = useTokens()
  const alternarCanal = useAlternarCanal()
  const ordemCanais = useMemo(() => cubo.dims.find((d) => d.nome === DIM_CANAL)?.valores ?? [], [cubo])
  const meses = mesesDoPeriodo(f)

  // cores da composição: tons da paleta do tema (nada de verde/amarelo/vermelho, reservados a status)
  const cores = useMemo(() => ({ promotores: t.series[0], neutros: t.outros, detratores: t.series[2] }), [t])

  // período filtrado
  const linhas = useMemo(() => filtrar(cubo, f.filtrosCubo, f.meta), [cubo, f.filtrosCubo, f.meta])
  const tot = useMemo(() => totais(cubo, linhas, MEDIDAS_NPS), [cubo, linhas])
  const reportado = partesNps(tot, 'reportado')
  const corrigido = partesNps(tot, 'corrigido')
  const atual = modo === 'reportado' ? reportado : corrigido
  const duplicadas = reportado.respostas - corrigido.respostas

  // número levado ao comitê: mês em que a duplicidade começou, sem nenhum filtro
  const comite = useMemo(() => {
    if (!inicioDuplicidade) return null
    const mes = inicioDuplicidade.slice(0, 7)
    const v = totais(cubo, filtrar(cubo, { inicio: `${mes}-01`, fim: fimDoMes(mes) }), MEDIDAS_NPS)
    const rep = partesNps(v, 'reportado').nps
    const cor = partesNps(v, 'corrigido').nps
    if (rep == null || cor == null) return null
    return { mes, nomeMes: NOME_MES[Number(mes.slice(5, 7)) - 1], reportado: Math.round(rep), corrigido: Math.round(cor) }
  }, [cubo, inicioDuplicidade])
  const mostrarDestaque = !!comite && !!inicioDuplicidade && f.periodo.fim >= inicioDuplicidade

  // evolução mensal: meses inteiros que intersectam o período
  const evolucao = useMemo(() => {
    const periodo = { inicio: meses.inicio, fim: meses.fim }
    const s = serieTemporal(cubo, filtrar(cubo, { ...f.filtrosCubo, ...periodo }, f.meta), 'mes', MEDIDAS_NPS, periodo)
    const ponto = (i: number, m: ModoNps) => partesNps(Object.fromEntries(MEDIDAS_NPS.map((k) => [k, s.valores[k][i]])), m)
    const rep = s.buckets.map((_, i) => ponto(i, 'reportado'))
    const cor = s.buckets.map((_, i) => ponto(i, 'corrigido'))
    return { buckets: s.buckets, rotulos: s.rotulos, rep, cor }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cubo, f.filtrosCubo, f.meta, meses.inicio, meses.fim])

  const optionEvolucao = useMemo(() => {
    const difere = (i: number) => {
      const a = evolucao.rep[i].nps
      const b = evolucao.cor[i].nps
      return a != null && b != null && Math.abs(a - b) >= 0.05
    }
    const iDup = evolucao.buckets.findIndex((_, i) => difere(i))
    const validos = [...evolucao.rep, ...evolucao.cor].map((p) => p.nps).filter((v): v is number => v != null)
    const minimo = validos.length ? Math.floor((Math.min(...validos) - 4) / 5) * 5 : 0
    const maximo = validos.length ? Math.ceil((Math.max(...validos) + 3) / 5) * 5 : 100
    const linha = (m: ModoNps, pts: typeof evolucao.rep, cor: string, posicao: 'top' | 'bottom', z: number) => ({
      type: 'line',
      name: ROTULO_MODO[m],
      z,
      data: pts.map((p) => (p.nps == null ? null : Math.round(p.nps * 10) / 10)),
      itemStyle: { color: cor },
      lineStyle: { width: modo === m ? 3 : 2 },
      showSymbol: true,
      symbolSize: (_: unknown, p: { dataIndex: number }) => (difere(p.dataIndex) ? 9 : 5),
      label: {
        show: true,
        position: posicao,
        distance: 7,
        color: t.texto,
        fontSize: 12,
        fontWeight: 700,
        formatter: (p: { dataIndex: number; value: number | null }) => (difere(p.dataIndex) && p.value != null ? fmtNumero(p.value, 0) : ''),
      },
      emphasis: { focus: 'none' },
    })
    const rep = linha('reportado', evolucao.rep, t.series[0], 'top', 4)
    const cor = linha('corrigido', evolucao.cor, t.series[1], 'bottom', 3)
    return opcao({
      legend: { top: 0, left: 0 },
      grid: { left: 8, right: 24, top: 44, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: { dataIndex: number }[]) => {
          const i = params[0]?.dataIndex
          if (i == null) return ''
          const a = evolucao.rep[i]
          const b = evolucao.cor[i]
          const dup = a.respostas - b.respostas
          const ls: LinhaTooltip[] = [
            { nome: 'Reportado', valor: nps1(a.nps), cor: t.series[0] },
            { nome: 'Corrigido', valor: nps1(b.nps), cor: t.series[1] },
          ]
          if (a.nps != null && b.nps != null && dup > 0) {
            ls.push({ nome: 'Diferença', valor: `${fmtNumero(a.nps - b.nps, 1)} pts`, separar: true })
            ls.push({ nome: 'Respostas duplicadas', valor: `${fmtNumero(dup)} de ${fmtNumero(a.respostas)}` })
          } else ls.push({ nome: 'Respostas', valor: fmtNumero(a.respostas), separar: true })
          return tooltipHTML(
            evolucao.rotulos[i] ?? '',
            ls,
            dup > 0 ? 'Respostas duplicadas inflam o NPS reportado. O valor corrigido conta cada resposta uma única vez.' : undefined,
          )
        },
      },
      xAxis: { type: 'category', data: evolucao.rotulos, boundaryGap: false },
      yAxis: { type: 'value', min: minimo, max: maximo, axisLabel: { formatter: (v: number) => fmtNumero(v, 0) } },
      series: [
        {
          ...rep,
          markArea:
            iDup >= 0
              ? {
                  silent: true,
                  itemStyle: { color: t.status.amarelo, opacity: tema === 'escuro' ? 0.14 : 0.12 },
                  label: { show: true, position: 'insideTopRight', color: t.textoSecundario, fontSize: 11, distance: 6 },
                  data: [[{ name: `Duplicidade desde ${inicioDuplicidade ? fmtData(inicioDuplicidade) : fmtMes(evolucao.buckets[iDup])}`, xAxis: iDup }, { xAxis: evolucao.buckets.length - 1 }]],
                }
              : undefined,
        },
        cor,
      ],
    })
  }, [evolucao, modo, t, tema, inicioDuplicidade])

  const optionComposicao = useMemo(() => {
    const partes: { nome: string; valor: number; cor: string }[] = [
      { nome: 'Promotores', valor: atual.promotores, cor: cores.promotores },
      { nome: 'Neutros', valor: atual.neutros, cor: cores.neutros },
      { nome: 'Detratores', valor: atual.detratores, cor: cores.detratores },
    ]
    return opcao({
      grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
      tooltip: {
        trigger: 'item',
        formatter: (p: { seriesName: string; color: string; data: { bruto: number } }) =>
          tooltipHTML(`NPS ${ROTULO_MODO[modo].toLowerCase()}`, [
            { nome: p.seriesName, cor: p.color, valor: fmtNumero(p.data.bruto), nota: atual.respostas ? fmtPct(p.data.bruto / atual.respostas) : undefined },
            { nome: 'Respostas', valor: fmtNumero(atual.respostas), separar: true },
          ]),
      },
      xAxis: { type: 'value', max: 1, show: false },
      yAxis: { type: 'category', data: ['Composição'], show: false },
      series: partes.map((p, i) => ({
        type: 'bar',
        name: p.nome,
        stack: 'nps',
        barWidth: 34,
        itemStyle: {
          color: p.cor,
          borderColor: t.superficie,
          borderWidth: 1,
          borderRadius: i === 0 ? [6, 0, 0, 6] : i === partes.length - 1 ? [0, 6, 6, 0] : 0,
        },
        emphasis: { focus: 'none' },
        label: {
          show: atual.respostas > 0 && p.valor / atual.respostas >= 0.07,
          position: 'inside',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 600,
          formatter: () => fmtPct(p.valor / atual.respostas, 0),
        },
        data: [{ value: atual.respostas ? p.valor / atual.respostas : 0, bruto: p.valor }],
      })),
    })
  }, [atual.promotores, atual.neutros, atual.detratores, atual.respostas, cores, modo, t])

  // por canal (sem o filtro de canal: o canal filtrado fica em destaque) e por segmento
  const itensCanal: ItemBarra[] = useMemo(() => {
    const grupos = agrupar(cubo, filtrar(cubo, semCanal(f.filtrosCubo), f.meta), [DIM_CANAL], MEDIDAS_NPS)
    return grupos
      .map((g) => {
        const rep = partesNps(g.valores, 'reportado')
        const cor = partesNps(g.valores, 'corrigido')
        const c = corDaSerie(ordemCanais.indexOf(g.chave[0]), tema)
        return {
          nome: g.chave[0],
          valor: (modo === 'reportado' ? rep : cor).nps,
          cor: c,
          detalhes: [
            { nome: 'NPS reportado', valor: nps1(rep.nps), cor: modo === 'reportado' ? c : undefined },
            { nome: 'NPS corrigido', valor: nps1(cor.nps), cor: modo === 'corrigido' ? c : undefined },
            { nome: 'Respostas duplicadas', valor: fmtNumero(rep.respostas - cor.respostas) },
            { nome: 'Respostas', valor: fmtNumero((modo === 'reportado' ? rep : cor).respostas) },
          ],
        }
      })
      .filter((i) => i.valor != null)
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
  }, [cubo, f.filtrosCubo, f.meta, modo, ordemCanais, tema])

  const itensSegmento: ItemBarra[] = useMemo(() => {
    return agrupar(cubo, linhas, ['segmento'], MEDIDAS_NPS)
      .map((g) => {
        const rep = partesNps(g.valores, 'reportado')
        const cor = partesNps(g.valores, 'corrigido')
        return {
          nome: g.chave[0],
          valor: (modo === 'reportado' ? rep : cor).nps,
          cor: t.series[0],
          detalhes: [
            { nome: 'NPS reportado', valor: nps1(rep.nps), cor: modo === 'reportado' ? t.series[0] : undefined },
            { nome: 'NPS corrigido', valor: nps1(cor.nps), cor: modo === 'corrigido' ? t.series[0] : undefined },
            { nome: 'Respostas', valor: fmtNumero((modo === 'reportado' ? rep : cor).respostas) },
          ],
        }
      })
      .filter((i) => i.valor != null)
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
  }, [cubo, linhas, modo, t])

  const temDiferenca = reportado.nps != null && corrigido.nps != null && Math.abs(reportado.nps - corrigido.nps) >= 0.05
  const legenda = [
    { nome: 'Promotores', nota: 'notas 9 e 10', valor: atual.promotores, cor: cores.promotores },
    { nome: 'Neutros', nota: 'notas 7 e 8', valor: atual.neutros, cor: cores.neutros },
    { nome: 'Detratores', nota: 'notas 0 a 6', valor: atual.detratores, cor: cores.detratores },
  ]

  return (
    <Secao
      id="nps"
      titulo="NPS e satisfação"
      descricao="A lealdade declarada pelo cliente depois do atendimento, como foi reportada e como fica sem as respostas duplicadas."
      acoes={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Visão do NPS</span>
          <Alternador
            rotulo="Visão do NPS"
            valor={modo}
            aoMudar={aoMudarModo}
            opcoes={[
              { id: 'reportado', rotulo: 'Reportado' },
              { id: 'corrigido', rotulo: 'Corrigido' },
            ]}
          />
        </div>
      }
    >
      {mostrarDestaque && comite && (
        <aside
          aria-label="Divergência no NPS reportado"
          className="relative overflow-hidden rounded-2xl border border-status-amarelo/40 bg-card shadow-card"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-status-amarelo" aria-hidden />
          <div className="flex flex-col gap-5 p-5 pl-6 lg:flex-row lg:items-center lg:gap-8">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-status-amarelo-texto">
                <TriangleAlert className="size-4" aria-hidden />
                Métrica reportada acima do valor real
              </div>
              <p className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">
                NPS de {comite.nomeMes} levado ao comitê: {comite.reportado}. Valor correto: {comite.corrigido}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Diferença de {comite.reportado - comite.corrigido} pontos por respostas duplicadas.{' '}
                <Link to={`/farol/${TABELA_NPS}`} className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline">
                  Ver a origem em <code className="text-xs">{TABELA_NPS}</code>
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4 sm:gap-6">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Reportado</div>
                <div className="tabular mt-1 text-4xl font-semibold leading-none tracking-tight text-muted-foreground line-through decoration-status-amarelo decoration-2">
                  {comite.reportado}
                </div>
              </div>
              <ArrowRight className="size-5 text-muted-foreground/70" aria-hidden />
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Corrigido</div>
                <div className="tabular mt-1 text-4xl font-semibold leading-none tracking-tight">{comite.corrigido}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-center">
                <div className="tabular text-lg font-semibold leading-none">−{comite.reportado - comite.corrigido}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">pontos</div>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-2"
          titulo="Qual é o NPS do período e do que ele é feito?"
          subtitulo={`NPS ${ROTULO_MODO[modo].toLowerCase()} · ${fmtData(f.periodo.inicio)} a ${fmtData(f.periodo.fim)}`}
          chartRef={refComp}
          nomeArquivo="nps-composicao"
          vazio={atual.respostas <= 0}
          csv={() => ({
            nome: 'nps-composicao',
            colunas: ['Visão', 'NPS', 'Promotores', 'Neutros', 'Detratores', 'Respostas'],
            linhas: [
              ['Reportado', reportado.nps == null ? '' : Math.round(reportado.nps * 10) / 10, Math.round(reportado.promotores), Math.round(reportado.neutros), Math.round(reportado.detratores), Math.round(reportado.respostas)],
              ['Corrigido', corrigido.nps == null ? '' : Math.round(corrigido.nps * 10) / 10, Math.round(corrigido.promotores), Math.round(corrigido.neutros), Math.round(corrigido.detratores), Math.round(corrigido.respostas)],
            ],
          })}
        >
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
              <div className="flex items-baseline gap-2">
                <span className="tabular text-6xl font-semibold leading-none tracking-tight">{nps0(atual.nps)}</span>
                <span className="text-sm text-muted-foreground">pontos</span>
              </div>
              {temDiferenca && (
                <button
                  type="button"
                  onClick={() => aoMudarModo(modo === 'reportado' ? 'corrigido' : 'reportado')}
                  className="mb-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-left text-xs leading-snug text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {modo === 'reportado' ? 'Corrigido' : 'Reportado'}:{' '}
                  <strong className="tabular font-semibold text-foreground">{nps1(modo === 'reportado' ? corrigido.nps : reportado.nps)}</strong>
                  <br />
                  {fmtNumero(duplicadas)} respostas duplicadas no período
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              NPS = % de promotores − % de detratores · {fmtNumero(atual.respostas)} respostas {modo === 'corrigido' ? 'únicas' : 'como reportadas'}
            </p>
            <div className="mt-5">
              <EChart ref={refComp} option={optionComposicao} altura={40} descricao="Composição do NPS: promotores, neutros e detratores" />
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-3">
              {legenda.map((l) => (
                <li key={l.nome} className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: l.cor }} aria-hidden />
                    <span className="truncate">{l.nome}</span>
                  </div>
                  <div className="tabular mt-1 text-lg font-semibold leading-none">{atual.respostas ? fmtPct(l.valor / atual.respostas) : '–'}</div>
                  <div className="mt-1 truncate text-[11px] text-muted-foreground">
                    {fmtNumero(l.valor)} · {l.nota}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-3"
          titulo="O NPS reportado ao comitê reflete a opinião real do cliente?"
          subtitulo={`Evolução mensal do NPS, reportado × corrigido · meses inteiros que intersectam o período (${fmtMes(meses.primeiro)} a ${fmtMes(meses.ultimo)})`}
          chartRef={refEvo}
          nomeArquivo="nps-evolucao-mensal"
          vazio={!evolucao.buckets.length}
          csv={() => ({
            nome: 'nps-evolucao-mensal',
            colunas: ['Mês', 'NPS reportado', 'NPS corrigido', 'Respostas reportadas', 'Respostas duplicadas'],
            linhas: evolucao.buckets.map((b, i) => [
              b,
              evolucao.rep[i].nps == null ? '' : Math.round((evolucao.rep[i].nps as number) * 10) / 10,
              evolucao.cor[i].nps == null ? '' : Math.round((evolucao.cor[i].nps as number) * 10) / 10,
              Math.round(evolucao.rep[i].respostas),
              Math.round(evolucao.rep[i].respostas - evolucao.cor[i].respostas),
            ]),
          })}
          rodape="As duas linhas coincidem enquanto não há duplicidade. A partir de outubro de 2026, cada resposta duplicada conta duas vezes no valor reportado."
        >
          <EChart ref={refEvo} option={optionEvolucao} altura={300} descricao="Evolução mensal do NPS reportado e corrigido" />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          titulo="Em quais canais o cliente sai mais satisfeito?"
          subtitulo={`NPS ${ROTULO_MODO[modo].toLowerCase()} por canal · clique para filtrar${f.canais.length ? ` · em destaque: ${f.canais.join(', ')}` : ''}`}
          chartRef={refCanal}
          nomeArquivo="nps-por-canal"
          vazio={!itensCanal.length}
          csv={() => ({ nome: 'nps-por-canal', colunas: ['Canal', `NPS ${modo}`], linhas: itensCanal.map((i) => [i.nome, i.valor == null ? '' : Math.round(i.valor * 10) / 10]) })}
        >
          <BarrasH
            ref={refCanal}
            itens={itensCanal}
            fmt={(v) => fmtNumero(v, 0)}
            selecionados={f.canais}
            aoClicar={alternarCanal}
            rodapeTooltip="Clique para filtrar o relatório por este canal (clique de novo para remover)."
            descricao="NPS por canal de atendimento"
          />
        </ChartCard>
        <ChartCard
          titulo="Quais segmentos de consórcio avaliam melhor o atendimento?"
          subtitulo={`NPS ${ROTULO_MODO[modo].toLowerCase()} por segmento`}
          chartRef={refSeg}
          nomeArquivo="nps-por-segmento"
          vazio={!itensSegmento.length}
          csv={() => ({ nome: 'nps-por-segmento', colunas: ['Segmento', `NPS ${modo}`], linhas: itensSegmento.map((i) => [i.nome, i.valor == null ? '' : Math.round(i.valor * 10) / 10]) })}
        >
          <BarrasH ref={refSeg} itens={itensSegmento} fmt={(v) => fmtNumero(v, 0)} altura={Math.max(150, 5 * 40 + 44)} descricao="NPS por segmento" />
        </ChartCard>
      </div>
    </Secao>
  )
}
