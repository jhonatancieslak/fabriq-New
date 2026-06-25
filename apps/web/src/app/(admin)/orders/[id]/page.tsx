// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ChevronLeft, X, Clock, CheckCircle2, CircleDot, AlertCircle } from 'lucide-react'
import { api, type Order } from '@/lib/api'

const stageTypeLabel: Record<string, string> = {
  laser_cnc:  'Corte CNC Laser',
  bending:    'Quinagem',
  guillotine: 'Guilhotina',
}

const stageIcons: Record<string, string> = { laser_cnc: '⚡', bending: '🔧', guillotine: '✂️' }

const statusColors: Record<string, string> = {
  pending:     'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
  invoiced:    'bg-purple-100 text-purple-700',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em execução',
  completed: 'Concluída', cancelled: 'Cancelada', invoiced: 'Faturada',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.orders.get(id).then(setOrder).catch(() => setError('Ordem não encontrada')).finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!confirm('Confirma o cancelamento desta ordem?')) return
    setCancelling(true)
    try {
      await api.orders.cancel(id)
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar')
    } finally {
      setCancelling(false)
    }
  }

  function handlePrint() {
    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    // Abre a folha de corte em nova aba — HTML directo do backend
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'}/api/v1/pdf/orders/${id}/cutting-sheet`
    const w = window.open('about:blank', '_blank')
    if (!w) return
    // Fetch com headers de auth e depois escreve no popup
    fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant } })
      .then(r => r.text())
      .then(html => { w.document.write(html); w.document.close(); w.print() })
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">A carregar...</div>
  if (error || !order) return <div className="p-8 text-sm text-red-600">{error || 'Ordem não encontrada'}</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Navegação */}
      <div className="mb-5">
        <button onClick={() => router.push('/orders')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <ChevronLeft className="h-4 w-4" /> Ordens
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500 font-mono mt-0.5">{order.authCode}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Cabeçalho info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Cliente</div>
            <div className="text-sm font-medium">{order.client?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Obra</div>
            <div className="text-sm font-medium">{order.project?.code} — {order.project?.name}</div>
          </div>
          {order.notes && (
            <div className="col-span-2">
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Observações</div>
              <div className="text-sm text-slate-600">{order.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Etapas */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Etapas de Produção</h2>
        <div className="space-y-3">
          {(order.stages ?? []).map((stage: { id: string; stageNumber: number; type: string; status: string; machine?: { name: string }; operator?: { name: string }; startedAt?: string; completedAt?: string }, i: number) => (
            <div key={stage.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                {stage.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {stage.status === 'in_progress' && <CircleDot className="h-5 w-5 text-blue-500 animate-pulse" />}
                {stage.status === 'pending' && <Clock className="h-5 w-5 text-slate-300" />}
                {stage.status === 'cancelled' && <AlertCircle className="h-5 w-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stageIcons[stage.type]} {stageTypeLabel[stage.type]}</span>
                  {i < (order.stages?.length ?? 0) - 1 && (
                    <div className="h-px flex-1 bg-slate-100" />
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {stage.machine?.name && <span>{stage.machine.name}</span>}
                  {stage.operator?.name && <span> • {stage.operator.name}</span>}
                  {stage.startedAt && <span> • iniciada {new Date(stage.startedAt).toLocaleString('pt-PT')}</span>}
                  {stage.completedAt && <span> • concluída {new Date(stage.completedAt).toLocaleString('pt-PT')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Itens */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Peças</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
              <th className="text-left pb-2 font-semibold">Descrição</th>
              <th className="text-left pb-2 font-semibold">Material</th>
              <th className="text-left pb-2 font-semibold">Esp.</th>
              <th className="text-right pb-2 font-semibold">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item: { id: string; description: string; material?: { name: string }; thicknessMm: number; quantityPlanned: number }, i: number) => (
              <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                <td className="py-2 pr-3">{item.description}</td>
                <td className="py-2 pr-3 text-slate-600">{item.material?.name ?? '—'}</td>
                <td className="py-2 pr-3 text-slate-600">{item.thicknessMm} mm</td>
                <td className="py-2 text-right font-semibold">{item.quantityPlanned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Acções */}
      <div className="flex gap-3">
        <button onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Printer className="h-4 w-4" /> Folha de Corte
        </button>

        {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'invoiced' && (
          <button onClick={handleCancel} disabled={cancelling}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
            <X className="h-4 w-4" /> {cancelling ? 'A cancelar...' : 'Cancelar Ordem'}
          </button>
        )}
      </div>
    </div>
  )
}
