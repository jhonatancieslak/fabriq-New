// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart2, Clock, TrendingUp, FileText, Download,
  Printer, Users, Cpu, Calendar, RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  T, Badge, PageHeader, Table, Tr, Td, exportCSV, printOrPDF, Empty,
} from '@/components/ui/admin-ui'

// ─── tipos ───────────────────────────────────────────────────────────────────

interface ReportData {
  period: { from: string; to: string }
  summary: {
    totalOrders: number
    byStatus: Record<string, number>
    totalCuttingTime: number
    revenue: number
    invoicedCount: number
    pendingRevenue: number
  }
  topClients: { name: string; orders: number }[]
  topMachines: { name: string; stages: number; cuttingTime: number }[]
  byDay: Record<string, number>
  orders: {
    id: string
    orderNumber: string
    title: string
    client: string
    project: string
    status: string
    cuttingTime: number
    value: number
    invoicingStatus: string | null
    createdAt: string
  }[]
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(min: number) {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em execução', completed: 'Concluída',
  cancelled: 'Cancelada', invoiced: 'Faturada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#9CA3AF', in_progress: '#EAB308', completed: '#22C55E',
  cancelled: '#EF4444', invoiced: '#A78BFA',
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.subtle }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.border }}>
          <Icon className="h-4 w-4" style={{ color: accent ?? T.muted }} />
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums leading-none" style={{ color: T.text }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: T.subtle }}>{sub}</p>}
    </div>
  )
}

// ─── Bar simples ─────────────────────────────────────────────────────────────

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-36 truncate" style={{ color: T.text }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: T.border }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-6 text-right tabular-nums" style={{ color: T.muted }}>{value}</span>
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo]     = useState(todayStr())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.reports.get(from, to)
      setData(res)
    } catch {
      // erro silencioso
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { load() }, [load])

  // ─── export ────────────────────────────────────────────────────────────────

  function doExportCSV() {
    if (!data) return
    exportCSV(
      `relatorio-fabriq-${from}-${to}`,
      ['Nº Ordem', 'Título', 'Cliente', 'Obra', 'Estado', 'Tempo Corte', 'Valor', 'Data'],
      data.orders.map(o => [
        o.orderNumber, o.title, o.client, o.project,
        STATUS_LABEL[o.status] ?? o.status,
        fmtTime(o.cuttingTime), fmt(o.value), fmtDate(o.createdAt),
      ])
    )
  }

  function doPrint(mode: 'print' | 'pdf') {
    if (!data) return
    printOrPDF(
      `Relatório FABRIQ.IA — ${fmtDate(from)} a ${fmtDate(to)}`,
      ['Nº Ordem', 'Título', 'Cliente', 'Estado', 'Tempo', 'Valor', 'Data'],
      data.orders.map(o => [
        o.orderNumber, o.title, o.client,
        STATUS_LABEL[o.status] ?? o.status,
        fmtTime(o.cuttingTime), fmt(o.value), fmtDate(o.createdAt),
      ]),
      mode
    )
  }

  const s = data?.summary

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Relatórios"
        sub="Análise de performance por período"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de período */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <Calendar className="h-4 w-4" style={{ color: T.muted }} />
              <input
                type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="text-sm bg-transparent outline-none" style={{ color: T.text }}
              />
              <span style={{ color: T.subtle }}>→</span>
              <input
                type="date" value={to} onChange={e => setTo(e.target.value)}
                className="text-sm bg-transparent outline-none" style={{ color: T.text }}
              />
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#EAB308', color: '#000' }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
            <button
              onClick={doExportCSV}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium hover:opacity-80"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}
            >
              <Download className="h-3.5 w-3.5" /> XLS
            </button>
            <button
              onClick={() => doPrint('pdf')}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium hover:opacity-80"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}
            >
              <Printer className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: T.muted }}>
          <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-yellow-400 animate-spin" />
          <span className="text-sm">A gerar relatório…</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="Total Ordens"    value={s!.totalOrders}           icon={FileText}    />
            <KpiCard label="Concluídas"      value={s!.byStatus.completed ?? 0} icon={TrendingUp} accent="#22C55E" />
            <KpiCard label="Em execução"     value={s!.byStatus.in_progress ?? 0} icon={Clock}  accent="#EAB308" />
            <KpiCard label="Tempo de Corte"  value={fmtTime(s!.totalCuttingTime)} icon={Cpu}    accent="#6366F1" />
            <KpiCard label="Receita Faturada" value={fmt(s!.revenue)}         icon={BarChart2}   accent="#22C55E"
              sub={`${s!.invoicedCount} fatura${s!.invoicedCount !== 1 ? 's' : ''}`} />
            <KpiCard label="Receita Pendente" value={fmt(s!.pendingRevenue)}  icon={TrendingUp}  accent="#EF4444"
              sub="ordens concluídas sem fatura" />
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Por status */}
            <div className="rounded-2xl p-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: T.muted }}>Ordens por Estado</p>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[key] }} />
                    <span className="text-sm" style={{ color: T.text }}>{label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: T.muted }}>
                    {s!.byStatus[key] ?? 0}
                  </span>
                </div>
              ))}
            </div>

            {/* Top clientes */}
            <div className="rounded-2xl p-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: T.muted }}>
                <Users className="h-4 w-4" /> Top Clientes
              </p>
              {data.topClients.length === 0
                ? <p className="text-sm" style={{ color: T.subtle }}>Sem dados no período</p>
                : data.topClients.map((c, i) => (
                  <MiniBar key={i} label={c.name} value={c.orders} max={data.topClients[0].orders} color="#EAB308" />
                ))
              }
            </div>
          </div>

          {/* Top máquinas */}
          {data.topMachines.length > 0 && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: T.muted }}>
                <Cpu className="h-4 w-4" /> Máquinas — Tempo de Corte
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.topMachines.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                    <span className="text-sm font-medium" style={{ color: T.text }}>{m.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: T.subtle }}>{m.stages} etapas</span>
                      <span className="text-sm font-bold" style={{ color: '#6366F1' }}>{fmtTime(m.cuttingTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela de ordens */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: T.surface }}>
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: T.muted }}>
                Lista de Ordens — {data.orders.length} resultado{data.orders.length !== 1 ? 's' : ''}
              </p>
            </div>
            {data.orders.length === 0
              ? <Empty icon={FileText} title="Sem ordens no período" sub="Ajuste o intervalo de datas" />
              : (
                <Table headers={['Nº', 'Título', 'Cliente', 'Obra', 'Estado', 'Tempo', 'Valor', 'Data']}>
                  {data.orders.map((o, i) => (
                    <Tr key={o.id} last={i === data.orders.length - 1}>
                      <Td><span className="font-mono text-xs font-bold" style={{ color: T.muted }}>{o.orderNumber}</span></Td>
                      <Td><span className="font-medium" style={{ color: T.text }}>{o.title}</span></Td>
                      <Td><span style={{ color: T.text }}>{o.client}</span></Td>
                      <Td><span style={{ color: T.subtle }}>{o.project}</span></Td>
                      <Td>
                        <Badge label={STATUS_LABEL[o.status] ?? o.status} color={STATUS_COLOR[o.status] ?? T.subtle} />
                      </Td>
                      <Td><span className="tabular-nums" style={{ color: T.muted }}>{fmtTime(o.cuttingTime)}</span></Td>
                      <Td>
                        <span className="font-bold tabular-nums" style={{ color: o.value > 0 ? '#22C55E' : T.subtle }}>
                          {o.value > 0 ? fmt(o.value) : '—'}
                        </span>
                      </Td>
                      <Td><span style={{ color: T.subtle }}>{fmtDate(o.createdAt)}</span></Td>
                    </Tr>
                  ))}
                </Table>
              )
            }
          </div>
        </>
      )}

      {!loading && !data && (
        <Empty icon={BarChart2} title="Erro ao carregar relatório" sub="Tente novamente" />
      )}
    </div>
  )
}
