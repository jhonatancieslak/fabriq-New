// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Clock, CheckCircle2, CircleDot, AlertCircle, RefreshCw,
  Package, Layers, Image as ImageIcon, X,
} from 'lucide-react'
import { api, type Order } from '@/lib/api'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em execução', completed: 'Concluída',
  cancelled: 'Cancelada', invoiced: 'Faturada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#9CA3AF', in_progress: '#EAB308', completed: '#22C55E',
  cancelled: '#EF4444', invoiced: '#A78BFA',
}
const STAGE_TYPE_LABEL: Record<string, string> = {
  laser_cnc: 'Corte Laser', cnc_router: 'Router CNC', plasma: 'Plasma',
  waterjet: 'Corte Água', bending: 'Quinagem', guillotine: 'Guilhotina',
  welding: 'Soldadura', turning: 'Tornagem', milling: 'Fresagem', other: 'Outro',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#111318', border: '1px solid #1a1f2e' }}>
      <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#374151' }}>{title}</h2>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: `${STATUS_COLOR[status] ?? '#9CA3AF'}15`, color: STATUS_COLOR[status] ?? '#9CA3AF' }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[status] ?? '#9CA3AF' }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export default function ReqOrdemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [order, setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    api.orders.get(id)
      .then(setOrder)
      .catch(() => setFetchError('Ordem não encontrada'))
      .finally(() => setLoading(false))
  }, [id])

  // Progresso global
  const totalStages     = order?.stages?.length ?? 0
  const completedStages = order?.stages?.filter(s => s.status === 'completed').length ?? 0
  const progressPct     = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-5 w-5 animate-spin" style={{ color: '#EAB308' }} />
    </div>
  )
  if (fetchError || !order) return (
    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
      {fetchError || 'Ordem não encontrada'}
    </div>
  )

  // Todas as fotos de todas as etapas
  const allPhotos = (order.stages ?? []).flatMap(s => s.photos ?? [])

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white opacity-60 hover:opacity-100 transition-opacity">
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox} alt="Foto"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="space-y-5">

        {/* Back */}
        <button
          onClick={() => router.push('/req/ordens')}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: '#4B5563' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
          onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}
        >
          <ChevronLeft className="h-4 w-4" /> As minhas ordens
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">#{order.orderNumber}</h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#374151' }}>{order.authCode}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Progresso global */}
        {totalStages > 0 && (
          <Card title="Progresso de produção">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: '#9CA3AF' }}>
                {completedStages} de {totalStages} etapa{totalStages !== 1 ? 's' : ''} concluída{completedStages !== 1 ? 's' : ''}
              </span>
              <span className="text-sm font-bold" style={{ color: progressPct === 100 ? '#22C55E' : '#EAB308' }}>
                {progressPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1a1f2e' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? '#22C55E' : '#EAB308',
                }}
              />
            </div>
          </Card>
        )}

        {/* Informações */}
        <Card title="Informações">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs" style={{ color: '#374151' }}>Cliente</p>
              <p className="text-sm font-medium mt-0.5 text-white">{order.client?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: '#374151' }}>Obra</p>
              <p className="text-sm font-medium mt-0.5 text-white">
                {order.project?.code && (
                  <span className="font-mono text-xs mr-1.5" style={{ color: '#EAB308' }}>{order.project.code}</span>
                )}
                {order.project?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: '#374151' }}>Criada em</p>
              <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>{fmtDateTime(order.createdAt)}</p>
            </div>
            {order.completedAt && (
              <div>
                <p className="text-xs" style={{ color: '#374151' }}>Concluída em</p>
                <p className="text-sm mt-0.5" style={{ color: '#22C55E' }}>{fmtDateTime(order.completedAt)}</p>
              </div>
            )}
            {order.notes && (
              <div className="col-span-2">
                <p className="text-xs" style={{ color: '#374151' }}>Observações</p>
                <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>{order.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Etapas */}
        {order.stages && order.stages.length > 0 && (
          <Card title={`Etapas de produção (${order.stages.length})`}>
            <div className="space-y-4">
              {order.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {stage.status === 'completed'   && <CheckCircle2 className="h-5 w-5" style={{ color: '#22C55E' }} />}
                    {stage.status === 'in_progress' && <CircleDot className="h-5 w-5 animate-pulse" style={{ color: '#EAB308' }} />}
                    {stage.status === 'pending'     && <Clock className="h-5 w-5" style={{ color: '#374151' }} />}
                    {stage.status === 'cancelled'   && <AlertCircle className="h-5 w-5" style={{ color: '#EF4444' }} />}
                  </div>
                  <div className="flex-1 min-w-0 pb-4" style={i < order.stages!.length - 1 ? { borderBottom: '1px solid #1a1f2e' } : {}}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        {i + 1}. {STAGE_TYPE_LABEL[stage.type] ?? stage.type}
                      </span>
                      <StatusBadge status={stage.status} />
                    </div>
                    <p className="text-xs mt-1 space-x-2" style={{ color: '#4B5563' }}>
                      {stage.startedAt && <span>Iniciada {fmtDateTime(stage.startedAt)}</span>}
                      {stage.completedAt && <span>· Concluída {fmtDateTime(stage.completedAt)}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Peças — sem preços */}
        {order.items && order.items.length > 0 && (
          <Card title={`Peças (${order.items.length})`}>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 pb-3"
                  style={i < order.items!.length - 1 ? { borderBottom: '1px solid #1a1f2e' } : {}}
                >
                  <Package className="h-4 w-4 flex-shrink-0" style={{ color: '#374151' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>
                      {item.material?.name ?? '—'}
                      {item.thicknessMm && <span> · {item.thicknessMm} mm</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0 text-white">×{item.quantityPlanned}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Fotos */}
        {allPhotos.length > 0 && (
          <Card title={`Fotos (${allPhotos.length})`}>
            <div className="grid grid-cols-3 gap-2">
              {allPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightbox(`${API_URL}/uploads/${photo.filename}`)}
                  className="aspect-square rounded-xl overflow-hidden relative group"
                  style={{ background: '#0D1117' }}
                >
                  <img
                    src={`${API_URL}/uploads/${photo.filename}`}
                    alt="Foto de produção"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <ImageIcon className="h-5 w-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
