// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Clock, TrendingUp, CheckCircle2, FileText, Plus, ArrowRight, Zap } from 'lucide-react'
import { api, type Order } from '@/lib/api'
import { T, Badge, Btn } from '@/components/ui/admin-ui'

interface DashStats {
  orders: { total: number; pending: number; inProgress: number; completed: number; invoiced: number; createdToday: number; createdMonth: number }
  financial: { revenueMonth: number; revenueLastMonth: number; revenueGrowth: number | null; invoicedThisMonth: number; pendingInvoices: number }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em execução', completed: 'Concluída',
  cancelled: 'Cancelada', invoiced: 'Faturada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#9CA3AF', in_progress: '#EAB308', completed: '#22C55E',
  cancelled: '#EF4444', invoiced: '#A78BFA',
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
}

function KpiCard({ label, value, sub, icon: Icon }: {
  label: string; value: string | number; sub?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.subtle }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.border }}>
          <Icon className="h-4 w-4" style={{ color: T.muted }} />
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums leading-none" style={{ color: T.text }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: T.subtle }}>{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [recent, setRecent] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  // T is light theme — override inline colors that were written for dark

  useEffect(() => {
    Promise.all([
      api.dashboard.stats(),
      api.orders.list({ page: 1 }),
    ]).then(([s, orders]) => {
      setStats(s)
      setRecent(orders.orders.slice(0, 6))
    }).catch(() => {
      // fallback silencioso — dashboard não deve crashar
    }).finally(() => setLoading(false))
  }, [])

  const kpis = stats ? [
    { label: 'Pendentes',     value: stats.orders.pending,    sub: 'aguardam início',        icon: Clock },
    { label: 'Em Execução',   value: stats.orders.inProgress, sub: 'no chão de fábrica',     icon: TrendingUp },
    { label: 'Concluídas',    value: stats.orders.completed,  sub: 'prontas a faturar',      icon: CheckCircle2 },
    {
      label: 'Faturação mês',
      value: fmt(stats.financial.revenueMonth),
      sub: stats.financial.revenueGrowth != null
        ? `${stats.financial.revenueGrowth > 0 ? '+' : ''}${stats.financial.revenueGrowth.toFixed(1)}% vs mês anterior`
        : `${stats.financial.invoicedThisMonth} fatura${stats.financial.invoicedThisMonth !== 1 ? 's' : ''} emitida${stats.financial.invoicedThisMonth !== 1 ? 's' : ''}`,
      icon: FileText,
    },
  ] : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: T.yellowBg }}>
            <Zap className="h-5 w-5" style={{ color: T.yellow }} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>Dashboard</h1>
            <p className="text-xs" style={{ color: T.subtle }}>Visão geral da produção</p>
          </div>
        </div>
        <Link href="/orders/new"><Btn><Plus className="h-4 w-4" />Nova Ordem</Btn></Link>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: T.surface }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => <KpiCard key={k.label} {...k} />)}
        </div>
      )}

      {/* Stats secundários */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Criadas hoje',      value: stats.orders.createdToday },
            { label: 'Criadas este mês',  value: stats.orders.createdMonth },
            { label: 'Faturas pendentes', value: stats.financial.pendingInvoices },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-sm" style={{ color: T.subtle }}>{s.label}</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: T.text }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ordens recentes */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${T.divider}` }}>
            <h2 className="text-sm font-bold" style={{ color: T.text }}>Ordens Recentes</h2>
            <Link href="/orders"
              className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: T.subtle }}
              onMouseEnter={e => (e.currentTarget.style.color = T.yellow)}
              onMouseLeave={e => (e.currentTarget.style.color = T.subtle)}>
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: T.border }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ClipboardList className="h-8 w-8" style={{ color: T.faint }} />
              <p className="text-sm" style={{ color: T.subtle }}>Sem ordens ainda</p>
              <Link href="/orders/new"><Btn><Plus className="h-4 w-4" />Criar primeira ordem</Btn></Link>
            </div>
          ) : (
            <div>
              {recent.map((order, i) => (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50 group"
                  style={i < recent.length - 1 ? { borderBottom: `1px solid ${T.divider}` } : {}}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.yellowBg }}>
                    <ClipboardList className="h-4 w-4" style={{ color: T.yellow }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-mono" style={{ color: T.text }}>
                        #{order.orderNumber}
                      </span>
                      <Badge label={STATUS_LABEL[order.status] ?? order.status}
                        color={STATUS_COLOR[order.status] ?? T.subtle} />
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: T.subtle }}>
                      {order.client?.name} · {order.project?.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs tabular-nums" style={{ color: T.faint }}>
                      {new Date(order.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: T.muted }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="space-y-4">
          {/* Atalhos */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
              <h2 className="text-sm font-bold" style={{ color: T.text }}>Acesso Rápido</h2>
            </div>
            <div className="p-3 space-y-1">
              {[
                { href: '/orders/new', label: 'Nova Ordem',  desc: 'Criar OS de corte / quinagem' },
                { href: '/invoicing',  label: 'Faturação',
                  desc: stats ? `${stats.financial.pendingInvoices} pendente${stats.financial.pendingInvoices !== 1 ? 's' : ''}` : '—' },
                { href: '/clients',    label: 'Clientes',    desc: 'Gerir clientes e obras' },
                { href: '/machines',   label: 'Máquinas',    desc: 'Equipamentos e parâmetros de custo' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: T.text }}>{item.label}</p>
                    <p className="text-xs" style={{ color: T.subtle }}>{item.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity"
                    style={{ color: T.muted }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Estado do sistema */}
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>
                Estado do Sistema
              </p>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'API',            ok: true  },
                { label: 'PWA Operadores', ok: true  },
                { label: 'WhatsApp',       ok: false, href: '/settings/whatsapp' },
                { label: 'SMTP Email',     ok: false, href: '/settings/smtp' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: T.muted }}>{s.label}</span>
                  {s.ok ? (
                    <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>Online</span>
                  ) : s.href ? (
                    <a href={s.href} className="text-xs font-semibold underline underline-offset-2 transition-opacity hover:opacity-70" style={{ color: '#EAB308' }}>
                      Configurar →
                    </a>
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: '#EAB308' }}>Offline</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
