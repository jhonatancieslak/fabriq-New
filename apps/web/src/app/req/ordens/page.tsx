// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Eye, ChevronRight, Search, RefreshCw } from 'lucide-react'
import { api, type Order } from '@/lib/api'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  invoiced: 'Faturada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#9CA3AF',
  in_progress: '#EAB308',
  completed: '#22C55E',
  cancelled: '#EF4444',
  invoiced: '#A78BFA',
}

const TABS = [
  { key: '', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'in_progress', label: 'Em execução' },
  { key: 'completed', label: 'Concluídas' },
  { key: 'cancelled', label: 'Canceladas' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${STATUS_COLOR[status] ?? '#9CA3AF'}15`, color: STATUS_COLOR[status] ?? '#9CA3AF' }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[status] ?? '#9CA3AF' }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export default function ReqOrdensPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal]   = useState(0)
  const [pages, setPages]   = useState(1)
  const [page, setPage]     = useState(1)
  const [tab, setTab]       = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.orders.list({ status: tab || undefined, page })
      setOrders(res.orders)
      setTotal(res.total)
      setPages(res.pages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar ordens')
    } finally {
      setLoading(false)
    }
  }, [tab, page])

  useEffect(() => { setPage(1) }, [tab])
  useEffect(() => { load() }, [load])

  const filtered = search
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.project?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-white">As minhas ordens</h1>
        <p className="text-sm mt-0.5" style={{ color: '#4B5563' }}>
          {total} ordem{total !== 1 ? 's' : ''} registada{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
            style={tab === t.key
              ? { background: '#EAB308', color: '#07080A' }
              : { background: '#111318', color: '#4B5563', border: '1px solid #1a1f2e' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#374151' }} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por número, cliente ou obra…"
          className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-700 outline-none"
          style={{ background: '#111318', border: '1px solid #1a1f2e' }}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: '#EAB308' }} />
        </div>
      ) : error ? (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-10 w-10 mb-3" style={{ color: '#1a1f2e' }} />
          <p className="text-sm font-medium" style={{ color: '#374151' }}>Sem ordens</p>
          <p className="text-xs mt-1" style={{ color: '#1f2937' }}>Não existem ordens para este filtro.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <button
              key={order.id}
              onClick={() => router.push(`/req/ordens/${order.id}`)}
              className="w-full text-left rounded-2xl p-4 transition-all group"
              style={{ background: '#111318', border: '1px solid #1a1f2e' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a2f3e' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1f2e' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-sm font-bold text-white">#{order.orderNumber}</span>
                    <StatusDot status={order.status} />
                  </div>
                  <p className="text-xs truncate" style={{ color: '#4B5563' }}>
                    {order.client?.name ?? '—'}
                    {order.project?.name && (
                      <span> · <span style={{ color: '#EAB308' }}>{order.project.code}</span> {order.project.name}</span>
                    )}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#374151' }}>
                    Criada em {fmtDate(order.createdAt)}
                    {order.stages && (
                      <span>
                        {' '}· {order.stages.filter(s => s.status === 'completed').length}/{order.stages.length} etapas
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: '#374151' }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-30 transition-all"
            style={{ background: '#111318', color: '#9CA3AF', border: '1px solid #1a1f2e' }}
          >
            ← Anterior
          </button>
          <span className="text-xs" style={{ color: '#4B5563' }}>{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-30 transition-all"
            style={{ background: '#111318', color: '#9CA3AF', border: '1px solid #1a1f2e' }}
          >
            Seguinte →
          </button>
        </div>
      )}
    </div>
  )
}
