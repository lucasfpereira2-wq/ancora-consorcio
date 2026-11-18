import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Renderiza um texto em que nomes de tabela entre crases (`fato_parcelas`) viram links para o Farol.
 * Trechos entre crases que não parecem nome de tabela (ex.: `id_parcela`) ficam só em fonte de código,
 * a menos que `tabelas` (lista de nomes conhecidos) confirme que é uma tabela.
 */
export function TextoComTabelas({ texto, tabelas, className }: { texto: string; tabelas?: string[]; className?: string }) {
  const partes = texto.split(/`([^`]+)`/g)
  const conhecidas = tabelas ? new Set(tabelas) : null
  return (
    <span className={className}>
      {partes.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>
        const ehTabela = conhecidas ? conhecidas.has(p) : /^(stg|raw|dim|fato|fct|mart|int|core|agg|ref|rel|snap|leg|legado)_[a-z0-9_]+$/i.test(p)
        const estilo = 'rounded-md bg-foreground/[0.07] px-1.5 py-px font-mono text-[0.86em] font-medium'
        return ehTabela ? (
          <Link key={i} to={`/farol/${encodeURIComponent(p)}`} className={cn(estilo, 'underline decoration-current/40 underline-offset-2 transition-colors hover:bg-foreground/[0.14]')}>
            {p}
          </Link>
        ) : (
          <code key={i} className={estilo}>
            {p}
          </code>
        )
      })}
    </span>
  )
}
