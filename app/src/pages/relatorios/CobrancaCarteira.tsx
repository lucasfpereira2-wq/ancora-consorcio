import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { useMeta, useRelatorio } from '@/lib/dados'
import { useFiltrosResolvidos } from '@/lib/filtros'

const ID = 'cobranca-carteira'

/** Placeholder: casca pronta (selo, filtros, estados). KPIs e gráficos entram na próxima etapa. */
export default function CobrancaCarteira() {
  const { dados, carregando } = useRelatorio(ID)
  const { dados: meta } = useMeta()
  // filtros.filtrosCubo + filtros.meta alimentam filtrar(cubo, ...); filtros.granularidade alimenta serieTemporal(...)
  const filtros = useFiltrosResolvidos({ dimCanal: 'canal' })
  void filtros

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Carteira ativa, inadimplência por faixa de atraso e recuperação."
      filtros={{ canal: { rotulo: 'Canal de cobrança', opcoes: meta?.canais_cobranca ?? [] } }}
      carregando={carregando}
      vazio={!dados}
    >
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
        Cubos carregados: {dados ? Object.keys(dados.cubos).join(', ') : '–'}. Os indicadores desta tela entram na próxima etapa.
      </div>
    </LayoutRelatorio>
  )
}
