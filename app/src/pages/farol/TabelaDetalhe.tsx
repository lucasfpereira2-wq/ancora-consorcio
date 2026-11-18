import { Table2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { EmConstrucao, Pagina } from '@/components/layout/Pagina'

/** Placeholder: detalhe da tabela (colunas, execuções, testes, amostra e linhagem). */
export default function TabelaDetalhe() {
  const { tabela = '' } = useParams()
  return (
    <Pagina titulo={tabela} subtitulo="Colunas, execuções, testes de qualidade, amostra e linhagem da tabela." icone={Table2}>
      <EmConstrucao />
    </Pagina>
  )
}
