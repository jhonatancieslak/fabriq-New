// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import type { ReactNode } from 'react'

export const inputCls =
  'w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
export const labelCls = 'block text-xs text-slate-400 mb-1'
export const btnPrimary =
  'rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-medium px-4 py-2 transition'
export const btnGhost =
  'rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm px-3 py-1.5 transition'
export const btnDanger = 'text-red-400 hover:text-red-300 text-xs'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">{children}</div>
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="text-left text-xs font-medium text-slate-500 uppercase px-3 py-2">{children}</th>
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2 text-sm text-slate-200">{children}</td>
}

export function PageLoading() {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500 py-8 justify-center">
      <span className="h-4 w-4 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin" />
      A carregar…
    </div>
  )
}
