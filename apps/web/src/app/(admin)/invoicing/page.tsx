// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileText, CheckCircle, Clock, BarChart2, DollarSign,
  X, ChevronDown, AlertCircle, RefreshCw, Ban, Calculator,
} from 'lucide-react'
import { api, type InvoicingRecord, type FinancialStats } from '@/lib/api'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function totalCuttingTime(rec: InvoicingRecord) {
  return rec.serviceOrder.stages.reduce((s, st) => s + (st.cuttingTime ?? 0), 0)
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', invoiced: 'Faturado', cancelled: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = {
  pending: '#EAB308',
  invoiced: '#22C55E',
  cancelled: '#6B7280',
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#6B7280' }}>{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1C1F26' }}>
          <Icon className="h-4 w-4" style={{ color: '#9CA3AF' }} />
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{sub}</p>}
    </div>
  )
}

// ─── Approve Modal ────────────────────────────────────────────────────────────

function ApproveModal({ record, onClose, onDone }: {
  record: InvoicingRecord; onClose: () => void; onDone: () => void
}) {
  const [costValue, setCostValue] = useState(record.costValue ? String(record.costValue) : '')
  const [notes, setNotes] = useState(record.notes ?? '')
  const [type, setType] = useState<string>(record.type)
  const [noInvoice, setNoInvoice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [calcResult, setCalcResult] = useState<{ suggestedValue: number; breakdown: { stageNumber: number; machineName: string; minutes: number; cost: number }[]; hasParams: boolean } | null>(null)

  useEffect(() => {
    api.financial.calculate(record.id).then(r => {
      setCalcResult(r)
      if (r.hasParams && !record.costValue) setCostValue(String(r.suggestedValue))
    }).catch(() => { /* sem params configurados — ok */ })
  }, [record.id, record.costValue])

  async function submit() {
    setLoading(true); setError('')
    try {
      await api.financial.approve(record.id, {
        costValue: noInvoice ? undefined : (costValue ? Number(costValue) : undefined),
        notes: noInvoice ? 'Sem fatura — cliente não solicitou' : (notes || undefined),
        type,
      })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao aprovar')
    } finally {
      setLoading(false)
    }
  }

  const totalTime = totalCuttingTime(record)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1C1F26' }}>
          <div>
            <h2 className="text-base font-bold text-white">Aprovar Faturação</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              Ordem #{record.serviceOrder.orderNumber} · {record.serviceOrder.client?.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <X className="h-4 w-4" style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Info resumo */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3" style={{ borderBottom: '1px solid #111318' }}>
          <div className="rounded-xl p-3 text-center" style={{ background: '#07080A' }}>
            <p className="text-xs" style={{ color: '#6B7280' }}>Obra</p>
            <p className="text-sm font-semibold text-white mt-0.5">{record.serviceOrder.project?.name ?? '—'}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: '#07080A' }}>
            <p className="text-xs" style={{ color: '#6B7280' }}>Concluída</p>
            <p className="text-sm font-semibold text-white mt-0.5">
              {record.serviceOrder.completedAt ? fmtDate(record.serviceOrder.completedAt) : '—'}
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: '#07080A' }}>
            <p className="text-xs" style={{ color: '#6B7280' }}>Tempo corte</p>
            <p className="text-sm font-semibold text-white mt-0.5">{totalTime > 0 ? `${totalTime} min` : '—'}</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Tipo de faturação</label>
            <div className="relative">
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm text-white appearance-none pr-10"
                style={{ background: '#07080A', border: '1px solid #1C1F26' }}
              >
                <option value="material_and_labor">Material + Mão-de-obra</option>
                <option value="labor_only">Só Mão-de-obra</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#6B7280' }} />
            </div>
          </div>

          {calcResult?.hasParams && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Calculator className="h-3.5 w-3.5" style={{ color: '#EAB308' }} />
                <p className="text-xs font-semibold" style={{ color: '#EAB308' }}>
                  Calculado automaticamente: {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(calcResult.suggestedValue)}
                </p>
              </div>
              {calcResult.breakdown.map(b => (
                <p key={b.stageNumber} className="text-xs" style={{ color: '#6B7280' }}>
                  Etapa {b.stageNumber} · {b.machineName} · {b.minutes} min → {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(b.cost)}
                </p>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Valor (€) <span style={{ color: '#4B5563' }}>— opcional</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costValue}
              onChange={e => setCostValue(e.target.value)}
              placeholder="Ex: 350.00"
              className="w-full rounded-xl px-4 py-3 text-sm text-white"
              style={{ background: '#07080A', border: '1px solid #1C1F26', outline: 'none' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Notas <span style={{ color: '#4B5563' }}>— opcional</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações sobre esta faturação…"
              className="w-full rounded-xl px-4 py-3 text-sm text-white resize-none"
              style={{ background: '#07080A', border: '1px solid #1C1F26', outline: 'none' }}
            />
          </div>

          {/* Sem fatura */}
          <label className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer select-none"
            style={{ background: noInvoice ? 'rgba(107,114,128,0.08)' : '#07080A', border: `1px solid ${noInvoice ? '#374151' : '#1C1F26'}` }}>
            <input type="checkbox" checked={noInvoice} onChange={e => setNoInvoice(e.target.checked)} className="hidden" />
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: noInvoice ? '#374151' : '#1C1F26', border: '1px solid #374151' }}>
              {noInvoice && <Ban className="h-3 w-3" style={{ color: '#9CA3AF' }} />}
            </div>
            <div>
              <p className="text-sm font-medium text-white">Sem fatura</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>Cliente não solicitou fatura — marcar como concluído sem emissão</p>
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
              <p className="text-sm" style={{ color: '#D1D5DB' }}>{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
            style={{ background: '#07080A', border: '1px solid #1C1F26', color: '#9CA3AF' }}
          >
            Cancelar
          </button>
          <button onClick={submit} disabled={loading}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={{ background: '#EAB308', color: '#07080A' }}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Confirmar Faturação
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: '', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'invoiced', label: 'Faturados' },
  { key: 'cancelled', label: 'Cancelados' },
]

export default function InvoicingPage() {
  const [records, setRecords] = useState<InvoicingRecord[]>([])
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [tab, setTab] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<InvoicingRecord | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, s] = await Promise.all([
        api.financial.list(tab ? { status: tab } : {}),
        api.financial.stats(),
      ])
      setRecords(res.records)
      setTotal(res.total)
      setStats(s)
    } catch {
      showToast('Erro ao carregar dados', 'err')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load() }, [load])

  async function handleCancel(id: string) {
    if (!confirm('Cancelar esta faturação?')) return
    try {
      await api.financial.cancel(id)
      showToast('Faturação cancelada')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro', 'err')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl flex items-center gap-3"
          style={{
            background: toast.type === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${toast.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: toast.type === 'ok' ? '#86EFAC' : '#FCA5A5',
          }}>
          {toast.type === 'ok' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Portal Financeiro</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            {total} {total === 1 ? 'registo' : 'registos'}
            {tab ? ` · ${TABS.find(t => t.key === tab)?.label}` : ''}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          style={{ background: '#0D0E12', border: '1px solid #1C1F26', color: '#9CA3AF' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Pendentes" value={String(stats.pendingCount)} icon={Clock} sub="aguardam aprovação" />
          <KpiCard label="Faturados este mês" value={String(stats.invoicedThisMonth)} icon={CheckCircle}
            sub={fmt(stats.revenueThisMonth)} />
          <KpiCard
            label="Crescimento"
            value={stats.revenueGrowth !== null ? `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%` : '—'}
            icon={BarChart2}
            sub="vs mês anterior"
          />
          <KpiCard label="Total faturado" value={fmt(stats.revenueTotal)} icon={DollarSign} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#0D0E12', border: '1px solid #1C1F26', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: '#EAB308', color: '#07080A' }
              : { color: '#6B7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-5 w-5 animate-spin" style={{ color: '#EAB308' }} />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <FileText className="h-8 w-8" style={{ color: '#374151' }} />
            <p className="text-sm" style={{ color: '#6B7280' }}>Nenhum registo encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #111318' }}>
                {['Ordem', 'Cliente', 'Obra', 'Concluída', 'Tipo', 'Valor', 'Estado', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4B5563' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={rec.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #111318' : 'none' }}>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-mono font-bold" style={{ color: '#EAB308' }}>
                      #{rec.serviceOrder.orderNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-white">{rec.serviceOrder.client?.name ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>
                      {rec.serviceOrder.project?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>
                      {rec.serviceOrder.completedAt ? fmtDate(rec.serviceOrder.completedAt) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#1C1F26', color: '#9CA3AF' }}>
                      {rec.type === 'material_and_labor' ? 'Mat + M.O.' : 'M.O.'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-white">
                      {rec.costValue ? fmt(Number(rec.costValue)) : <span style={{ color: '#4B5563' }}>—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: `${STATUS_COLOR[rec.status]}18`,
                        color: STATUS_COLOR[rec.status],
                      }}>
                      {STATUS_LABEL[rec.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {rec.status === 'pending' && (
                        <button onClick={() => setApproving(rec)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                          style={{ background: 'rgba(234,179,8,0.12)', color: '#EAB308' }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aprovar
                        </button>
                      )}
                      {rec.status === 'invoiced' && (
                        <button onClick={() => handleCancel(rec.id)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                          style={{ color: '#4B5563' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#FCA5A5' }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#4B5563' }}
                        >
                          <X className="h-3.5 w-3.5" />
                          Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Approve Modal */}
      {approving && (
        <ApproveModal
          record={approving}
          onClose={() => setApproving(null)}
          onDone={() => { setApproving(null); showToast('Faturação aprovada com sucesso'); load() }}
        />
      )}
    </div>
  )
}
