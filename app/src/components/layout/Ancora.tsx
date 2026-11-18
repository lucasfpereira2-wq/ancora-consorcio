import { Anchor } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Marca genérica do Hub: âncora sobre selo arredondado. Não é logotipo de nenhuma empresa. */
export function MarcaAncora({ tamanho = 32, className }: { tamanho?: number; className?: string }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-[28%] bg-gradient-to-br from-agua-500 to-agua-600 text-marinho-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]', className)}
      style={{ width: tamanho, height: tamanho }}
      aria-hidden
    >
      <Anchor style={{ width: tamanho * 0.56, height: tamanho * 0.56 }} strokeWidth={2.25} />
    </span>
  )
}
