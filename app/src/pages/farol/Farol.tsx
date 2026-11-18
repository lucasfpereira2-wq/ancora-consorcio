import { Radar } from 'lucide-react'
import { EmConstrucao, Pagina } from '@/components/layout/Pagina'

/** Placeholder: implementado em uma próxima etapa (mantém rota, layout e título). */
export default function Farol() {
  return (
    <Pagina titulo="Farol de Dados" subtitulo="Status das 80 tabelas monitoradas: frescor, testes de qualidade, dono e SLA." icone={Radar}>
      <EmConstrucao />
    </Pagina>
  )
}
