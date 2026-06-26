// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Wrench, XCircle, Package, ArrowRight, Zap } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  pending:     { label: 'Pendente',     icon: Clock,         color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
  in_progress: { label: 'Em execução',  icon: Wrench,        color: '#EAB308', bg: 'rgba(234,179,8,0.08)' },
  completed:   { label: 'Concluída',    icon: CheckCircle2,  color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
  invoiced:    { label: 'Faturada',     icon: CheckCircle2,  color: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
  cancelled:   { label: 'Cancelada',    icon: XCircle,       color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
}

const STAGE_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Aguarda',     color: '#4B5563' },
  in_progress: { label: 'Em curso',   color: '#EAB308' },
  completed:   { label: 'Concluída',  color: '#22C55E' },
  skipped:     { label: 'Ignorada',   color: '#4B5563' },
}

const STAGE_TYPE_LABEL: Record<string, string> = {
  laser_cnc: 'Corte Laser CNC', cnc_router: 'CNC Router', plasma: 'Plasma',
  waterjet: 'Corte a Água', bending: 'Quinagem', guillotine: 'Guilhotina',
  welding: 'Soldadura', turning: 'Torneamento', milling: 'Fresagem', other: 'Outro',
}

interface StageInfo {
  id: string; stageNumber: number; type: string; status: string
  startedAt?: string; completedAt?: string; cuttingTime?: number
  machine?: { name: string }; operator?: { name: string }
}
interface OrderInfo {
  orderNumber: string; status: string; authCode: string; createdAt: string
  client: { name: string }
  project: { name: string; code: string; description?: string }
  stages: StageInfo[]
  items?: { id: string; description: string; quantityPlanned: number; quantityDone?: number; material?: { name: string }; thicknessMm: number }[]
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTime(d: string) {
  return new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function VerificarPage({ params }: { params: Promise<{ code: string }> }) {
  const [resolvedCode, setResolvedCode] = useState('')
  useEffect(() => { params.then(p => setResolvedCode(p.code)) }, [params])
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!resolvedCode) return
    fetch(`${API_URL}/api/v1/orders/auth/${resolvedCode}`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error ?? 'Não encontrado')))
      .then(setOrder)
      .catch(e => setError(typeof e === 'string' ? e : 'Erro ao carregar ordem'))
      .finally(() => setLoading(false))
  }, [resolvedCode])

  const status = order ? (STATUS_MAP[order.status] ?? STATUS_MAP.pending) : null

  return (
    <div className="min-h-screen" style={{ background: '#07080A', color: '#E5E7EB' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#111318' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EAB308' }}>
            <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-black text-lg uppercase tracking-tight">
            FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
          </span>
        </div>
        <p className="text-xs" style={{ color: '#6B7280' }}>Verificação de Ordem</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#0D0E12' }} />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
            <XCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <h2 className="text-lg font-black mb-2">Ordem não encontrada</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>{error}</p>
          </div>
        )}

        {order && !loading && status && (
          <>
            {/* Status principal */}
            <div className="rounded-2xl p-6" style={{ background: status.bg, border: `1px solid ${status.color}30` }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${status.color}20` }}>
                  <status.icon className="h-7 w-7" style={{ color: status.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: status.color }}>
                    Estado da Ordem
                  </p>
                  <p className="text-2xl font-black" style={{ color: '#F9FAFB' }}>{status.label}</p>
                </div>
              </div>
            </div>

            {/* Info da ordem */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Número</p>
                  <p className="text-sm font-bold font-mono" style={{ color: '#E5E7EB' }}>#{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Data</p>
                  <p className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{fmt(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Cliente</p>
                  <p className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{order.client.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Obra</p>
                  <p className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{order.project.code} — {order.project.name}</p>
                </div>
              </div>
              {order.project.description && (
                <p className="text-sm pt-2 border-t" style={{ color: '#9CA3AF', borderColor: '#111318' }}>
                  {order.project.description}
                </p>
              )}
            </div>

            {/* Etapas */}
            {order.stages.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: '#111318' }}>
                  <h2 className="text-sm font-bold" style={{ color: '#E5E7EB' }}>
                    Etapas de Produção
                  </h2>
                </div>
                <div>
                  {order.stages.map((stage, i) => {
                    const st = STAGE_STATUS[stage.status] ?? STAGE_STATUS.pending
                    return (
                      <div key={stage.id}
                        className="flex items-start gap-4 px-5 py-4"
                        style={i < order.stages.length - 1 ? { borderBottom: '1px solid #111318' } : {}}>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                            style={{ background: stage.status === 'completed' ? '#22C55E20' : '#1C1F26', color: stage.status === 'completed' ? '#22C55E' : '#6B7280' }}>
                            {stage.stageNumber}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>
                              {STAGE_TYPE_LABEL[stage.type] ?? stage.type}
                            </p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${st.color}15`, color: st.color }}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {stage.machine && (
                              <p className="text-xs" style={{ color: '#6B7280' }}>Máquina: {stage.machine.name}</p>
                            )}
                            {stage.operator && (
                              <p className="text-xs" style={{ color: '#6B7280' }}>Operador: {stage.operator.name}</p>
                            )}
                            {stage.completedAt && (
                              <p className="text-xs" style={{ color: '#6B7280' }}>
                                Concluída: {fmtTime(stage.completedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Peças */}
            {order.items && order.items.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: '#111318' }}>
                  <h2 className="text-sm font-bold" style={{ color: '#E5E7EB' }}>
                    Peças ({order.items.length})
                  </h2>
                </div>
                <div>
                  {order.items.map((item, i) => (
                    <div key={item.id}
                      className="flex items-center gap-4 px-5 py-3.5"
                      style={i < order.items!.length - 1 ? { borderBottom: '1px solid #111318' } : {}}>
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#1C1F26' }}>
                        <Package className="h-3.5 w-3.5" style={{ color: '#6B7280' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#E5E7EB' }}>{item.description}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {item.material?.name} · {item.thicknessMm}mm · {item.quantityPlanned} un
                          {item.quantityDone != null && ` (${item.quantityDone} concluídas)`}
                        </p>
                      </div>
                      {item.quantityDone != null && item.quantityDone >= item.quantityPlanned && (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#22C55E' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="rounded-2xl p-5 flex items-center justify-between"
              style={{ background: '#0D0E12', border: '1px solid #1C1F26' }}>
              <div>
                <p className="text-xs" style={{ color: '#4B5563' }}>Código de verificação</p>
                <p className="text-sm font-mono font-bold mt-0.5" style={{ color: '#6B7280' }}>
                  {order.authCode}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#4B5563' }}>
                Powered by FABRIQ.IA <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
