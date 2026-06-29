// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Componentes UI partilhados — tema claro profissional FABRIQ.IA

'use client'

import { useEffect, useRef, useState } from 'react'
import { X, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Search, RefreshCw, Plus, Eye, Pencil, Trash2, Power, QrCode, Copy, Printer, FileSpreadsheet, FileDown } from 'lucide-react'

// ─── Tokens ──────────────────────────────────────────────────────────────────
export const T = {
  bg:       '#F3F4F6',
  surface:  '#FFFFFF',
  border:   '#E5E7EB',
  divider:  '#F3F4F6',
  text:     '#111827',
  muted:    '#6B7280',
  subtle:   '#9CA3AF',
  faint:    '#D1D5DB',
  yellow:   '#CA8A04',
  danger:   '#DC2626',
  dangerBg: 'rgba(220,38,38,0.06)',
  dangerBorder: 'rgba(220,38,38,0.2)',
  successBg: 'rgba(22,163,74,0.07)',
  successBorder: 'rgba(22,163,74,0.2)',
  yellowBg: 'rgba(202,138,4,0.08)',
  yellowBorder: 'rgba(202,138,4,0.2)',
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  const ok = type === 'ok'
  return (
    <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-lg"
      style={{
        background: ok ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${ok ? '#86EFAC' : '#FECACA'}`,
        color: ok ? '#166534' : '#991B1B',
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
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-gray-100">
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
    primary: { background: T.yellow, color: '#FFFFFF' },
    ghost:   { background: T.surface, border: `1px solid ${T.border}`, color: T.muted },
    danger:  { background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: '#DC2626' },
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
const inputStyle = { background: '#F9FAFB', border: `1px solid ${T.border}`, color: T.text, colorScheme: 'light' as const }

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

// ─── Combobox ─────────────────────────────────────────────────────────────────
export function Combobox({ options, value, onChange, onCreate, placeholder, disabled, label: selectedLabel }: {
  options: { id: string; label: string; sub?: string }[]
  value: string                           // selected id
  onChange: (id: string) => void
  onCreate?: (typed: string) => void      // "Criar 'X'" option
  placeholder?: string
  disabled?: boolean
  label?: string                          // label for the currently selected value (when options may not be loaded yet)
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

  // sync display when value changes externally
  const matched = options.find(o => o.id === value)
  const display = matched?.label ?? selectedLabel ?? ''

  useEffect(() => {
    if (!open) setQuery(display)
  }, [open, display])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(display) // reset if user typed but didn't select
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [display])

  const filtered = options.filter(o =>
    !query || o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sub ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const showCreate = onCreate && query.trim().length >= 2 && !options.some(o => o.label.toLowerCase() === query.toLowerCase())

  function select(o: { id: string; label: string }) {
    onChange(o.id)
    setQuery(o.label)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: T.subtle }} />
        <input
          type="text"
          value={query}
          placeholder={placeholder ?? 'Pesquisar…'}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
          onFocus={() => { setOpen(true); setQuery('') }}
          className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors"
          style={{ background: disabled ? T.divider : '#F9FAFB', border: `1px solid ${T.border}`, color: T.text }}
        />
      </div>
      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 mt-1 w-full rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {filtered.map(o => (
            <button key={o.id} type="button"
              onClick={() => select(o)}
              className="flex w-full flex-col items-start px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 text-left"
              style={{ color: T.text, borderBottom: `1px solid ${T.divider}` }}>
              <span className="font-medium">{o.label}</span>
              {o.sub && <span className="text-xs mt-0.5" style={{ color: T.subtle }}>{o.sub}</span>}
            </button>
          ))}
          {showCreate && (
            <button type="button"
              onClick={() => { onCreate!(query.trim()); setOpen(false) }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-yellow-50"
              style={{ color: T.yellow }}>
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              Criar &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ErrorMsg ─────────────────────────────────────────────────────────────────
export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-4 py-3"
      style={{ background: T.dangerBg, border: `1px solid ${T.dangerBorder}` }}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: T.danger }} />
      <p className="text-sm" style={{ color: '#991B1B' }}>{msg}</p>
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
        style={{ background: '#F9FAFB', border: `1px solid ${T.border}`, color: T.text, colorScheme: 'light' }}
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
      className="transition-colors hover:bg-gray-50">
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
                ? { background: T.yellow, color: '#FFFFFF' }
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

// ─── ActionBtn ────────────────────────────────────────────────────────────────
type ActionVariant = 'view' | 'edit' | 'delete' | 'enable' | 'disable' | 'qr' | 'copy' | 'print'

const ACTION_STYLES: Record<ActionVariant, { bg: string; color: string; hoverBg: string }> = {
  view:    { bg: 'rgba(59,130,246,0.08)',  color: '#3B82F6', hoverBg: 'rgba(59,130,246,0.16)'  },
  edit:    { bg: 'rgba(234,179,8,0.10)',   color: '#CA8A04', hoverBg: 'rgba(234,179,8,0.20)'   },
  delete:  { bg: 'rgba(239,68,68,0.08)',   color: '#EF4444', hoverBg: 'rgba(239,68,68,0.16)'   },
  enable:  { bg: 'rgba(34,197,94,0.08)',   color: '#16A34A', hoverBg: 'rgba(34,197,94,0.16)'   },
  disable: { bg: 'rgba(249,115,22,0.08)',  color: '#EA580C', hoverBg: 'rgba(249,115,22,0.16)'  },
  qr:      { bg: 'rgba(139,92,246,0.08)',  color: '#7C3AED', hoverBg: 'rgba(139,92,246,0.16)'  },
  copy:    { bg: 'rgba(107,114,128,0.08)', color: '#6B7280', hoverBg: 'rgba(107,114,128,0.16)' },
  print:   { bg: 'rgba(20,184,166,0.08)',  color: '#0D9488', hoverBg: 'rgba(20,184,166,0.16)'  },
}
const ACTION_ICONS: Record<ActionVariant, React.ComponentType<{ className?: string }>> = {
  view: Eye, edit: Pencil, delete: Trash2, enable: Power, disable: Power,
  qr: QrCode, copy: Copy, print: Printer,
}

export function ActionBtn({ variant, onClick, title, disabled, label }: {
  variant: ActionVariant
  onClick: () => void
  title?: string
  disabled?: boolean
  label?: string
}) {
  const s    = ACTION_STYLES[variant]
  const Icon = ACTION_ICONS[variant]
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-40"
      style={{ background: hovered ? s.hoverBg : s.bg, color: s.color }}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label && <span>{label}</span>}
    </button>
  )
}

// ─── TableToolbar ─────────────────────────────────────────────────────────────
export function TableToolbar({ search, onSearch, placeholder, filters, activeFilter, onFilter, onPrint, onXLS, onPDF, extra }: {
  search: string
  onSearch: (v: string) => void
  placeholder?: string
  filters?: { key: string; label: string }[]
  activeFilter?: string
  onFilter?: (key: string) => void
  onPrint?: () => void
  onXLS?: () => void
  onPDF?: () => void
  extra?: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      {filters && filters.length > 0 && onFilter && (
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: T.surface, border: `1px solid ${T.border}`, width: 'fit-content' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => onFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              style={activeFilter === f.key ? { background: T.yellow, color: '#FFF' } : { color: T.subtle }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Search + Export */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: T.subtle }} />
            <input type="text" value={search} onChange={e => onSearch(e.target.value)}
              placeholder={placeholder ?? 'Pesquisar…'}
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
              style={{ background: '#F9FAFB', border: `1px solid ${T.border}`, color: T.text }} />
          </div>
        </div>

        {extra}

        <div className="flex items-center gap-1 ml-auto">
          {onPrint && (
            <button onClick={onPrint} title="Imprimir"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:bg-teal-50"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: '#0D9488' }}>
              <Printer className="h-3.5 w-3.5" /><span className="hidden sm:inline">Imprimir</span>
            </button>
          )}
          {onXLS && (
            <button onClick={onXLS} title="Exportar XLS"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:bg-green-50"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: '#16A34A' }}>
              <FileSpreadsheet className="h-3.5 w-3.5" /><span className="hidden sm:inline">XLS</span>
            </button>
          )}
          {onPDF && (
            <button onClick={onPDF} title="Exportar PDF"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:bg-red-50"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: '#DC2626' }}>
              <FileDown className="h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export utilities ─────────────────────────────────────────────────────────
export function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
  const bom  = '﻿'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export function printOrPDF(title: string, headers: string[], rows: (string | number | null | undefined)[][], mode: 'print' | 'pdf' = 'print') {
  const tableRows = rows.map(r =>
    `<tr>${r.map(c => `<td>${String(c ?? '—')}</td>`).join('')}</tr>`
  ).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:system-ui,sans-serif;font-size:12px;color:#111;margin:24px}
    h2{font-size:16px;font-weight:800;margin:0 0 4px;letter-spacing:-0.3px}
    p{font-size:11px;color:#6b7280;margin:0 0 16px}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left;border-bottom:2px solid #e5e7eb}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:11px}
    tr:last-child td{border-bottom:none}
    .meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb}
    @media print{body{margin:0}}
  </style></head><body>
  <div class="meta">
    <div><h2>FABRIQ.IA — ${title}</h2><p>${rows.length} registo${rows.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('pt-PT')}</p></div>
  </div>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>
  </body></html>`
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  if (mode === 'pdf') {
    w.onload = () => { w.print() }
  } else {
    setTimeout(() => w.print(), 400)
  }
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
