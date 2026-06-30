// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, RefreshCw, CheckCircle2, Clock, AlertCircle, Layers,
  Timer, Ruler, DollarSign, Zap, Plus, CheckCheck, RotateCcw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { T, Toast, Badge, Btn, ErrorMsg } from '@/components/ui/admin-ui'
import Swal from 'sweetalert2'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberta', in_progress: 'Em execução', completed: 'Concluída', invoiced: 'Faturada',
}
const STATUS_COLOR: Record<string, string> = {
  open: '#9CA3AF', in_progress: '#EAB308', completed: '#22C55E', invoiced: '#A78BFA',
}
const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', draft: 'Rascunho', in_progress: 'Em execução',
  completed: 'Concluída', cancelled: 'Cancelada', invoiced: 'Faturada',
}
const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: '#9CA3AF', draft: '#64748B', in_progress: '#EAB308',
  completed: '#22C55E', cancelled: '#EF4444', invoiced: '#A78BFA',
}

function fmtDateTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(secs: number): string {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? `${accent}18` : T.bg }}>
        <span style={{ color: accent ?? T.subtle }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: T.subtle }}>{label}</p>
        <p className="text-lg font-black mt-0.5 leading-tight" style={{ color: accent ?? T.text }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: T.faint }}>{sub}</p>}
      </div>
    </div>
  )
}

interface ProjectMetrics {
  totalOrders: number
  completedOrders: number
  totalPieces: number
  totalCuttingTimeSecs: number
  totalAreaM2: number
  totalCost: number
}

interface ProjectDetail {
  id: string
  code: string
  name: string
  description?: string
  status: string
  createdAt: string
  client: { id: string; name: string }
  serviceOrders: Array<{
    id: string
    orderNumber: string
    status: string
    createdAt: string
    completedAt?: string
    stages: Array<{ machine?: { name: string }; operator?: { name: string }; cuttingTime?: number }>
    items: Array<{ quantityPlanned: number; description: string; material?: { name: string }; thicknessMm: number }>
    invoicing?: { costValue?: number; status: string } | null
  }>
  metrics: ProjectMetrics
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  function load() {
    setLoading(true)
    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    fetch(`${API_URL}/api/v1/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setProject)
      .catch(() => setFetchError('Obra não encontrada'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  async function handleComplete() {
    const result = await Swal.fire({
      title: 'Concluir obra?',
      html: `<p style="color:#94a3b8;font-size:14px">A obra <strong style="color:#EAB308">${project?.code}</strong> será marcada como concluída e ficará disponível para faturação.<br><br>Esta ação pode ser revertida.</p>`,
      icon: 'question',
      background: '#0D0E11',
      color: '#F1F5F9',
      showCancelButton: true,
      confirmButtonText: 'Sim, concluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#22C55E',
      cancelButtonColor: '#374151',
    })
    if (!result.isConfirmed) return

    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    try {
      const r = await fetch(`${API_URL}/api/v1/projects/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant },
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.error ?? 'Erro')
      }
      showToast('Obra concluída com sucesso')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao concluir', 'err')
    }
  }

  async function handleReopen() {
    const result = await Swal.fire({
      title: 'Reabrir obra?',
      background: '#0D0E11', color: '#F1F5F9',
      showCancelButton: true, confirmButtonText: 'Sim, reabrir',
      confirmButtonColor: '#EAB308', cancelButtonColor: '#374151',
    })
    if (!result.isConfirmed) return

    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    try {
      await fetch(`${API_URL}/api/v1/projects/${id}/reopen`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant },
      })
      showToast('Obra reaberta')
      load()
    } catch {
      showToast('Erro ao reabrir', 'err')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.yellow }} />
    </div>
  )
  if (fetchError || !project) return <div className="p-8"><ErrorMsg msg={fetchError || 'Obra não encontrada'} /></div>

  const m = project.metrics
  const canComplete = !['completed', 'invoiced'].includes(project.status)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Back */}
      <button onClick={() => router.push('/projects')}
        className="flex items-center gap-1.5 text-sm mb-1"
        style={{ color: T.subtle }}
        onMouseEnter={e => e.currentTarget.style.color = T.text}
        onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
        <ChevronLeft className="h-4 w-4" /> Obras
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold px-2 py-0.5 rounded" style={{ background: T.yellowBg, color: T.yellow }}>
              {project.code}
            </span>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>{project.name}</h1>
            <Badge label={STATUS_LABEL[project.status] ?? project.status} color={STATUS_COLOR[project.status] ?? T.subtle} />
          </div>
          <p className="text-sm mt-1" style={{ color: T.subtle }}>
            {project.client.name} · Criada em {fmtDateTime(project.createdAt).split(',')[0]}
          </p>
          {project.description && (
            <p className="text-sm mt-1.5" style={{ color: T.muted }}>{project.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/orders/new?projectId=${project.id}`}>
            <Btn variant="primary">
              <Plus className="h-4 w-4" /> Nova Ordem
            </Btn>
          </Link>
          {canComplete ? (
            <Btn onClick={handleComplete} variant="ghost">
              <CheckCheck className="h-4 w-4" /> Concluir Obra
            </Btn>
          ) : (
            project.status === 'completed' && (
              <Btn onClick={handleReopen} variant="ghost">
                <RotateCcw className="h-4 w-4" /> Reabrir
              </Btn>
            )
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Ordens"
          value={`${m.completedOrders}/${m.totalOrders}`}
          sub="concluídas / total"
          icon={<Layers className="h-4 w-4" />}
          accent={T.yellow}
        />
        <KpiCard
          label="Total de Peças"
          value={String(m.totalPieces)}
          icon={<Zap className="h-4 w-4" />}
          accent="#60A5FA"
        />
        {m.totalCuttingTimeSecs > 0 && (
          <KpiCard
            label="Tempo Total de Corte"
            value={fmtDuration(m.totalCuttingTimeSecs)}
            icon={<Timer className="h-4 w-4" />}
            accent="#22C55E"
          />
        )}
        {m.totalAreaM2 > 0 && (
          <KpiCard
            label="Área Total Cortada"
            value={`${m.totalAreaM2.toFixed(4)} m²`}
            icon={<Ruler className="h-4 w-4" />}
            accent="#A78BFA"
          />
        )}
        {m.totalCost > 0 && (
          <KpiCard
            label="Custo Acumulado"
            value={`€ ${m.totalCost.toFixed(2)}`}
            sub="uso interno"
            icon={<DollarSign className="h-4 w-4" />}
            accent="#F59E0B"
          />
        )}
      </div>

      {/* Progresso das ordens */}
      {m.totalOrders > 0 && (
        <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Progresso da Obra</span>
            <span className="text-xs font-semibold" style={{ color: T.yellow }}>
              {Math.round((m.completedOrders / m.totalOrders) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: T.bg }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(m.completedOrders / m.totalOrders) * 100}%`, background: '#22C55E' }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: T.faint }}>
            {m.completedOrders} de {m.totalOrders} ordens concluídas
          </p>
        </div>
      )}

      {/* Lista de ordens */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>
            Ordens de Serviço ({project.serviceOrders.length})
          </h2>
        </div>

        {project.serviceOrders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm" style={{ color: T.faint }}>Nenhuma ordem criada para esta obra.</p>
            <Link href={`/orders/new?projectId=${project.id}`} className="inline-block mt-3">
              <Btn variant="primary">
                <Plus className="h-4 w-4" /> Criar primeira ordem
              </Btn>
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-color': T.divider } as React.CSSProperties}>
            {project.serviceOrders.map(order => {
              const mainStage = order.stages[0]
              const totalQty = order.items.reduce((acc, i) => acc + i.quantityPlanned, 0)
              const totalTime = order.stages.reduce((acc, s) => acc + (s.cuttingTime ?? 0), 0)

              return (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: `1px solid ${T.divider}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {order.status === 'completed' && <CheckCircle2 className="h-5 w-5" style={{ color: '#22C55E' }} />}
                    {order.status === 'in_progress' && <Zap className="h-5 w-5" style={{ color: T.yellow }} />}
                    {order.status === 'pending' && <Clock className="h-5 w-5" style={{ color: T.faint }} />}
                    {order.status === 'cancelled' && <AlertCircle className="h-5 w-5" style={{ color: '#EF4444' }} />}
                    {order.status === 'invoiced' && <CheckCircle2 className="h-5 w-5" style={{ color: '#A78BFA' }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: T.text }}>{order.orderNumber}</span>
                      <Badge label={ORDER_STATUS_LABEL[order.status] ?? order.status} color={ORDER_STATUS_COLOR[order.status] ?? T.subtle} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {mainStage?.machine?.name && (
                        <span className="text-xs" style={{ color: T.subtle }}>{mainStage.machine.name}</span>
                      )}
                      {mainStage?.operator?.name && (
                        <span className="text-xs" style={{ color: T.subtle }}>· {mainStage.operator.name}</span>
                      )}
                      {totalQty > 0 && (
                        <span className="text-xs" style={{ color: T.faint }}>· {totalQty} peças</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 space-y-0.5">
                    {totalTime > 0 && (
                      <p className="text-xs font-semibold" style={{ color: '#22C55E' }}>
                        <Timer className="inline h-3 w-3 mr-0.5" />{fmtDuration(totalTime)}
                      </p>
                    )}
                    {order.invoicing?.costValue && (
                      <p className="text-xs" style={{ color: '#A78BFA' }}>€ {Number(order.invoicing.costValue).toFixed(2)}</p>
                    )}
                    <p className="text-xs" style={{ color: T.faint }}>{fmtDateTime(order.createdAt).split(',')[0]}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Totais acumulados */}
        {m.totalCost > 0 && (
          <div className="px-5 py-3 flex items-center justify-end gap-6" style={{ borderTop: `1px solid ${T.divider}`, background: T.bg }}>
            {m.totalAreaM2 > 0 && (
              <div className="text-right">
                <p className="text-xs" style={{ color: T.faint }}>Área Total</p>
                <p className="text-base font-black" style={{ color: '#60A5FA' }}>{m.totalAreaM2.toFixed(4)} m²</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs" style={{ color: T.faint }}>Custo Total (interno)</p>
              <p className="text-base font-black" style={{ color: '#F59E0B' }}>€ {m.totalCost.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
