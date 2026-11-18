import { BookOpen } from 'lucide-react'
import { EmConstrucao, Pagina } from '@/components/layout/Pagina'

/** Placeholder: implementado em uma próxima etapa (mantém rota, layout e título). */
export default function Glossario() {
  return (
    <Pagina titulo="Glossário de métricas" subtitulo="Definições oficiais, fórmulas e tabelas de origem de cada indicador." icone={BookOpen}>
      <EmConstrucao />
    </Pagina>
  )
}
