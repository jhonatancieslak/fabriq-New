// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Toast } from '@/components/ui/admin-ui'
import { exportCSV, printOrPDF } from '@/components/ui/admin-ui'
import {
  Factory, Clock, Layers, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, RefreshCw, Users, BarChart3, Wrench, Download, Printer,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

const request = async (path: string) => {
  const token = localStorage.getItem('fabriq_token')
  const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant },
  })
  if (!res.ok) throw new Error('Erro ao carregar')
  return res.json()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtHMS(secs: number | null): string {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

function OccupationBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? '#22c55e' : pct >= 45 ? '#eab308' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-zinc-800 rounded-full h-2.5 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-10 text-right" style={{ color }}>{pct}%</span>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, warn }: { icon: any; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${warn ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={warn ? 'text-red-400' : 'text-yellow-400'} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className={`text-2xl font-black ${warn ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProductionData {
  period: { from: string; to: string }
  summary: {
    totalOrders: number; totalPieces: number; totalAreaM2: number
    totalTimeSecs: number; totalTimeFormatted: string; totalCost: number
    ordersWithEstimate: number; ordersOverTime: number; avgDeviationPct: number | null
  }
  operatorStats: Array<{
    name: string; orders: number; pieces: number; secs: number; area: number
    avgSecsPer: number; timeFormatted: string; avgTimeFormatted: string
    ordersOverTime: number; overTimeRate: number
  }>
  weekOccupation: Array<{ label: string; secs: number; orders: number; pct: number; timeFormatted: string }>
  materialConsumption: Array<{ name: string; type: string; thicknessMm: number; area: number; orders: number; pieces: number }>
  overTime: Array<{
    orderId: string; orderNumber: string; client: string; project: string
    realSecs: number; estimatedSecs: number; deviationSecs: number; deviationPct: number
    realFmt: string; estFmt: string; devFmt: string
  }>
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = now.toISOString().slice(0, 10)

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [data, setData] = useState<ProductionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [tab, setTab] = useState<'operator' | 'week' | 'material' | 'overtime'>('operator')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await request(`/api/v1/production?from=${from}&to=${to}`)
      setData(d)
    } catch {
      setToast({ msg: 'Erro ao carregar relatório', type: 'error' })
    } finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const s = data?.summary

  // ── exports ──────────────────────────────────────────────────────────────
  const exportOvertimeCSV = () => {
    if (!data) return
    exportCSV('overtime_producao', ['Ordem', 'Cliente', 'Obra', 'Real', 'Estimado', 'Desvio', 'Desvio %'],
      data.overTime.map(r => [r.orderNumber, r.client, r.project, r.realFmt, r.estFmt, r.devFmt, r.deviationPct + '%']))
  }

  const printOvertime = () => {
    if (!data) return
    printOrPDF('Ordens Fora do Estimado', ['Ordem', 'Cliente', 'Obra', 'Real', 'Estimado', 'Desvio', 'Desvio %'],
      data.overTime.map(r => [r.orderNumber, r.client, r.project, r.realFmt, r.estFmt, r.devFmt, r.deviationPct + '%']), 'print')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Factory size={22} className="text-yellow-400" /> Relatório de Produção
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Análise real do chão de fábrica — desvio, ocupação, consumo de chapa</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
          <span className="text-zinc-600 text-sm">até</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold rounded-lg px-4 py-2 text-sm transition-colors">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Atualizar
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center h-48">
          <RefreshCw size={20} className="animate-spin text-yellow-400" />
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiCard icon={BarChart3} label="Ordens concluídas" value={String(s!.totalOrders)} />
            <KpiCard icon={Layers} label="Peças cortadas" value={String(s!.totalPieces)} />
            <KpiCard icon={Wrench} label="Área total" value={`${s!.totalAreaM2} m²`} />
            <KpiCard icon={Clock} label="Tempo de corte" value={s!.totalTimeFormatted} />
            <KpiCard icon={TrendingUp} label="Receita estimada" value={`€ ${s!.totalCost.toFixed(2)}`}
              sub="baseado nos parâmetros de máquina" />
            <KpiCard
              icon={s!.ordersOverTime > 0 ? TrendingDown : CheckCircle2}
              label="Ordens fora do estimado"
              value={`${s!.ordersOverTime} / ${s!.ordersWithEstimate || '—'}`}
              sub={s!.avgDeviationPct != null ? `desvio médio +${s!.avgDeviationPct}%` : 'sem dados de estimado'}
              warn={s!.ordersOverTime > 0}
            />
          </div>

          {/* Aviso sem tempo estimado */}
          {s!.ordersWithEstimate === 0 && (
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
              <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 text-sm font-medium">Tempo estimado não preenchido</p>
                <p className="text-zinc-400 text-xs mt-1">
                  Para análise de desvio (real vs estimado), preencha o campo "Tempo Estimado" ao criar as ordens.
                  Este é o tempo programado no CypeCut/software de nesting.
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-zinc-800">
            <div className="flex gap-0">
              {([
                ['operator', <Users size={14} />, 'Por Operador'],
                ['week', <BarChart3 size={14} />, 'Ocupação Semanal'],
                ['material', <Layers size={14} />, 'Consumo de Chapa'],
                ['overtime', <TrendingDown size={14} />, `Fora do Estimado (${s!.ordersOverTime})`],
              ] as const).map(([id, icon, label]) => (
                <button key={id} onClick={() => setTab(id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === id ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Por operador */}
          {tab === 'operator' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Operador', 'Ordens', 'Peças', 'Área m²', 'Tempo Total', 'Tempo Médio/Ordem', 'Fora do Estimado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.operatorStats.map((op, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-white">{op.name}</td>
                      <td className="px-4 py-3 text-zinc-300">{op.orders}</td>
                      <td className="px-4 py-3 text-zinc-300">{op.pieces}</td>
                      <td className="px-4 py-3 text-zinc-300">{op.area.toFixed(2)} m²</td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{op.timeFormatted}</td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{op.avgTimeFormatted}</td>
                      <td className="px-4 py-3">
                        {op.ordersOverTime > 0 ? (
                          <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
                            <AlertTriangle size={12} /> {op.ordersOverTime} ({op.overTimeRate}%)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-green-400 text-sm">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.operatorStats.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Sem dados no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Ocupação semanal */}
          {tab === 'week' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <p className="text-xs text-zinc-500">Baseado em 5 dias × 8h disponíveis por semana</p>
              {data.weekOccupation.length === 0 && (
                <p className="text-zinc-500 text-center py-8">Sem dados no período</p>
              )}
              {data.weekOccupation.map((w, i) => (
                <div key={i} className="grid grid-cols-[100px_1fr_80px_80px] items-center gap-4">
                  <span className="text-sm text-zinc-400 font-medium">{w.label}</span>
                  <OccupationBar pct={w.pct} />
                  <span className="text-xs text-zinc-500 text-right font-mono">{w.timeFormatted}</span>
                  <span className="text-xs text-zinc-500 text-right">{w.orders} ordem{w.orders !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Consumo de material */}
          {tab === 'material' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Material', 'Espessura', 'Área (m²)', 'Ordens', 'Peças', '% do Total'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalArea = data.materialConsumption.reduce((s, m) => s + m.area, 0)
                    return data.materialConsumption.map((m, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                        <td className="px-4 py-3 text-zinc-300 font-mono">{m.thicknessMm > 0 ? `${m.thicknessMm} mm` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-yellow-400 font-bold font-mono">{m.area.toFixed(3)} m²</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{m.orders}</td>
                        <td className="px-4 py-3 text-zinc-300">{m.pieces}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-zinc-800 rounded-full h-1.5">
                              <div className="bg-yellow-500 h-1.5 rounded-full"
                                style={{ width: `${totalArea > 0 ? Math.round(m.area / totalArea * 100) : 0}%` }} />
                            </div>
                            <span className="text-xs text-zinc-500">
                              {totalArea > 0 ? Math.round(m.area / totalArea * 100) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  })()}
                  {data.materialConsumption.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Sem dados no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Fora do estimado */}
          {tab === 'overtime' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-zinc-500">Ordenado por desvio % (maior primeiro). Apenas ordens com tempo estimado preenchido.</p>
                <div className="flex gap-2">
                  <button onClick={exportOvertimeCSV} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors">
                    <Download size={12} /> XLS
                  </button>
                  <button onClick={printOvertime} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors">
                    <Printer size={12} /> Imprimir
                  </button>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {['Ordem', 'Cliente', 'Obra', 'Real', 'Estimado', 'Desvio', 'Desvio %'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.overTime.map((r, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-mono text-yellow-400 font-medium">{r.orderNumber}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.client}</td>
                        <td className="px-4 py-3 text-zinc-400 text-sm">{r.project}</td>
                        <td className="px-4 py-3 font-mono text-white">{r.realFmt}</td>
                        <td className="px-4 py-3 font-mono text-zinc-400">{r.estFmt}</td>
                        <td className="px-4 py-3 font-mono text-red-400 font-medium">+{r.devFmt}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            r.deviationPct > 50 ? 'bg-red-500/20 text-red-400' :
                            r.deviationPct > 20 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>+{r.deviationPct}%</span>
                        </td>
                      </tr>
                    ))}
                    {data.overTime.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-green-400">
                          <CheckCircle2 size={20} className="mx-auto mb-2" />
                          Nenhuma ordem fora do estimado no período. Excelente!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
