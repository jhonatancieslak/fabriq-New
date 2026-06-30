// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { RefreshCw, Plus, Clock, Zap, CheckCircle2, Calendar, AlertTriangle, ChevronDown } from 'lucide-react'
import { T, Toast, Badge } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

interface KanbanOrder {
  id: string
  orderNumber: string
  notes?: string
  isUrgent?: boolean
  scheduledAt?: string
  completedAt?: string
  createdAt: string
  client?: { name: string }
  project?: { id: string; code: string; name: string }
  requester?: { name: string }
  stages: { machine?: { name: string }; operator?: { name: string } }[]
  items: { id: string }[]
}

interface KanbanData {
  pendente: KanbanOrder[]
  programado: KanbanOrder[]
  emCorte: KanbanOrder[]
  concluido: KanbanOrder[]
}

const COLS: { key: keyof KanbanData; label: string; icon: React.ElementType; headerBg: string; colBg: string; borderColor: string }[] = [
  { key: 'pendente',   label: 'Pendente',   icon: Clock,         headerBg: '#B45309', colBg: 'rgba(180,83,9,0.08)',   borderColor: '#92400E' },
  { key: 'programado', label: 'Programado', icon: Calendar,      headerBg: '#1D4ED8', colBg: 'rgba(29,78,216,0.08)',  borderColor: '#1E3A8A' },
  { key: 'emCorte',    label: 'Em Corte',   icon: Zap,           headerBg: '#0E7490', colBg: 'rgba(14,116,144,0.08)', borderColor: '#164E63' },
  { key: 'concluido',  label: 'Concluído',  icon: CheckCircle2,  headerBg: '#15803D', colBg: 'rgba(21,128,61,0.08)',  borderColor: '#14532D' },
]

function fmtDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
}

function KanbanCard({ order, onDragStart, onClick }: {
  order: KanbanOrder
  onDragStart: (e: React.DragEvent, order: KanbanOrder) => void
  onClick: (order: KanbanOrder) => void
}) {
  const machine = order.stages[0]?.machine?.name
  const operator = order.stages[0]?.operator?.name

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, order)}
      onClick={() => onClick(order)}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing select-none transition-all hover:translate-y-[-1px]"
      style={{
        background: T.surface,
        border: `1px solid ${order.isUrgent ? '#EF4444' : T.border}`,
        borderLeft: order.isUrgent ? '3px solid #EF4444' : `1px solid ${T.border}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-xs font-bold font-mono" style={{ color: T.yellow }}>{order.orderNumber}</span>
        {order.isUrgent && (
          <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
            <AlertTriangle className="h-2.5 w-2.5" />URGENTE
          </span>
        )}
      </div>

      {order.project && (
        <p className="text-xs font-semibold truncate mb-0.5" style={{ color: T.text }}>
          {order.project.code}
        </p>
      )}
      {order.client && (
        <p className="text-xs truncate mb-1" style={{ color: T.subtle }}>{order.client.name}</p>
      )}
      {order.notes && (
        <p className="text-xs truncate mb-1.5 italic" style={{ color: T.muted }}>{order.notes}</p>
      )}

      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {machine && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(234,179,8,0.12)', color: T.yellow }}>
              {machine}
            </span>
          )}
          {operator && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: T.bg, color: T.subtle }}>
              {operator}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: T.faint }}>
          {order.items.length} peça{order.items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {order.scheduledAt && (
        <div className="flex items-center gap-1 mt-1.5">
          <Calendar className="h-3 w-3" style={{ color: '#60A5FA' }} />
          <span className="text-xs" style={{ color: '#60A5FA' }}>{fmtDate(order.scheduledAt)}</span>
        </div>
      )}
    </div>
  )
}

function KanbanColumn({ col, orders, onDrop, onDragOver, onDragStart, onCardClick, draggingId }: {
  col: typeof COLS[0]
  orders: KanbanOrder[]
  onDrop: (e: React.DragEvent, colKey: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, order: KanbanOrder) => void
  onCardClick: (order: KanbanOrder) => void
  draggingId: string | null
}) {
  const Icon = col.icon
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden min-h-[calc(100vh-180px)]"
      style={{ background: col.colBg, border: `1px solid ${col.borderColor}` }}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); onDragOver(e) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { setIsDragOver(false); onDrop(e, col.key) }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: col.headerBg }}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white uppercase tracking-wide">{col.label}</span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'rgba(255,255,255,0.25)' }}>
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className="flex-1 p-3 space-y-2.5 overflow-y-auto transition-colors"
        style={{ minHeight: 120, background: isDragOver ? 'rgba(234,179,8,0.05)' : undefined }}
      >
        {orders.length === 0 ? (
          <div className="text-center py-8" style={{ color: T.faint }}>
            <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Arraste ordens para aqui</p>
          </div>
        ) : orders.map(o => (
          <div key={o.id} style={{ opacity: draggingId === o.id ? 0.4 : 1 }}>
            <KanbanCard order={o} onDragStart={onDragStart} onClick={onCardClick} />
          </div>
        ))}

        {col.key === 'concluido' && orders.length === 30 && (
          <p className="text-center text-xs py-2" style={{ color: T.faint }}>Mostrando últimas 30 ordens</p>
        )}
      </div>
    </div>
  )
}

// Modal de confirmação ao mover para "Programado"
function ScheduleModal({ order, onConfirm, onCancel }: {
  order: KanbanOrder
  onConfirm: (date: string) => void
  onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(order.scheduledAt ? order.scheduledAt.split('T')[0] : today)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div>
          <h3 className="font-bold text-base" style={{ color: T.text }}>Programar ordem</h3>
          <p className="text-sm mt-1" style={{ color: T.subtle }}>{order.orderNumber}</p>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: T.subtle }}>Data prevista de corte</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            min={today}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.subtle }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(date)} className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{ background: T.yellow, color: T.bg }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const [data, setData] = useState<KanbanData>({ pendente: [], programado: [], emCorte: [], concluido: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [draggingOrder, setDraggingOrder] = useState<KanbanOrder | null>(null)
  const [scheduleModal, setScheduleModal] = useState<{ order: KanbanOrder } | null>(null)
  const pendingMove = useRef<{ order: KanbanOrder; col: string } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    try {
      const r = await fetch(`${API_URL}/api/v1/orders/kanban`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant },
      })
      const d = await r.json()
      setData({
        pendente: d.pendente ?? [],
        programado: d.programado ?? [],
        emCorte: d.emCorte ?? [],
        concluido: d.concluido ?? [],
      })
    } catch {
      showToast('Erro ao carregar kanban', 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function moveOrder(order: KanbanOrder, coluna: string, scheduledAt?: string) {
    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    try {
      const r = await fetch(`${API_URL}/api/v1/orders/${order.id}/kanban-move`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Slug': tenant,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coluna, scheduledAt }),
      })
      if (!r.ok) throw new Error()
      showToast('Ordem movida')
      load()
    } catch {
      showToast('Erro ao mover ordem', 'err')
    }
  }

  function handleDragStart(e: React.DragEvent, order: KanbanOrder) {
    setDraggingOrder(order)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent, colKey: string) {
    e.preventDefault()
    if (!draggingOrder) return
    const order = draggingOrder
    setDraggingOrder(null)

    // Já está na coluna certa
    const current = COLS.findIndex(c => (c.key === 'emCorte' ? 'emCorte' : c.key) === colKey)
    const colMap: Record<string, string> = { pendente: 'pendente', programado: 'programado', emCorte: 'em_corte', concluido: 'concluido' }
    const coluna = colMap[colKey]

    if (colKey === 'programado') {
      pendingMove.current = { order, col: coluna }
      setScheduleModal({ order })
    } else {
      moveOrder(order, coluna)
    }
  }

  function handleCardClick(order: KanbanOrder) {
    window.open(`/orders/${order.id}`, '_blank')
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: T.bg }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${T.divider}` }}>
        <div>
          <h1 className="text-lg font-black" style={{ color: T.text }}>Kanban de Ordens</h1>
          <p className="text-xs mt-0.5" style={{ color: T.subtle }}>Arraste as ordens entre colunas para mudar o estado</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.subtle }}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <Link href="/orders/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
            style={{ background: T.yellow, color: T.bg }}>
            <Plus className="h-3.5 w-3.5" />
            Nova Ordem
          </Link>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4">
        {loading && data.pendente.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin" style={{ color: T.yellow }} />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 h-full" style={{ minWidth: 900 }}>
            {COLS.map(col => (
              <KanbanColumn
                key={col.key}
                col={col}
                orders={data[col.key]}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onDragStart={handleDragStart}
                onCardClick={handleCardClick}
                draggingId={draggingOrder?.id ?? null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Schedule modal */}
      {scheduleModal && (
        <ScheduleModal
          order={scheduleModal.order}
          onConfirm={date => {
            const pm = pendingMove.current
            if (pm) moveOrder(pm.order, pm.col, date)
            pendingMove.current = null
            setScheduleModal(null)
          }}
          onCancel={() => {
            pendingMove.current = null
            setScheduleModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}
