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
  const [data, setData]       = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    // Mostrar feedback de retorno do Stripe
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === '1') showToast('Subscrição activada com sucesso! 🎉')
    if (params.get('cancelled') === '1') showToast('Pagamento cancelado.', 'err')

    fetch(`${API_URL}/api/v1/billing`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setData)
      .catch(() => showToast('Erro ao carregar plano', 'err'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(plan: string) {
    setUpgrading(plan)
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/checkout`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ plan: plan.toLowerCase() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar sessão')
      window.location.href = json.url
    } catch (err: any) {
      showToast(err.message, 'err')
      setUpgrading(null)
    }
  }

  async function handlePortal() {
    setUpgrading('portal')
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/portal`, {
        method: 'POST', headers: authHeaders(),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      window.location.href = json.url
    } catch (err: any) {
      showToast(err.message, 'err')
      setUpgrading(null)
    }
  }

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

          {/* Gerir subscrição Stripe (se já tiver) */}
          {data.plan !== 'trial' && (
            <div className="flex justify-end">
              <button
                onClick={handlePortal}
                disabled={upgrading === 'portal'}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: T.border, color: T.muted }}>
                {upgrading === 'portal' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Gerir subscrição (Stripe Portal)
              </button>
            </div>
          )}

          {/* Planos de upgrade */}
          {!['factory', 'enterprise'].includes(data.plan) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.subtle }}>Fazer upgrade</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {UPGRADE_PLANS.map(p => {
                  const planKey = p.plan.toLowerCase()
                  const isCurrent = data.plan === planKey
                  return (
                    <div key={p.plan}
                      className="rounded-2xl p-5 flex flex-col"
                      style={{
                        background: p.highlight ? 'rgba(139,92,246,0.06)' : T.surface,
                        border: `1px solid ${isCurrent ? '#22C55E' : p.highlight ? 'rgba(139,92,246,0.3)' : T.border}`,
                      }}>
                      {isCurrent && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full self-start mb-3"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Plano actual</span>
                      )}
                      {p.highlight && !isCurrent && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full self-start mb-3"
                          style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>Mais popular</span>
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
                      <button
                        onClick={() => handleUpgrade(planKey)}
                        disabled={!!upgrading || isCurrent}
                        className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all disabled:opacity-50"
                        style={{
                          background: isCurrent ? T.border : p.highlight ? '#8B5CF6' : '#EAB308',
                          color: isCurrent ? T.muted : '#fff',
                          cursor: isCurrent ? 'default' : 'pointer',
                        }}>
                        {upgrading === planKey
                          ? <><RefreshCw className="h-3 w-3 animate-spin" /> A redirecionar…</>
                          : isCurrent ? 'Plano actual'
                          : <>Assinar agora <ArrowRight className="h-3 w-3" /></>
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: T.faint }}>
                Pagamento seguro via Stripe · Cancele quando quiser · Suporte: <span style={{ color: T.muted }}>jhonatan.cieslak94@gmail.com</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
