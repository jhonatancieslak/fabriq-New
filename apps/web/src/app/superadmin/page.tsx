// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronDown,
  Users, HardHat, Cpu, ClipboardList, CalendarDays, Zap,
} from 'lucide-react'
import { T, Toast } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') ?? 'demo' : 'demo'
  return { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenant, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

const PLANS = ['trial', 'starter', 'pro', 'factory', 'enterprise'] as const
type Plan = typeof PLANS[number]

const PLAN_LABEL: Record<Plan, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', factory: 'Factory', enterprise: 'Enterprise' }
const PLAN_COLOR: Record<Plan, string> = { trial: '#9CA3AF', starter: '#3B82F6', pro: '#8B5CF6', factory: '#EAB308', enterprise: '#22C55E' }

interface Tenant {
  id: string; slug: string; name: string; plan: Plan; planLabel: string; planPrice: string
  isActive: boolean; trialEndsAt: string | null; planExpiresAt: string | null
  trialExpired: boolean; planExpired: boolean; createdAt: string
  usage: { users: number; operators: number; machines: number; ordersTotal: number; ordersMonth: number }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ background: `${PLAN_COLOR[plan]}18`, color: PLAN_COLOR[plan] }}>
      {PLAN_LABEL[plan]}
    </span>
  )
}

function TenantRow({ tenant, onUpdate }: { tenant: Tenant; onUpdate: () => void }) {
  const [open, setOpen]             = useState(false)
  const [plan, setPlan]             = useState<Plan>(tenant.plan)
  const [planExpires, setPlanExpires] = useState(tenant.planExpiresAt ? tenant.planExpiresAt.slice(0, 10) : '')
  const [trialEnds, setTrialEnds]   = useState(tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : '')
  const [extendDays, setExtendDays] = useState('14')
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  async function savePlan() {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenant.id}/plan`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({
          plan,
          planExpiresAt: planExpires ? new Date(planExpires).toISOString() : null,
          trialEndsAt:   trialEnds   ? new Date(trialEnds).toISOString()   : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      showToast('Plano actualizado')
      onUpdate()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
    finally { setSaving(false) }
  }

  async function toggleStatus() {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenant.id}/status`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ isActive: !tenant.isActive }),
      })
      if (!res.ok) throw new Error('Erro')
      showToast(tenant.isActive ? 'Tenant desactivado' : 'Tenant activado')
      onUpdate()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
    finally { setSaving(false) }
  }

  async function extendTrial() {
    const days = parseInt(extendDays)
    if (!days) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenant.id}/extend-trial`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ days }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      showToast(`Trial extendido ${days} dias`)
      onUpdate()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
    finally { setSaving(false) }
  }

  const statusIcon = tenant.trialExpired || tenant.planExpired
    ? <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#EF4444' }} />
    : tenant.isActive
      ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#22C55E' }} />
      : <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header da linha */}
      <button className="w-full flex items-center gap-4 p-4 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 flex-shrink-0">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold text-white">{tenant.name}</span>
            <span className="text-xs font-mono" style={{ color: T.faint }}>{tenant.slug}</span>
            <PlanBadge plan={tenant.plan} />
            {(tenant.trialExpired || tenant.planExpired) && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                {tenant.trialExpired ? 'Trial expirado' : 'Plano expirado'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: T.faint }}>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tenant.usage.users} admins</span>
            <span className="flex items-center gap-1"><HardHat className="h-3 w-3" /> {tenant.usage.operators} ops</span>
            <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> {tenant.usage.ordersMonth} ordens/mês</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> desde {fmtDate(tenant.createdAt)}</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: T.faint }} />
      </button>

      {/* Painel de edição */}
      {open && (
        <div className="border-t px-4 pb-4 pt-4 space-y-4" style={{ borderColor: T.divider }}>

          {/* Alterar plano */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.subtle }}>Plano</p>
            <div className="flex flex-wrap gap-2">
              {PLANS.map(p => (
                <button key={p} onClick={() => setPlan(p)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={plan === p
                    ? { background: PLAN_COLOR[p], color: '#07080A' }
                    : { background: T.border, color: T.faint, border: `1px solid ${T.border}` }
                  }>
                  {PLAN_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: T.subtle }}>
                Trial termina em
              </label>
              <input type="date" value={trialEnds} onChange={e => setTrialEnds(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: '#0D1117', border: `1px solid ${T.border}`, color: T.text }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: T.subtle }}>
                Plano expira em
              </label>
              <input type="date" value={planExpires} onChange={e => setPlanExpires(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: '#0D1117', border: `1px solid ${T.border}`, color: T.text }}
              />
            </div>
          </div>

          {/* Acções */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={savePlan} disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: '#EAB308', color: '#07080A' }}>
              {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Guardar plano
            </button>

            {/* Extender trial */}
            <div className="flex items-center gap-1.5 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              <input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)}
                min={1} max={365}
                className="w-14 px-2 py-2 text-xs text-center outline-none"
                style={{ background: '#0D1117', color: T.text }}
              />
              <button onClick={extendTrial} disabled={saving}
                className="px-3 py-2 text-xs font-semibold transition-all"
                style={{ background: T.border, color: T.muted }}>
                +dias trial
              </button>
            </div>

            <button onClick={toggleStatus} disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-bold transition-all ml-auto"
              style={{
                background: tenant.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                color: tenant.isActive ? '#EF4444' : '#22C55E',
                border: `1px solid ${tenant.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
              }}>
              {tenant.isActive ? 'Desactivar tenant' : 'Activar tenant'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/superadmin/tenants`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTenants(data)
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao carregar', type: 'err' })
      setTimeout(() => setToast(null), 3500)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const active   = tenants.filter(t => t.isActive)
  const inactive = tenants.filter(t => !t.isActive)
  const expired  = tenants.filter(t => t.trialExpired || t.planExpired)

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Gestão de Tenants</h1>
          <p className="text-sm mt-0.5" style={{ color: T.faint }}>
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} · {active.length} activo{active.length !== 1 ? 's' : ''}
            {expired.length > 0 && <span style={{ color: '#EF4444' }}> · {expired.length} expirado{expired.length !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button onClick={load} className="rounded-xl p-2 transition-all" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: T.muted }} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tenants activos', value: active.length, color: '#22C55E' },
          { label: 'Planos pagos', value: tenants.filter(t => !['trial'].includes(t.plan) && t.isActive).length, color: '#EAB308' },
          { label: 'Em trial', value: tenants.filter(t => t.plan === 'trial').length, color: '#3B82F6' },
          { label: 'Expirados', value: expired.length, color: expired.length > 0 ? '#EF4444' : T.faint },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{ color: T.faint }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: '#EAB308' }} />
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map(t => <TenantRow key={t.id} tenant={t} onUpdate={load} />)}
        </div>
      )}
    </div>
  )
}
