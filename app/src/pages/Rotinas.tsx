import { Workflow } from 'lucide-react'
import { EmConstrucao, Pagina } from '@/components/layout/Pagina'

/** Placeholder: implementado em uma próxima etapa (mantém rota, layout e título). */
export default function Rotinas() {
  return (
    <Pagina titulo="Rotinas" subtitulo="Pipelines de carga: agenda, execuções dos últimos 30 dias e falhas recorrentes." icone={Workflow}>
      <EmConstrucao />
    </Pagina>
  )
}
