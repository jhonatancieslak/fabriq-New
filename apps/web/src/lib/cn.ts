// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

// Constantes de estilo reutilizáveis — Tailwind puro, sem @apply
export const cls = {
  // Botões
  btnPrimary:  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  btnYellow:   'inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-yellow-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  btnOutline:  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50',
  btnDanger:   'inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 active:scale-95 disabled:opacity-50',

  // Cards
  card:        'rounded-2xl border border-slate-200 bg-white shadow-sm',
  darkCard:    'rounded-2xl border border-slate-700 bg-slate-800',

  // Inputs
  input:       'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
  darkInput:   'w-full rounded-xl bg-slate-700 border border-slate-600 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20',
  select:      'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',

  // Labels
  label:       'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5',
  darkLabel:   'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5',

  // Badges
  badge:       'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
}

export const statusBadge: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  invoiced:    'bg-purple-100 text-purple-700',
}

export const statusLabel: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em execução',
  completed: 'Concluída', cancelled: 'Cancelada', invoiced: 'Faturada',
}
