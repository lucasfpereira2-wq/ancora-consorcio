import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { useMeta, useRelatorio } from '@/lib/dados'
import { useFiltrosResolvidos } from '@/lib/filtros'

const ID = 'atendimento'

/** Placeholder: casca pronta (selo, filtros, estados). KPIs e gráficos entram na próxima etapa. */
export default function Atendimento() {
  const { dados, carregando } = useRelatorio(ID)
  const { dados: meta } = useMeta()
  // filtros.filtrosCubo + filtros.meta alimentam filtrar(cubo, ...); filtros.granularidade alimenta serieTemporal(...)
  const filtros = useFiltrosResolvidos({ dimCanal: 'canal' })
  void filtros

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Volume de contatos, tempo médio de atendimento, nível de serviço e NPS."
      filtros={{ canal: { rotulo: 'Canal de atendimento', opcoes: meta?.canais_atendimento ?? [] } }}
      carregando={carregando}
      vazio={!dados}
    >
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
        Cubos carregados: {dados ? Object.keys(dados.cubos).join(', ') : '–'}. Os indicadores desta tela entram na próxima etapa.
      </div>
    </LayoutRelatorio>
  )
}
