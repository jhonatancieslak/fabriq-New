// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type NestingJob, type Order } from '@/lib/api'
import { Btn, Toast } from '@/components/ui/admin-ui'
import { ChevronLeft, Layers, AlertTriangle, CheckCircle2, RotateCcw, Calculator } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-yellow-500/60 bg-yellow-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Utilization Bar ──────────────────────────────────────────────────────────
function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? 'bg-green-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
      <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// ─── Mini Canvas Preview (SVG) ────────────────────────────────────────────────
const PALETTE = [
  '#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6',
  '#06B6D4','#F97316','#EC4899','#14B8A6','#6366F1',
]

function NestCanvas({ job }: { job: NestingJob }) {
  const sheetW = job.sheetWidthMm
  const sheetH = job.sheetLengthMm
  const sheets = job.sheetsNeeded
  const cols = Math.min(sheets, 3)
  const rows = Math.ceil(sheets / cols)

  const labels = Array.from(new Set(job.layout.map(p => p.label)))
  const colorMap: Record<string, string> = {}
  labels.forEach((l, i) => { colorMap[l] = PALETTE[i % PALETTE.length] })

  const SVG_W = 260
  const SVG_H = SVG_W * (sheetH / sheetW)
  const scaleX = SVG_W / sheetW
  const scaleY = SVG_H / sheetH

  return (
    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: sheets }, (_, si) => {
        const pieces = job.layout.filter(p => p.sheet === si)
        return (
          <div key={si} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2">
            <p className="text-xs text-yellow-400 text-center mb-2 font-medium">Chapa {si + 1}</p>
            <svg
              width="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="rounded border border-zinc-700"
              style={{ background: '#111214', display: 'block' }}
            >
              {/* Sheet border */}
              <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="none" stroke="#333" strokeWidth={1} />
              {/* Pieces */}
              {pieces.map((p, idx) => {
                const x = p.x * scaleX
                const y = p.y * scaleY
                const w = p.w * scaleX
                const h = p.h * scaleY
                const color = colorMap[p.label] ?? '#EAB308'
                return (
                  <g key={idx}>
                    <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity={0.8} stroke="#000" strokeWidth={0.5} />
                    {w > 20 && h > 12 && (
                      <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle"
                        fontSize={Math.min(8, w / 8)} fill="white" fontWeight="bold">
                        {p.label.slice(0, 10)}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
            <p className="text-xs text-zinc-500 text-center mt-1">{pieces.length} peça{pieces.length !== 1 ? 's' : ''}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Legenda de peças ──────────────────────────────────────────────────────────
function PieceLegend({ job }: { job: NestingJob }) {
  const labels = Array.from(new Set(job.layout.map(p => p.label)))
  const colorMap: Record<string, string> = {}
  labels.forEach((l, i) => { colorMap[l] = PALETTE[i % PALETTE.length] })

  const counts: Record<string, number> = {}
  job.layout.forEach(p => { counts[p.label] = (counts[p.label] ?? 0) + 1 })

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {labels.map(lbl => (
        <div key={lbl} className="flex items-center gap-1.5 text-xs">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colorMap[lbl] }} />
          <span className="text-zinc-300">{lbl}</span>
          <span className="text-zinc-500">×{counts[lbl]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NestingPage() {
  const { id: orderId } = useParams<{ id: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [job, setJob] = useState<NestingJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [sheetW, setSheetW] = useState('1500')
  const [sheetH, setSheetH] = useState('3000')
  const [gap, setGap] = useState('2')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadOrder = useCallback(async () => {
    try {
      const data = await api.orders.get(orderId)
      setOrder(data)
    } catch { /* silencioso */ }
  }, [orderId])

  const loadJob = useCallback(async () => {
    try {
      const data = await api.nesting.get(orderId)
      setJob(data)
      setSheetW(String(data.sheetWidthMm))
      setSheetH(String(data.sheetLengthMm))
      setGap(String(data.gapMm))
    } catch { /* sem job anterior */ }
  }, [orderId])

  useEffect(() => {
    loadOrder()
    loadJob()
  }, [loadOrder, loadJob])

  const calculate = async () => {
    const w = parseFloat(sheetW)
    const h = parseFloat(sheetH)
    const g = parseFloat(gap)
    if (!w || !h) return showToast('Preencha as dimensões da chapa', 'error')
    setLoading(true)
    try {
      const result = await api.nesting.calculate(orderId, { sheetWidthMm: w, sheetLengthMm: h, gapMm: g || 2 })
      setJob(result)
      showToast('Nesting calculado com sucesso')
    } catch (e: any) {
      showToast(e.message ?? 'Erro ao calcular nesting', 'error')
    } finally {
      setLoading(false)
    }
  }

  const hasDimensions = order?.items?.some(i => {
    const f = i.files?.[0]
    return (f?.bboxWidthMm && f.bboxHeightMm) || (i.widthMm && i.heightMm)
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/orders/${orderId}`)}
          className="p-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers size={20} className="text-yellow-400" />
            Nesting — {order?.orderNumber ?? '…'}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {order?.client?.name ?? ''}{order?.project ? ` · ${order.project.name}` : ''}
          </p>
        </div>
      </div>

      {/* Aviso sem dimensões */}
      {order && !hasDimensions && (
        <div className="mb-6 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">Peças sem dimensões</p>
            <p className="text-zinc-400 text-xs mt-1">
              Carregue ficheiros DXF nas peças ou preencha largura/altura manualmente para calcular o nesting.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de configuração */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Dimensões da Chapa</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Largura (mm)</label>
                <input type="number" value={sheetW} onChange={e => setSheetW(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Comprimento (mm)</label>
                <input type="number" value={sheetH} onChange={e => setSheetH(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Gap entre peças (mm)</label>
                <input type="number" value={gap} onChange={e => setGap(e.target.value)} min="0" max="50"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
              </div>
            </div>

            {/* Tamanhos rápidos */}
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-2">Tamanhos comuns</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '1000×2000', w: 1000, h: 2000 },
                  { label: '1250×2500', w: 1250, h: 2500 },
                  { label: '1500×3000', w: 1500, h: 3000 },
                  { label: '2000×4000', w: 2000, h: 4000 },
                ].map(sz => (
                  <button key={sz.label}
                    onClick={() => { setSheetW(String(sz.w)); setSheetH(String(sz.h)) }}
                    className={`text-xs rounded px-2 py-1.5 border transition-colors ${
                      sheetW === String(sz.w) && sheetH === String(sz.h)
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}>
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={calculate}
              disabled={loading}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold rounded-lg py-2.5 text-sm transition-colors">
              {loading ? (
                <><RotateCcw size={14} className="animate-spin" /> A calcular…</>
              ) : (
                <><Calculator size={14} /> Calcular Nesting</>
              )}
            </button>
          </div>

          {/* Peças da ordem */}
          {order?.items && order.items.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Peças ({order.items.length})</h2>
              <div className="space-y-2">
                {order.items.map(item => {
                  const f = item.files?.[0]
                  const w = f?.bboxWidthMm ?? item.widthMm
                  const h = f?.bboxHeightMm ?? item.heightMm
                  const hasDim = w && h
                  return (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className={`text-zinc-300 truncate max-w-[140px]`}>{item.description}</span>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span>×{item.quantityPlanned}</span>
                        {hasDim ? (
                          <span className="text-green-400">{w}×{h}</span>
                        ) : (
                          <span className="text-red-400">sem dim.</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Resultado */}
        <div className="lg:col-span-2 space-y-5">
          {job ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Chapas necessárias" value={String(job.sheetsNeeded)} highlight />
                <KpiCard
                  label="Aproveitamento"
                  value={`${job.utilizationPct}%`}
                  sub={job.utilizationPct >= 70 ? 'Bom' : job.utilizationPct >= 45 ? 'Médio' : 'Baixo'}
                />
                <KpiCard label="Peças/chapa" value={String(job.piecesPerSheet)} />
                <KpiCard
                  label="Peças sem lugar"
                  value={String(job.unplacedPieces)}
                  sub={job.unplacedPieces > 0 ? 'Aumentar chapa' : 'Todas colocadas'}
                />
              </div>

              {/* Barra de aproveitamento */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                  <span>Aproveitamento da chapa</span>
                  <span className="font-medium text-white">{job.utilizationPct}%</span>
                </div>
                <UtilBar pct={job.utilizationPct} />
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Aviso peças sem lugar */}
              {job.unplacedPieces > 0 && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 flex items-center gap-2 text-sm">
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                  <span className="text-red-300">
                    {job.unplacedPieces} peça(s) não cabem na chapa {job.sheetWidthMm}×{job.sheetLengthMm}mm. Experimente uma chapa maior.
                  </span>
                </div>
              )}

              {job.unplacedPieces === 0 && (
                <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5 flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-green-300">Todas as peças colocadas em {job.sheetsNeeded} chapa(s).</span>
                </div>
              )}

              {/* PNG do servidor ou SVG gerado no browser */}
              {job.previewUrl ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-white mb-3">Layout de Corte</h2>
                  <img
                    src={`${API_BASE}${job.previewUrl}`}
                    alt="Layout de nesting"
                    className="w-full rounded-lg border border-zinc-700"
                  />
                  <PieceLegend job={job} />
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-white mb-3">Layout de Corte</h2>
                  <NestCanvas job={job} />
                  <PieceLegend job={job} />
                </div>
              )}

              {job.createdAt && (
                <p className="text-xs text-zinc-600 text-right">
                  Calculado em {new Date(job.createdAt).toLocaleString('pt-PT')}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 bg-zinc-900 border border-zinc-800 rounded-xl text-center p-8">
              <Layers size={40} className="text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-medium">Sem resultado de nesting</p>
              <p className="text-zinc-600 text-sm mt-1">Configure as dimensões da chapa e clique em "Calcular Nesting"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
