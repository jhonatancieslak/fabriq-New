// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Zap, Users, Cpu, ClipboardList, HardHat, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { T, Toast, PageHeader } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') ?? 'demo' : 'demo'
  return { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenant, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

interface UsageItem { current: number; limit: number | null; unlimited: boolean }
interface BillingData {
  plan: string; planLabel: string; planPrice: string
  planExpiresAt: string | null; planExpired: boolean
  trial: { endsAt: string; daysLeft: number; expired: boolean } | null
  usage: {
    operators: UsageItem; adminUsers: UsageItem; machines: UsageItem
    ordersMonth: UsageItem; ordersTotal?: UsageItem
  }
}

const PLAN_COLOR: Record<string, string> = {
  trial: '#9CA3AF', starter: '#3B82F6', pro: '#8B5CF6', factory: '#EAB308', enterprise: '#22C55E',
}

const UPGRADE_PLANS = [
  { plan: 'Starter', price: '49€/mês', features: ['150 ordens/mês', '5 operadores', '3 admins', '1 máquina', 'Notificações email + WhatsApp'] },
  { plan: 'Pro',     price: '99€/mês', features: ['Ordens ilimitadas', '20 operadores', '10 admins', '3 máquinas', 'Módulo financeiro', 'Relatórios PDF/Excel'], highlight: true },
  { plan: 'Factory', price: '199€/mês', features: ['Tudo ilimitado', 'White-label', 'API REST (ERP)', 'Relatório diário automático', 'Suporte prioritário 4h'] },
]

function UsageBar({ label, icon: Icon, item }: { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; item: UsageItem }) {
  const pct = item.unlimited || !item.limit ? 0 : Math.min(100, Math.round((item.current / item.limit) * 100))
  const warn = pct >= 80
  const full = pct >= 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" style={{ color: T.subtle }} />
          <span className="text-xs font-medium" style={{ color: T.muted }}>{label}</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: full ? '#EF4444' : warn ? '#EAB308' : T.text }}>
          {item.current}{item.unlimited ? '' : ` / ${item.limit ?? '∞'}`}
          {item.unlimited && <span style={{ color: T.faint }}> (ilimitado)</span>}
        </span>
      </div>
      {!item.unlimited && item.limit && (
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${pct}%`,
            background: full ? '#EF4444' : warn ? '#EAB308' : '#22C55E',
          }} />
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  const [data, setData]     = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetch(`${API_URL}/api/v1/billing`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setData)
      .catch(() => showToast('Erro ao carregar plano', 'err'))
      .finally(() => setLoading(false))
  }, [])

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader title="Plano e Faturação" sub="Uso actual, limites e upgrade" />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.yellow }} />
        </div>
      ) : data && (
        <>
          {/* Trial / Plano expirado — alerta */}
          {data.trial?.expired || data.planExpired ? (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#FCA5A5' }}>
                  {data.trial?.expired ? 'Trial expirado' : 'Subscrição expirada'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
                  A criação de novas ordens, operadores, utilizadores e máquinas está bloqueada. Faça upgrade para continuar.
                </p>
              </div>
            </div>
          ) : data.trial && data.trial.daysLeft <= 3 ? (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#EAB308' }} />
              <p className="text-sm" style={{ color: '#EAB308' }}>
                Trial termina em <strong>{data.trial.daysLeft} dia{data.trial.daysLeft !== 1 ? 's' : ''}</strong> ({fmtDate(data.trial.endsAt)}). Faça upgrade para não perder o acesso.
              </p>
            </div>
          ) : null}

          {/* Card do plano actual */}
          <div className="rounded-2xl p-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-2xl font-black tracking-tight" style={{ color: T.text }}>{data.planLabel}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${PLAN_COLOR[data.plan] ?? T.border}20`, color: PLAN_COLOR[data.plan] ?? T.muted }}>
                    {data.planPrice}
                  </span>
                </div>
                {data.trial && !data.trial.expired && (
                  <p className="text-xs" style={{ color: T.muted }}>
                    Trial termina em <strong style={{ color: '#EAB308' }}>{fmtDate(data.trial.endsAt)}</strong>
                    {' '}· {data.trial.daysLeft} dia{data.trial.daysLeft !== 1 ? 's' : ''} restante{data.trial.daysLeft !== 1 ? 's' : ''}
                  </p>
                )}
                {data.planExpiresAt && !data.planExpired && (
                  <p className="text-xs mt-0.5" style={{ color: T.faint }}>
                    Subscrição válida até {fmtDate(data.planExpiresAt)}
                  </p>
                )}
              </div>
              {['factory', 'enterprise'].includes(data.plan)
                ? <CheckCircle2 className="h-6 w-6 flex-shrink-0" style={{ color: '#22C55E' }} />
                : <Zap className="h-6 w-6 flex-shrink-0" style={{ color: '#EAB308' }} />
              }
            </div>

            {/* Barras de uso */}
            <div className="mt-5 space-y-3.5" style={{ borderTop: `1px solid ${T.divider}`, paddingTop: '1.25rem' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.subtle }}>Uso actual</p>
              {data.usage.ordersTotal && (
                <UsageBar label="Ordens (total trial)" icon={ClipboardList} item={data.usage.ordersTotal} />
              )}
              {!data.usage.ordersTotal && (
                <UsageBar label="Ordens este mês" icon={ClipboardList} item={data.usage.ordersMonth} />
              )}
              <UsageBar label="Operadores activos" icon={HardHat} item={data.usage.operators} />
              <UsageBar label="Utilizadores admin" icon={Users} item={data.usage.adminUsers} />
              <UsageBar label="Máquinas activas" icon={Cpu} item={data.usage.machines} />
            </div>
          </div>

          {/* Planos de upgrade — só se não for factory/enterprise */}
          {!['factory', 'enterprise'].includes(data.plan) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.subtle }}>Fazer upgrade</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {UPGRADE_PLANS.map(p => (
                  <div key={p.plan}
                    className="rounded-2xl p-5 flex flex-col"
                    style={{
                      background: p.highlight ? 'rgba(139,92,246,0.06)' : T.surface,
                      border: `1px solid ${p.highlight ? 'rgba(139,92,246,0.3)' : T.border}`,
                    }}>
                    {p.highlight && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full self-start mb-3"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                        Mais popular
                      </span>
                    )}
                    <p className="text-base font-black" style={{ color: T.text }}>{p.plan}</p>
                    <p className="text-sm font-semibold mt-0.5 mb-4" style={{ color: p.highlight ? '#A78BFA' : T.muted }}>{p.price}</p>
                    <ul className="space-y-1.5 flex-1 mb-4">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs" style={{ color: T.muted }}>
                          <span style={{ color: '#22C55E' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <a href={`mailto:jhonatan.cieslak94@gmail.com?subject=Upgrade FABRIQ — Plano ${p.plan}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all"
                      style={{
                        background: p.highlight ? '#8B5CF6' : T.border,
                        color: p.highlight ? '#fff' : T.muted,
                      }}>
                      Contratar <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: T.faint }}>
                Para upgrade ou dúvidas contacte <span style={{ color: T.muted }}>jhonatan.cieslak94@gmail.com</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
