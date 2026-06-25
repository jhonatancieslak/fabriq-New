// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { cn } from '@/lib/utils'

const variants: Record<string, string> = {
  draft:            'bg-slate-100 text-slate-600',
  pending:          'bg-yellow-100 text-yellow-700',
  in_progress:      'bg-blue-100 text-blue-700',
  completed:        'bg-green-100 text-green-700',
  awaiting_invoice: 'bg-orange-100 text-orange-700',
  invoiced:         'bg-purple-100 text-purple-700',
  cancelled:        'bg-red-100 text-red-600',
  paused:           'bg-slate-100 text-slate-600',
}

const labels: Record<string, string> = {
  draft:            'Rascunho',
  pending:          'Pendente',
  in_progress:      'Em execução',
  completed:        'Concluída',
  awaiting_invoice: 'Aguarda faturação',
  invoiced:         'Faturada',
  cancelled:        'Cancelada',
  paused:           'Pausada',
  laser_cnc:        'Corte CNC',
  bending:          'Quinagem',
  guillotine:       'Guilhotina',
  steel:            'Aço Carbono',
  stainless:        'Inox',
  aluminum:         'Alumínio',
  copper:           'Cobre',
  brass:            'Latão',
  other:            'Outro',
}

interface BadgeProps {
  status: string
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      variants[status] ?? 'bg-slate-100 text-slate-600',
      className,
    )}>
      {labels[status] ?? status}
    </span>
  )
}
