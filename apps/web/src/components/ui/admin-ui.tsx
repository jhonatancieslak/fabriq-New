// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Componentes UI partilhados — dark theme FABRIQ.IA

'use client'

import { useEffect, useRef } from 'react'
import { X, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react'

// ─── Tokens ──────────────────────────────────────────────────────────────────
export const T = {
  bg:       '#07080A',
  surface:  '#0D0E12',
  border:   '#1C1F26',
  divider:  '#111318',
  text:     '#FFFFFF',
  muted:    '#9CA3AF',
  subtle:   '#6B7280',
  faint:    '#374151',
  yellow:   '#EAB308',
  danger:   '#EF4444',
  dangerBg: 'rgba(239,68,68,0.08)',
  dangerBorder: 'rgba(239,68,68,0.2)',
  successBg: 'rgba(34,197,94,0.1)',
  successBorder: 'rgba(34,197,94,0.25)',
  yellowBg: 'rgba(234,179,8,0.12)',
  yellowBorder: 'rgba(234,179,8,0.25)',
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  const ok = type === 'ok'
  return (
    <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl"
      style={{
        background: ok ? T.successBg : T.dangerBg,
        border: `1px solid ${ok ? T.successBorder : T.dangerBorder}`,
        color: ok ? '#86EFAC' : '#FCA5A5',
      }}>
      {ok ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      {msg}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, sub, onClose, children, footer }: {
  title: string; sub?: string; onClose: () => void
  children: React.ReactNode; footer?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.divider}` }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: T.text }}>{title}</h2>
            {sub && <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{sub}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <X className="h-4 w-4" style={{ color: T.subtle }} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">{children}</div>
        {footer && (
          <div className="flex gap-3 px-6 pb-5 pt-2 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>
  )
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled, type = 'button', className = '' }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const styles = {
    primary: { background: T.yellow, color: '#07080A' },
    ghost:   { background: T.surface, border: `1px solid ${T.border}`, color: T.muted },
    danger:  { background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: '#FCA5A5' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${className}`}
      style={styles[variant]}>
      {children}
    </button>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-xs font-medium" style={{ color: T.muted }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: T.faint }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputBase = `w-full rounded-xl px-4 py-3 text-sm transition-colors outline-none`
const inputStyle = { background: T.bg, border: `1px solid ${T.border}`, color: T.text }

export function Input({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className={inputBase} style={inputStyle} />
  )
}

export function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className={`${inputBase} resize-none`} style={inputStyle} />
  )
}

export function Select({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={`${inputBase} appearance-none pr-10`} style={inputStyle}>
        {children}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4"
        style={{ color: T.subtle }} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  )
}

// ─── ErrorMsg ─────────────────────────────────────────────────────────────────
export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-4 py-3"
      style={{ background: T.dangerBg, border: `1px solid ${T.dangerBorder}` }}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: T.danger }} />
      <p className="text-sm" style={{ color: '#FCA5A5' }}>{msg}</p>
    </div>
  )
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>{title}</h1>
        {sub && <p className="text-sm mt-0.5" style={{ color: T.subtle }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Pesquisar…' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: T.subtle }} />
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
        style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
      />
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function Table({ headers, children, loading, empty }: {
  headers: string[]; children: React.ReactNode; loading?: boolean; empty?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.yellow }} />
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.divider}` }}>
              {headers.map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: T.faint }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      )}
      {!loading && !children && empty}
    </div>
  )
}

export function Tr({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <tr style={last ? {} : { borderBottom: `1px solid ${T.divider}` }}
      className="transition-colors hover:bg-white/[0.02]">
      {children}
    </tr>
  )
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 ${className}`}>{children}</td>
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, pages, total, onPage }: {
  page: number; pages: number; total: number; onPage: (p: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs" style={{ color: T.subtle }}>{total} registos · página {page} de {pages}</p>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="p-2 rounded-lg transition-colors disabled:opacity-30"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronLeft className="h-4 w-4" style={{ color: T.muted }} />
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i
          return (
            <button key={p} onClick={() => onPage(p)}
              className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
              style={p === page
                ? { background: T.yellow, color: '#07080A' }
                : { background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}>
              {p}
            </button>
          )
        })}
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}
          className="p-2 rounded-lg transition-colors disabled:opacity-30"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronRight className="h-4 w-4" style={{ color: T.muted }} />
        </button>
      </div>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = T.subtle }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `${color}18`, color }}>
      {label}
    </span>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, title, sub }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string; sub?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <Icon className="h-10 w-10" style={{ color: T.faint }} />
      <p className="text-sm font-medium" style={{ color: T.subtle }}>{title}</p>
      {sub && <p className="text-xs" style={{ color: T.faint }}>{sub}</p>}
    </div>
  )
}
