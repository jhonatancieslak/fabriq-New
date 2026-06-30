// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, ChevronRight, Package, Layers, AlertTriangle, X, GripVertical, Check, Pencil, Trash2, Calendar } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUS_COLS = [
  { key: 'planned',     label: 'Planeado',    color: 'border-slate-600',  badge: 'bg-slate-700 text-slate-300' },
  { key: 'in_progress', label: 'Em Execução', color: 'border-yellow-600', badge: 'bg-yellow-900/40 text-yellow-300' },
  { key: 'completed',   label: 'Concluído',   color: 'border-green-700',  badge: 'bg-green-900/40 text-green-300' },
] as const

interface OrderSummary {
  id: string; orderNumber: string; status: string; isUrgent: boolean
  client?: { name: string }; machine?: { name: string }
  items: { id: string; quantityPlanned?: number; areaM2?: number }[]
  scheduledAt?: string
}

interface Batch {
  id: string; name: string
  status: 'planned' | 'in_progress' | 'completed'
  machineId?: string; scheduledAt?: string; notes?: string
  orders: OrderSummary[]
}

interface Machine { id: string; name: string }

// ── Add Orders Modal ─────────────────────────────────────────────────────────
function AddOrdersModal({ batchId, onClose, onAdded }: { batchId: string; onClose: () => void; onAdded: () => void }) {
  const [orders, setOrders]   = useState<OrderSummary[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.batches.unassigned().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    if (!selected.size) return
    setSaving(true); setError('')
    try {
      await api.batches.addOrders(batchId, [...selected])
      onAdded(); onClose()
    } catch (e: any) {
      setError(e.message); setSaving(false)
    }
  }

  function toggle(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#111215] border border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Adicionar Ordens à Batch</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">A carregar...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">Nenhuma ordem disponível (todas já têm batch atribuída).</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {orders.map(o => (
              <button key={o.id} onClick={() => toggle(o.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left border transition-colors ${
                  selected.has(o.id) ? 'bg-yellow-900/30 border-yellow-600' : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }`}>
                <div className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center ${
                  selected.has(o.id) ? 'bg-yellow-400 border-yellow-400' : 'border-slate-500'
                }`}>
                  {selected.has(o.id) && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{o.orderNumber}</p>
                  <p className="text-xs text-slate-500 truncate">{o.client?.name} · {o.items.length} peça(s)</p>
                </div>
                {o.isUrgent && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
          <button onClick={handleAdd} disabled={!selected.size || saving}
            className="flex-1 rounded-xl bg-yellow-400 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-40 transition-colors">
            {saving ? 'A adicionar...' : `Adicionar${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Batch Modal (create/edit) ────────────────────────────────────────────────
function BatchModal({ batch, onClose, onSaved }: { batch?: Batch | null; onClose: () => void; onSaved: () => void }) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [name, setName]           = useState(batch?.name ?? '')
  const [machineId, setMachineId] = useState(batch?.machineId ?? '')
  const [scheduledAt, setScheduledAt] = useState(batch?.scheduledAt ? batch.scheduledAt.slice(0, 10) : '')
  const [notes, setNotes]         = useState(batch?.notes ?? '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => { api.machines.list().then(r => setMachines(r.machines ?? [])).catch(() => {}) }, [])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      const payload = {
        name: name.trim(),
        machineId: machineId || null,
        scheduledAt: scheduledAt || null,
        notes: notes.trim() || null,
      }
      if (batch) await api.batches.update(batch.id, payload)
      else       await api.batches.create(payload)
      onSaved(); onClose()
    } catch (e: any) {
      setError(e.message); setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#111215] border border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{batch ? 'Editar Batch' : 'Nova Batch de Produção'}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Corte Laser — Semana 28"
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Máquina</label>
            <select value={machineId} onChange={e => setMachineId(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400">
              <option value="">Não definida</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Data prevista</label>
            <input type="date" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações opcionais..."
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none" />
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="flex-1 rounded-xl bg-yellow-400 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-40 transition-colors">
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Batch Card ───────────────────────────────────────────────────────────────
function BatchCard({ batch, onEdit, onDelete, onMove, onAddOrders, onRemoveOrder }: {
  batch: Batch
  onEdit: () => void
  onDelete: () => void
  onMove: (status: string) => void
  onAddOrders: () => void
  onRemoveOrder: (orderId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const totalPieces = batch.orders.reduce((a, o) => a + o.items.reduce((s, i) => s + (i.quantityPlanned ?? 1), 0), 0)
  const totalArea   = batch.orders.reduce((a, o) => a + o.items.reduce((s, i) => s + (i.areaM2 ?? 0), 0), 0)
  const hasUrgent   = batch.orders.some(o => o.isUrgent)

  const nextStatus = batch.status === 'planned' ? 'in_progress' : batch.status === 'in_progress' ? 'completed' : null
  const nextLabel  = batch.status === 'planned' ? 'Iniciar' : 'Concluir'

  return (
    <div className="rounded-xl border border-slate-700 bg-[#111215] overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {hasUrgent && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
              <p className="text-sm font-semibold text-white truncate">{batch.name}</p>
            </div>
            {batch.scheduledAt && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(batch.scheduledAt).toLocaleDateString('pt-PT')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-yellow-400 transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{batch.orders.length} ordens</span>
          <span className="flex items-center gap-1"><Package className="h-3 w-3" />{totalPieces} peças</span>
          {totalArea > 0 && <span>{totalArea.toFixed(2)} m²</span>}
        </div>

        {batch.notes && (
          <p className="mt-1.5 text-xs text-slate-600 italic truncate">{batch.notes}</p>
        )}
      </div>

      {/* Orders expandable */}
      {batch.orders.length > 0 && (
        <div className="border-t border-slate-800">
          <button onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-500 hover:bg-slate-800/50 transition-colors">
            <span>Ordens ({batch.orders.length})</span>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          {expanded && (
            <div className="divide-y divide-slate-800/60">
              {batch.orders.map(o => (
                <div key={o.id} className="flex items-center gap-2 px-3 py-2 group">
                  <GripVertical className="h-3.5 w-3.5 text-slate-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/orders/${o.id}`}
                      className="text-xs font-medium text-white hover:text-yellow-400 transition-colors">
                      {o.orderNumber}
                    </Link>
                    {o.client && <p className="text-xs text-slate-500 truncate">{o.client.name}</p>}
                  </div>
                  {o.isUrgent && <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />}
                  <button onClick={() => onRemoveOrder(o.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-900/30 text-slate-600 hover:text-red-400 transition-all flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-slate-800 p-2 flex gap-1.5">
        <button onClick={onAddOrders}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1.5 text-xs text-slate-300 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Ordens
        </button>
        {nextStatus && (
          <button onClick={() => onMove(nextStatus)}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 px-2 py-1.5 text-xs font-semibold text-black transition-colors">
            {nextLabel} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const [data, setData]     = useState<{ planned: Batch[]; in_progress: Batch[]; completed: Batch[] }>({ planned: [], in_progress: [], completed: [] })
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState<Machine[]>([])
  const [filterMachine, setFilterMachine] = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [editBatch, setEditBatch] = useState<Batch | null>(null)
  const [addTo, setAddTo]       = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await api.batches.kanban(filterMachine || undefined)
      setData(d)
    } catch {}
    setLoading(false)
  }, [filterMachine])

  useEffect(() => { api.machines.list().then(r => setMachines(r.machines ?? [])).catch(() => {}) }, [])
  useEffect(() => { setLoading(true); load() }, [load])

  async function handleMove(id: string, status: string) {
    await api.batches.updateStatus(id, status).catch(() => {})
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Apagar esta batch? As ordens não serão apagadas.')) return
    await api.batches.delete(id).catch(() => {})
    load()
  }

  async function handleRemoveOrder(batchId: string, orderId: string) {
    await api.batches.removeOrder(batchId, orderId).catch(() => {})
    load()
  }

  const total = data.planned.length + data.in_progress.length + data.completed.length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kanban de Produção</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} batch{total !== 1 ? 'es' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {machines.length > 1 && (
            <select value={filterMachine} onChange={e => setFilterMachine(e.target.value)}
              className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400">
              <option value="">Todas as máquinas</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 transition-colors">
            <Plus className="h-4 w-4" /> Nova Batch
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-20 text-sm animate-pulse">A carregar...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 items-start">
          {STATUS_COLS.map(col => {
            const colBatches = data[col.key]
            return (
              <div key={col.key} className={`rounded-2xl border-2 ${col.color} bg-[#0A0B0D]`}>
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white">{col.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{colBatches.length}</span>
                </div>
                {/* Cards */}
                <div className="p-3 space-y-3 min-h-[120px]">
                  {colBatches.length === 0 && (
                    <p className="text-center text-xs text-slate-700 py-6">Sem batches</p>
                  )}
                  {colBatches.map(batch => (
                    <BatchCard
                      key={batch.id}
                      batch={batch}
                      onEdit={() => setEditBatch(batch)}
                      onDelete={() => handleDelete(batch.id)}
                      onMove={s => handleMove(batch.id, s)}
                      onAddOrders={() => setAddTo(batch.id)}
                      onRemoveOrder={oid => handleRemoveOrder(batch.id, oid)}
                    />
                  ))}
                  {col.key === 'planned' && (
                    <button onClick={() => setShowNew(true)}
                      className="w-full rounded-xl border border-dashed border-slate-800 hover:border-slate-600 py-3 text-xs text-slate-700 hover:text-slate-500 transition-colors flex items-center justify-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Nova batch
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew  && <BatchModal onClose={() => setShowNew(false)} onSaved={load} />}
      {editBatch && <BatchModal batch={editBatch} onClose={() => setEditBatch(null)} onSaved={load} />}
      {addTo    && <AddOrdersModal batchId={addTo} onClose={() => setAddTo(null)} onAdded={load} />}
    </div>
  )
}
