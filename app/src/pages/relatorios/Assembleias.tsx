import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { useMeta, useRelatorio } from '@/lib/dados'
import { useFiltrosResolvidos } from '@/lib/filtros'

const ID = 'assembleias'

/** Placeholder: casca pronta (selo, filtros, estados). KPIs e gráficos entram na próxima etapa. */
export default function Assembleias() {
  const { dados, carregando } = useRelatorio(ID)
  const { dados: meta } = useMeta()
  // filtros.filtrosCubo + filtros.meta alimentam filtrar(cubo, ...); filtros.granularidade alimenta serieTemporal(...)
  const filtros = useFiltrosResolvidos({ dimCanal: 'canal' })
  void filtros

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Assembleias realizadas, contemplações por sorteio e lance, e saúde dos grupos."
      filtros={{ canal: { rotulo: 'Canal de venda', opcoes: meta?.canais_venda ?? [] } }}
      carregando={carregando}
      vazio={!dados}
    >
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
        Cubos carregados: {dados ? Object.keys(dados.cubos).join(', ') : '–'}. Os indicadores desta tela entram na próxima etapa.
      </div>
    </LayoutRelatorio>
  )
}
