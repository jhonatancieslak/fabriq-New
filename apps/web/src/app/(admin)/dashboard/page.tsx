// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardList, Users, Clock, CheckCircle2, Plus, ArrowRight,
  TrendingUp, HardHat, Zap,
} from 'lucide-react'
import { api, type Order } from '@/lib/api'

interface Stats { total: number; pending: number; inProgress: number; completed: number }

const statusClass: Record<string, string> = {
  pending:     'badge-pending',
  in_progress: 'badge-progress',
  completed:   'badge-completed',
  cancelled:   'badge-cancelled',
  invoiced:    'badge-invoiced',
}
const statusLabel: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em execução',
  completed: 'Concluída', cancelled: 'Cancelada', invoiced: 'Faturada',
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats>({ total: 0, pending: 0, inProgress: 0, completed: 0 })
  const [recent, setRecent]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.orders.list({ page: 1 }),
      api.orders.list({ status: 'pending', page: 1 }),
      api.orders.list({ status: 'in_progress', page: 1 }),
      api.orders.list({ status: 'completed', page: 1 }),
    ]).then(([all, pending, inProgress, completed]) => {
      setStats({ total: all.total, pending: pending.total, inProgress: inProgress.total, completed: completed.total })
      setRecent(all.orders.slice(0, 6))
    }).finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label: 'Total de Ordens', value: stats.total,      icon: ClipboardList, accent: '#6366f1', bg: 'rgba(99,102,241,0.08)',  trend: '+12% este mês' },
    { label: 'Pendentes',       value: stats.pending,    icon: Clock,         accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', trend: 'Aguardam início' },
    { label: 'Em Execução',     value: stats.inProgress, icon: TrendingUp,    accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)', trend: 'No chão de fábrica' },
    { label: 'Concluídas',      value: stats.completed,  icon: CheckCircle2,  accent: '#10b981', bg: 'rgba(16,185,129,0.08)', trend: 'Prontas a faturar' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#EAB308' }}>
              <Zap className="h-3 w-3 text-slate-900" strokeWidth={3} />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visão geral</span>
          </div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumo da actividade de produção</p>
        </div>
        <Link href="/orders/new" className="btn-yellow">
          <Plus className="h-4 w-4" /> Nova Ordem
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="card p-5 relative overflow-hidden">
            <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: kpi.accent }} />
            <div className="pl-3">
              <div className="rounded-xl p-2.5 w-fit mb-3" style={{ background: kpi.bg }}>
                <kpi.icon className="h-5 w-5" style={{ color: kpi.accent }} />
              </div>
              <div className="text-3xl font-bold text-slate-900 tabular-nums leading-none mb-1">
                {loading ? <span className="inline-block w-8 h-7 bg-slate-100 rounded animate-pulse" /> : kpi.value}
              </div>
              <div className="text-sm font-medium text-slate-700">{kpi.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{kpi.trend}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ordens recentes + Atalhos */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Ordens */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="section-title">Ordens Recentes</h2>
            <Link href="/orders" className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">Sem ordens ainda</p>
              <Link href="/orders/new" className="btn-primary mt-4 inline-flex">
                <Plus className="h-4 w-4" /> Criar primeira ordem
              </Link>
            </div>
          ) : (
            <div>
              {recent.map(order => (
                <Link key={order.id} href={`/orders/${order.id}`} className="table-row group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-50">
                    <ClipboardList className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{order.orderNumber}</span>
                      <span className={statusClass[order.status]}>{statusLabel[order.status]}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {order.client.name} · {order.project.code}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                    {new Date(order.createdAt).toLocaleDateString('pt-PT')}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Atalhos */}
        <div className="space-y-3">
          <h2 className="section-title px-1">Acesso rápido</h2>

          {[
            { href: '/orders/new', label: 'Nova Ordem', desc: 'Criar OS de corte / quinagem', icon: ClipboardList, accent: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
            { href: '/clients',    label: 'Clientes',   desc: 'Ver e editar clientes',        icon: Users,         accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
            { href: '/operators',  label: 'Operadores', desc: 'QR code e link PWA',            icon: HardHat,       accent: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="card-hover flex items-center gap-4 p-4 group">
              <div className="rounded-xl p-2.5 flex-shrink-0" style={{ background: item.bg }}>
                <item.icon className="h-5 w-5" style={{ color: item.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
            </Link>
          ))}

          {/* Estado do sistema */}
          <div className="card p-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistema</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'API',             status: 'Online',      color: '#10b981' },
                { label: 'WhatsApp',        status: 'Configurar',  color: '#f59e0b' },
                { label: 'PWA Operadores',  status: 'Online',      color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className="text-xs font-semibold" style={{ color: s.color }}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
