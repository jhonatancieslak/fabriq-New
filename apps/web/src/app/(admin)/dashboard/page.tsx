// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Users, Clock, CheckCircle2, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import { api, type Order } from '@/lib/api'

interface Stats { total: number; pending: number; inProgress: number; completed: number }

export default function DashboardPage() {
  const [stats, setStats]   = useState<Stats>({ total: 0, pending: 0, inProgress: 0, completed: 0 })
  const [recent, setRecent] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.orders.list({ page: 1 }),
      api.orders.list({ status: 'pending', page: 1 }),
      api.orders.list({ status: 'in_progress', page: 1 }),
      api.orders.list({ status: 'completed', page: 1 }),
    ]).then(([all, pending, inProgress, completed]) => {
      setStats({
        total: all.total,
        pending: pending.total,
        inProgress: inProgress.total,
        completed: completed.total,
      })
      setRecent(all.orders.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    pending:     'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed:   'bg-green-100 text-green-700',
    cancelled:   'bg-red-100 text-red-600',
    invoiced:    'bg-purple-100 text-purple-700',
  }
  const statusLabel: Record<string, string> = {
    pending: 'Pendente', in_progress: 'Em execução',
    completed: 'Concluída', cancelled: 'Cancelada', invoiced: 'Faturada',
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumo da actividade de produção</p>
        </div>
        <Link href="/orders/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Nova Ordem
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Ordens', value: stats.total,      icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Pendentes',       value: stats.pending,    icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Em Execução',     value: stats.inProgress, icon: TrendingUp,    color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Concluídas',      value: stats.completed,  icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-50' },
        ].map(kpi => (
          <div key={kpi.label} className="card p-5">
            <div className={`inline-flex rounded-xl p-2.5 ${kpi.bg} mb-3`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {loading ? '—' : kpi.value}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Ordens recentes */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Ordens Recentes</h2>
          <Link href="/orders" className="flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400 animate-pulse">A carregar...</div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Sem ordens ainda</p>
            <Link href="/orders/new" className="btn-primary mt-4 inline-flex">
              <Plus className="h-4 w-4" /> Criar primeira ordem
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{order.orderNumber}</span>
                    <span className={`badge ${statusColor[order.status]}`}>{statusLabel[order.status]}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {order.client.name} · {order.project.code}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(order.createdAt).toLocaleDateString('pt-PT')}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/orders/new', label: 'Nova Ordem', desc: 'Criar OS de corte', icon: ClipboardList, color: 'bg-brand-blue' },
          { href: '/clients',    label: 'Clientes',   desc: 'Gerir clientes',    icon: Users,         color: 'bg-slate-700' },
          { href: '/operators',  label: 'Operadores', desc: 'Acesso PWA / QR',   icon: Users,         color: 'bg-slate-700' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="card p-5 hover:shadow-card-md transition-shadow group flex items-center gap-4">
            <div className={`rounded-xl p-2.5 ${item.color}`}>
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 group-hover:text-brand-blue transition-colors">{item.label}</div>
              <div className="text-xs text-slate-500">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
