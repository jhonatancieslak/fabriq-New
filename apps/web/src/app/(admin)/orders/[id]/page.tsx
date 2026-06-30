// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Printer, X, Clock, CheckCircle2, CircleDot, AlertCircle,
  RefreshCw, FileText, Pencil, Ruler, Timer, DollarSign, Layers, Zap,
  AlertTriangle, Eye,
} from 'lucide-react'
import { api, type Order, type OrderFile } from '@/lib/api'
import { confirmCancel } from '@/lib/confirm'
import { T, Toast, Badge, Btn, ErrorMsg } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', draft: 'Rascunho', in_progress: 'Em execução',
  completed: 'Concluída', cancelled: 'Cancelada', invoiced: 'Faturada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#9CA3AF', draft: '#64748B', in_progress: '#EAB308',
  completed: '#22C55E', cancelled: '#EF4444', invoiced: '#A78BFA',
}
const STAGE_TYPE_LABEL: Record<string, string> = {
  laser_cnc: 'Corte Laser CNC', cnc_router: 'Router CNC', plasma: 'Plasma',
  waterjet: 'Corte a Água', bending: 'Quinagem', guillotine: 'Guilhotina',
  welding: 'Soldadura', turning: 'Tornagem', milling: 'Fresagem', other: 'Outro',
}

function fmtDate(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(secs: number | undefined): string {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function InfoRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.subtle }}>{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: accent ?? T.text }}>{value}</p>
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.divider}` }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
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

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    api.orders.get(id)
      .then(setOrder)
      .catch(() => setFetchError('Ordem não encontrada'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!(await confirmCancel('Confirma o cancelamento desta ordem? Esta acção não pode ser desfeita.'))) return
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
    const url = `${API_URL}/api/v1/pdf/orders/${id}/cutting-sheet`
    const w = window.open('about:blank', '_blank')
    if (!w) return
    fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant } })
      .then(r => r.text())
      .then(html => {
        w.document.open()
        w.document.write(html)
        w.document.close()
        setTimeout(() => w.print(), 800)
      })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.yellow }} />
    </div>
  )
  if (fetchError || !order) return (
    <div className="p-8"><ErrorMsg msg={fetchError || 'Ordem não encontrada'} /></div>
  )

  const canCancel = !['completed', 'cancelled', 'invoiced'].includes(order.status)
  const totalCuttingTimeSecs = order.stages.reduce((acc, s) => acc + (s.cuttingTime ?? 0), 0)
  const allFiles = (order.items ?? []).flatMap(i => i.files ?? [])
  const totalAreaM2 = allFiles.reduce((acc, f) => {
    if (!f.areaM2) return acc
    const qty = order.items?.find(i => i.files?.some(ff => ff.id === f.id))?.quantityPlanned ?? 1
    return acc + Number(f.areaM2) * qty
  }, 0)
  const totalPieces = (order.items ?? []).reduce((acc, i) => acc + i.quantityPlanned, 0)
  const mainStage = order.stages.find(s => s.type === 'laser_cnc') ?? order.stages[0]
  const costValue = (order as unknown as { invoicing?: { costValue?: number } }).invoicing?.costValue

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Back + Header */}
      <div>
        <button onClick={() => router.push('/orders')}
          className="flex items-center gap-1.5 text-sm mb-3"
          style={{ color: T.subtle }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
          <ChevronLeft className="h-4 w-4" /> Ordens
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>{order.orderNumber}</h1>
              <Badge label={STATUS_LABEL[order.status] ?? order.status} color={STATUS_COLOR[order.status] ?? T.subtle} />
              {order.isUrgent && (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <AlertTriangle className="h-3 w-3" /> URGENTE
                </span>
              )}
            </div>
            <p className="text-xs font-mono mt-1" style={{ color: T.faint }}>{order.authCode}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
            <Btn onClick={handlePrint} variant="ghost">
              <Printer className="h-4 w-4" /> Imprimir
            </Btn>
            <Link href={`/orders/${id}/nesting`}>
              <Btn variant="ghost">
                <Layers className="h-4 w-4" /> Nesting
              </Btn>
            </Link>
            {order.project && order.projectId && (
              <Link href={`/projects/${order.projectId}`}>
                <Btn variant="ghost">
                  <Eye className="h-4 w-4" /> Ver Obra
                </Btn>
              </Link>
            )}
            {canCancel && (
              <Btn onClick={handleCancel} disabled={cancelling} variant="danger">
                <X className="h-4 w-4" />
                {cancelling ? 'A cancelar…' : 'Cancelar'}
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* Ficha de resumo — linha principal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Cliente / Obra */}
        <div className="col-span-2 rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Cliente" value={order.client?.name ?? '—'} />
            <InfoRow label="Obra"
              value={<>
                {order.project?.code && <span className="font-mono text-xs mr-1.5" style={{ color: T.yellow }}>{order.project.code}</span>}
                {order.project?.name ?? '—'}
              </>}
            />
            <InfoRow label="Solicitação" value={fmtDate(order.requestedAt ?? order.createdAt)} />
            <InfoRow label="Data de Corte" value={order.scheduledAt ? fmtDate(order.scheduledAt) : fmtDate(order.createdAt)} />
          </div>
        </div>

        {/* Operador / Máquina */}
        {mainStage && (
          <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <InfoRow label="Operador" value={mainStage.operator?.name ?? '—'} accent={T.yellow} />
            <div className="mt-3">
              <InfoRow label="Máquina" value={mainStage.machine?.name ?? '—'} />
            </div>
          </div>
        )}

        {/* Tempo real */}
        <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {totalCuttingTimeSecs > 0 ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: T.subtle }}>Tempo Real</p>
              <p className="text-2xl font-black" style={{ color: '#22C55E' }}>{fmtDuration(totalCuttingTimeSecs)}</p>
              {mainStage?.startedAt && mainStage?.completedAt && (
                <p className="text-xs mt-1" style={{ color: T.faint }}>
                  {fmtTime(mainStage.startedAt)} → {fmtTime(mainStage.completedAt)}
                </p>
              )}
            </>
          ) : (
            <InfoRow label="Criada em" value={fmtDateTime(order.createdAt)} />
          )}
        </div>
      </div>

      {/* Observações */}
      {order.notes && (
        <div className="rounded-xl px-4 py-3" style={{ background: `${T.yellow}10`, border: `1px solid ${T.yellow}30` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: T.yellow }}>Observações</p>
          <p className="text-sm" style={{ color: T.text }}>{order.notes}</p>
        </div>
      )}

      {/* Etapas */}
      <SectionCard title={`Etapas de Produção (${order.stages.length})`}>
        <div className="space-y-2">
          {(order.stages ?? []).map((stage, i) => (
            <div key={stage.id} className="flex items-start gap-3 rounded-xl p-3.5"
              style={{ background: T.bg, border: `1px solid ${T.divider}` }}>
              <div className="mt-0.5 flex-shrink-0">
                {stage.status === 'completed'   && <CheckCircle2 className="h-5 w-5" style={{ color: '#22C55E' }} />}
                {stage.status === 'in_progress' && <CircleDot className="h-5 w-5 animate-pulse" style={{ color: T.yellow }} />}
                {stage.status === 'pending'     && <Clock className="h-5 w-5" style={{ color: T.faint }} />}
                {stage.status === 'cancelled'   && <AlertCircle className="h-5 w-5" style={{ color: '#EF4444' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: T.text }}>
                    {i + 1}. {STAGE_TYPE_LABEL[stage.type] ?? stage.type}
                  </span>
                  <Badge label={STATUS_LABEL[stage.status] ?? stage.status} color={STATUS_COLOR[stage.status] ?? T.subtle} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {stage.machine?.name && (
                    <span className="text-xs" style={{ color: T.subtle }}>
                      <Zap className="inline h-3 w-3 mr-0.5" style={{ color: T.yellow }} />
                      {stage.machine.name}
                    </span>
                  )}
                  {stage.operator?.name && (
                    <span className="text-xs" style={{ color: T.subtle }}>
                      {stage.operator.name}
                    </span>
                  )}
                  {stage.cuttingTime !== undefined && stage.cuttingTime !== null && (
                    <span className="text-xs font-bold" style={{ color: '#22C55E' }}>
                      <Timer className="inline h-3 w-3 mr-0.5" />
                      {fmtDuration(stage.cuttingTime)}
                    </span>
                  )}
                  {stage.startedAt && stage.completedAt && (
                    <span className="text-xs" style={{ color: T.faint }}>
                      {fmtTime(stage.startedAt)} → {fmtTime(stage.completedAt)}
                    </span>
                  )}
                </div>
                {stage.notes && (
                  <p className="text-xs mt-1" style={{ color: T.subtle }}>{stage.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Peças */}
      {order.items && order.items.length > 0 && (
        <SectionCard title={`Peças a Cortar (${order.items.length})`}>
          <div className="space-y-3">
            {order.items.map((item) => {
              const files: OrderFile[] = item.files ?? []
              const dxfFiles = files.filter(f => f.fileType === 'dxf' || f.fileType === 'dwg')
              const primaryFile = dxfFiles[0] ?? null
              const itemArea = primaryFile?.areaM2 ? (Number(primaryFile.areaM2) * item.quantityPlanned) : null

              return (
                <div key={item.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.divider}` }}>
                  <div className="flex items-start gap-4 px-4 py-3" style={{ background: T.bg }}>
                    {/* Preview thumbnail */}
                    {primaryFile?.previewPath ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ background: '#07080A', border: `1px solid ${T.divider}` }}>
                        <img src={`${API_URL}/uploads/${primaryFile.previewPath}`}
                          alt={item.description} className="w-full h-full object-contain" />
                      </div>
                    ) : files.length > 0 ? (
                      <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: T.bg, border: `1px solid ${T.divider}` }}>
                        <FileText className="h-6 w-6" style={{ color: T.faint }} />
                      </div>
                    ) : null}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: T.text }}>{item.description}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.subtle }}>
                        {item.material?.name}
                        {item.thicknessMm && ` · ${item.thicknessMm} mm`}
                        {primaryFile?.bboxWidthMm && ` · ${Number(primaryFile.bboxWidthMm).toFixed(0)} × ${Number(primaryFile.bboxHeightMm ?? 0).toFixed(0)} mm`}
                      </p>
                      {item.notes && (
                        <p className="text-xs mt-1" style={{ color: T.subtle }}>{item.notes}</p>
                      )}
                    </div>

                    {/* Métricas da peça */}
                    <div className="flex gap-4 text-right flex-shrink-0">
                      <div>
                        <p className="text-xs" style={{ color: T.faint }}>Qtd.</p>
                        <p className="text-xl font-black" style={{ color: T.yellow }}>{item.quantityPlanned}</p>
                      </div>
                      {primaryFile?.areaM2 && (
                        <div>
                          <p className="text-xs" style={{ color: T.faint }}>Área unit.</p>
                          <p className="text-xs font-semibold" style={{ color: '#60A5FA' }}>
                            {Number(primaryFile.areaM2).toFixed(4)} m²
                          </p>
                          {itemArea && (
                            <>
                              <p className="text-xs mt-0.5" style={{ color: T.faint }}>× {item.quantityPlanned}</p>
                              <p className="text-xs font-bold" style={{ color: '#60A5FA' }}>
                                {itemArea.toFixed(4)} m²
                              </p>
                            </>
                          )}
                        </div>
                      )}
                      {primaryFile?.perimeterMm && (
                        <div>
                          <p className="text-xs" style={{ color: T.faint }}>Perímetro</p>
                          <p className="text-xs font-semibold" style={{ color: T.subtle }}>
                            {(Number(primaryFile.perimeterMm) / 1000).toFixed(2)} m
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ficheiros DXF */}
                  {files.length > 0 && (
                    <div style={{ borderTop: `1px solid ${T.divider}` }}>
                      {files.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-2.5"
                          style={{ borderBottom: `1px solid ${T.divider}` }}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                            style={{ background: '#07080A', border: `1px solid ${T.divider}` }}>
                            {f.previewPath
                              ? <img src={`${API_URL}/uploads/${f.previewPath}`} alt={f.originalName} className="w-full h-full object-contain" />
                              : <FileText className="h-4 w-4" style={{ color: T.faint }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: T.text }}>{f.originalName}</p>
                            <p className="text-xs" style={{ color: T.subtle }}>
                              {f.fileType?.toUpperCase()} · {(f.sizeBytes / 1024).toFixed(0)} KB
                              {f.areaM2 && ` · ${Number(f.areaM2).toFixed(4)} m²`}
                              {!f.processed && <span style={{ color: T.yellow }}> · a processar…</span>}
                            </p>
                          </div>
                          {(f.fileType === 'dxf' || f.fileType === 'dwg') && f.processed && (
                            <Link href={`/orders/${id}/dxf-editor/${f.id}`}
                              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
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

          {/* Totais */}
          <div className="mt-4 flex items-center justify-end gap-6 px-4 py-3 rounded-xl"
            style={{ background: T.bg, border: `1px solid ${T.divider}` }}>
            <div className="text-right">
              <p className="text-xs" style={{ color: T.faint }}>Total de Peças</p>
              <p className="text-lg font-black" style={{ color: T.yellow }}>{totalPieces}</p>
            </div>
            {totalAreaM2 > 0 && (
              <div className="text-right">
                <p className="text-xs" style={{ color: T.faint }}>Área Total Cortada</p>
                <p className="text-lg font-black" style={{ color: '#60A5FA' }}>{totalAreaM2.toFixed(4)} m²</p>
              </div>
            )}
            {costValue !== undefined && costValue !== null && (
              <div className="text-right">
                <p className="text-xs" style={{ color: T.faint }}>Custo Estimado (interno)</p>
                <p className="text-lg font-black" style={{ color: '#A78BFA' }}>€ {Number(costValue).toFixed(2)}</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Custo detalhado */}
      {costValue !== undefined && costValue !== null && (
        <SectionCard title="Custo Estimado (uso interno)">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: T.bg, border: `1px solid ${T.divider}` }}>
              <p className="text-xs" style={{ color: T.faint }}>Corte (máquina)</p>
              <p className="text-base font-black" style={{ color: '#A78BFA' }}>€ {Number(costValue).toFixed(2)}</p>
              {totalCuttingTimeSecs > 0 && (
                <p className="text-xs mt-0.5" style={{ color: T.faint }}>por minuto · {fmtDuration(totalCuttingTimeSecs)}</p>
              )}
            </div>
            <div className="rounded-xl p-3" style={{ background: T.bg, border: `1px solid ${T.divider}` }}>
              <p className="text-xs" style={{ color: T.faint }}>Material</p>
              <p className="text-base font-black" style={{ color: T.muted }}>€ 0.00</p>
              {totalAreaM2 > 0 && (
                <p className="text-xs mt-0.5" style={{ color: T.faint }}>{totalAreaM2.toFixed(4)} m²</p>
              )}
            </div>
            <div className="rounded-xl p-3" style={{ background: `${T.yellow}10`, border: `1px solid ${T.yellow}30` }}>
              <p className="text-xs font-bold" style={{ color: T.yellow }}>Total</p>
              <p className="text-xl font-black" style={{ color: T.yellow }}>€ {Number(costValue).toFixed(2)}</p>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
