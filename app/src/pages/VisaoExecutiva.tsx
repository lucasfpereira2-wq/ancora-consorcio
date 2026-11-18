import { LayoutDashboard } from 'lucide-react'
import { EmConstrucao, Pagina } from '@/components/layout/Pagina'

/** Placeholder: implementado em uma próxima etapa (mantém rota, layout e título). */
export default function VisaoExecutiva() {
  return (
    <Pagina titulo="Visão Executiva" subtitulo="A saúde dos dados e dos relatórios da Âncora em uma única tela." icone={LayoutDashboard}>
      <EmConstrucao />
    </Pagina>
  )
}
