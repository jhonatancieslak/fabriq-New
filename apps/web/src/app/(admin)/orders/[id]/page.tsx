// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Printer, X, Clock, CheckCircle2, CircleDot, AlertCircle, RefreshCw, FileText, Pencil, Ruler } from 'lucide-react'
import { api, type Order } from '@/lib/api'
import { T, Toast, Badge, Btn, ErrorMsg } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

function authHeaders(): Record<string, string> {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') ?? '' : ''
  return {
    ...(token  ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenant ? { 'X-Tenant-Slug': tenant } : {}),
  }
}

interface OrderFile {
  id: string; originalName: string; storagePath: string; previewPath: string | null
  fileType: string | null; sizeBytes: number; processed: boolean
  areaM2: number | null; bboxWidthMm: number | null; bboxHeightMm: number | null
  perimeterMm: number | null; previewUrl: string | null
}

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

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.subtle }}>{title}</h2>
      {children}
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [itemFiles, setItemFiles] = useState<Record<string, OrderFile[]>>({})  // itemId → files

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    api.orders.get(id)
      .then(order => {
        setOrder(order)
        // carregar ficheiros de cada item
        if (order.items?.length) {
          Promise.all(
            order.items.map(item =>
              fetch(`${API_URL}/api/v1/orders/${id}/items/${item.id}/files`, { headers: authHeaders() })
                .then(r => r.json())
                .then(files => ({ itemId: item.id, files: Array.isArray(files) ? files : [] }))
                .catch(() => ({ itemId: item.id, files: [] }))
            )
          ).then(results => {
            const map: Record<string, OrderFile[]> = {}
            results.forEach(r => { map[r.itemId] = r.files })
            setItemFiles(map)
          })
        }
      })
      .catch(() => setFetchError('Ordem não encontrada'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!confirm('Confirma o cancelamento desta ordem?')) return
    setCancelling(true)
    try {
      await api.orders.cancel(id)
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev)
      showToast('Ordem cancelada')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao cancelar', 'err')
    } finally { setCancelling(false) }
  }

  function handlePrint() {
    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'}/api/v1/pdf/orders/${id}/cutting-sheet`
    const w = window.open('about:blank', '_blank')
    if (!w) return
    fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant } })
      .then(r => r.text())
      .then(html => { w.document.write(html); w.document.close(); w.print() })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.yellow }} />
    </div>
  )
  if (fetchError || !order) return (
    <div className="p-8">
      <ErrorMsg msg={fetchError || 'Ordem não encontrada'} />
    </div>
  )

  const canCancel = !['completed', 'cancelled', 'invoiced'].includes(order.status)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div>
        <button onClick={() => router.push('/orders')}
          className="flex items-center gap-1.5 text-sm mb-3"
          style={{ color: T.subtle }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
          <ChevronLeft className="h-4 w-4" /> Ordens
        </button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>#{order.orderNumber}</h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: T.faint }}>{order.authCode}</p>
          </div>
          <Badge label={STATUS_LABEL[order.status] ?? order.status} color={STATUS_COLOR[order.status] ?? T.subtle} />
        </div>
      </div>

      {/* Info */}
      <SectionCard title="Informações">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs" style={{ color: T.faint }}>Cliente</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: T.text }}>{order.client?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: T.faint }}>Obra</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: T.text }}>
              {order.project?.code && <span className="font-mono text-xs mr-1.5" style={{ color: T.yellow }}>{order.project.code}</span>}
              {order.project?.name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: T.faint }}>Criada em</p>
            <p className="text-sm mt-0.5" style={{ color: T.muted }}>{fmtDateTime(order.createdAt)}</p>
          </div>
          {order.notes && (
            <div className="col-span-2">
              <p className="text-xs" style={{ color: T.faint }}>Observações</p>
              <p className="text-sm mt-0.5" style={{ color: T.muted }}>{order.notes}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Etapas */}
      <SectionCard title={`Etapas de Produção (${order.stages?.length ?? 0})`}>
        <div className="space-y-3">
          {(order.stages ?? []).map((stage, i) => (
            <div key={stage.id} className="flex items-start gap-4">
              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {stage.status === 'completed'   && <CheckCircle2 className="h-5 w-5" style={{ color: '#22C55E' }} />}
                {stage.status === 'in_progress' && <CircleDot className="h-5 w-5 animate-pulse" style={{ color: T.yellow }} />}
                {stage.status === 'pending'     && <Clock className="h-5 w-5" style={{ color: T.faint }} />}
                {stage.status === 'cancelled'   && <AlertCircle className="h-5 w-5" style={{ color: '#EF4444' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: T.text }}>
                    {i + 1}. {STAGE_TYPE_LABEL[stage.type] ?? stage.type}
                  </span>
                  <Badge label={STATUS_LABEL[stage.status] ?? stage.status} color={STATUS_COLOR[stage.status] ?? T.subtle} />
                </div>
                <p className="text-xs mt-0.5 space-x-2" style={{ color: T.subtle }}>
                  {(stage as { machine?: { name: string } }).machine?.name && <span>{(stage as { machine?: { name: string } }).machine!.name}</span>}
                  {stage.operator?.name && <span>· {stage.operator.name}</span>}
                  {stage.startedAt && <span>· iniciada {fmtDateTime(stage.startedAt)}</span>}
                  {stage.completedAt && <span>· concluída {fmtDateTime(stage.completedAt)}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Itens */}
      {order.items && order.items.length > 0 && (
        <SectionCard title={`Peças (${order.items.length})`}>
          <div className="space-y-4">
            {order.items.map((item) => {
              const files = itemFiles[item.id] ?? []
              const dxfFiles = files.filter(f => f.fileType === 'dxf' || f.fileType === 'dwg')
              return (
                <div key={item.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.divider}` }}>
                  {/* Cabeçalho da peça */}
                  <div className="flex items-center gap-4 px-4 py-3" style={{ background: T.bg }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{item.description}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.subtle }}>
                        {item.material?.name} · {item.thicknessMm} mm · {item.quantityPlanned} un.
                      </p>
                    </div>
                    {dxfFiles.length > 0 && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: T.subtle }}>
                        {dxfFiles[0].bboxWidthMm && (
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3 w-3" style={{ color: '#EAB308' }} />
                            {Number(dxfFiles[0].bboxWidthMm).toFixed(0)} × {Number(dxfFiles[0].bboxHeightMm).toFixed(0)} mm
                          </span>
                        )}
                        {dxfFiles[0].perimeterMm && (
                          <span>⌀ {(Number(dxfFiles[0].perimeterMm) / 1000).toFixed(2)} m</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ficheiros DXF */}
                  {files.length > 0 && (
                    <div className="divide-y" style={{ borderTop: `1px solid ${T.divider}`, '--tw-divide-opacity': 1 } as React.CSSProperties}>
                      {files.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                          {/* Preview */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                            style={{ background: '#07080A' }}>
                            {f.previewPath
                              ? <img src={`${API_URL}/uploads/${f.previewPath}`} alt={f.originalName} className="w-full h-full object-contain" />
                              : <FileText className="h-5 w-5" style={{ color: T.faint }} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: T.text }}>{f.originalName}</p>
                            <p className="text-xs" style={{ color: T.subtle }}>
                              {(f.sizeBytes / 1024).toFixed(0)} KB
                              {f.fileType && ` · ${f.fileType.toUpperCase()}`}
                              {!f.processed && ' · a processar…'}
                            </p>
                          </div>

                          {/* Editar DXF */}
                          {(f.fileType === 'dxf' || f.fileType === 'dwg') && f.processed && (
                            <Link href={`/orders/${id}/dxf-editor/${f.id}`}
                              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
                              style={{ background: T.yellowBg, color: T.yellow, border: `1px solid ${T.yellow}20` }}>
                              <Pencil className="h-3 w-3" /> Editar
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Btn onClick={handlePrint} variant="ghost">
          <Printer className="h-4 w-4" /> Folha de Corte
        </Btn>
        {canCancel && (
          <Btn onClick={handleCancel} disabled={cancelling} variant="danger">
            <X className="h-4 w-4" />
            {cancelling ? 'A cancelar…' : 'Cancelar Ordem'}
          </Btn>
        )}
      </div>
    </div>
  )
}
