// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronDown,
  Users, HardHat, Cpu, ClipboardList, CalendarDays, Zap, Gift,
  UserPlus, Eye, EyeOff, Shield,
} from 'lucide-react'
import { T, Toast, PageHeader, Badge, Modal, Field, Input, Select } from '@/components/ui/admin-ui'

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

interface TenantUser {
  id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Modal Utilizadores ───────────────────────────────────────────────────────

function CreateUserModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState('admin')
  const [showPw, setShowPw]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const [users, setUsers]       = useState<TenantUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const loadUsers = useCallback(() => {
    fetch(`${API_URL}/api/v1/superadmin/tenants/${tenant.id}/users`, { headers: authHeaders() })
      .then(r => r.json()).then(setUsers).catch(() => {})
      .finally(() => setLoadingUsers(false))
  }, [tenant.id])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function save() {
    if (!name || !email || !password) { setErr('Preencha todos os campos'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenant.id}/users`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      showToast(`Utilizador ${name} criado`)
      setName(''); setEmail(''); setPassword(''); setRole('admin')
      loadUsers()
      onSaved()
    } catch (e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Utilizadores — ${tenant.name}`} sub={`${tenant.slug} · ${tenant.planLabel}`} onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm" style={{ background: T.border, color: T.muted }}>Fechar</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: '#EAB308', color: '#000' }}>
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Criar
          </button>
        </div>
      }>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
          Utilizadores actuais ({users.length})
        </p>
        {loadingUsers
          ? <p className="text-xs" style={{ color: T.subtle }}>A carregar…</p>
          : users.length === 0
            ? <p className="text-xs" style={{ color: T.subtle }}>Nenhum utilizador</p>
            : (
              <div className="space-y-1.5">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: T.text }}>{u.name}</p>
                      <p className="text-xs" style={{ color: T.subtle }}>{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={u.role} color={u.role === 'admin' ? '#EAB308' : T.subtle} />
                      {!u.isActive && <Badge label="inactivo" color="#EF4444" />}
                    </div>
                  </div>
                ))}
              </div>
            )
        }
      </div>

      <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.muted }}>Novo utilizador</p>
        {err && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>{err}</p>}
        <Field label="Nome completo"><Input value={name} onChange={setName} placeholder="João Silva" /></Field>
        <Field label="Email"><Input value={email} onChange={setEmail} placeholder="joao@empresa.pt" type="email" /></Field>
        <Field label="Password">
          <div className="relative">
            <Input value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" type={showPw ? 'text' : 'password'} />
            <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.subtle }}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Role">
          <Select value={role} onChange={setRole}>
            <option value="admin">Admin</option>
            <option value="financial">Financeiro</option>
            <option value="viewer">Viewer</option>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}

// ─── TenantRow ────────────────────────────────────────────────────────────────

function TenantRow({ tenant, onUpdate, onCreateUser }: {
  tenant: Tenant; onUpdate: () => void; onCreateUser: (t: Tenant) => void
}) {
  const [open, setOpen]               = useState(false)
  const [plan, setPlan]               = useState<Plan>(tenant.plan)
  const [planExpires, setPlanExpires] = useState(tenant.planExpiresAt ? tenant.planExpiresAt.slice(0, 10) : '')
  const [trialEnds, setTrialEnds]     = useState(tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : '')
  const [extendDays, setExtendDays]   = useState('14')
  const [freeMonths, setFreeMonths]   = useState('12')
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

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
      showToast('Plano actualizado'); onUpdate()
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
      showToast(tenant.isActive ? 'Desactivado' : 'Activado'); onUpdate()
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
      showToast(`Trial +${days} dias`); onUpdate()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
    finally { setSaving(false) }
  }

  async function grantFree() {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenant.id}/grant-free`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ plan: 'pro', months: parseInt(freeMonths) || 12 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      showToast(`Acesso Pro gratuito por ${freeMonths} meses concedido!`); onUpdate()
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

      <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex-shrink-0">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold" style={{ color: T.text }}>{tenant.name}</span>
            <span className="text-xs font-mono" style={{ color: T.subtle }}>{tenant.slug}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: `${PLAN_COLOR[tenant.plan]}18`, color: PLAN_COLOR[tenant.plan] }}>
              {PLAN_LABEL[tenant.plan]}
            </span>
            {(tenant.trialExpired || tenant.planExpired) && (
              <Badge label={tenant.trialExpired ? 'Trial expirado' : 'Plano expirado'} color="#EF4444" />
            )}
            {!tenant.isActive && <Badge label="Inactivo" color="#6B7280" />}
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap text-xs" style={{ color: T.subtle }}>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{tenant.usage.users} admins</span>
            <span className="flex items-center gap-1"><HardHat className="h-3 w-3" />{tenant.usage.operators} ops</span>
            <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{tenant.usage.ordersMonth} ordens/mês</span>
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{tenant.usage.machines} máq</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />desde {fmtDate(tenant.createdAt)}</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: T.subtle }} />
      </button>

      {open && (
        <div className="border-t px-4 pb-5 pt-4 space-y-5" style={{ borderColor: T.border }}>

          {/* Acesso gratuito */}
          <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#22C55E' }}>
              <Gift className="h-3.5 w-3.5" /> Acesso Gratuito — Beta / Parceria
            </p>
            <p className="text-xs" style={{ color: T.subtle }}>
              Concede plano Pro sem pagamento. Ideal para empresas em beta ou parcerias estratégicas.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                <input type="number" value={freeMonths} onChange={e => setFreeMonths(e.target.value)}
                  min={1} max={60}
                  className="w-14 px-2 py-1.5 text-xs text-center outline-none bg-white"
                />
                <span className="px-2 text-xs" style={{ color: T.subtle }}>meses</span>
              </div>
              <button onClick={grantFree} disabled={saving}
                className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold disabled:opacity-50"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}>
                <Gift className="h-3.5 w-3.5" /> Conceder acesso gratuito
              </button>
            </div>
          </div>

          {/* Plano manual */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>Plano manual</p>
            <div className="flex flex-wrap gap-2">
              {PLANS.map(p => (
                <button key={p} onClick={() => setPlan(p)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={plan === p
                    ? { background: PLAN_COLOR[p], color: '#fff' }
                    : { background: T.bg, color: T.subtle, border: `1px solid ${T.border}` }
                  }>
                  {PLAN_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Trial termina em</label>
              <input type="date" value={trialEnds} onChange={e => setTrialEnds(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Plano expira em</label>
              <input type="date" value={planExpires} onChange={e => setPlanExpires(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={savePlan} disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: '#EAB308', color: '#000' }}>
              {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Guardar plano
            </button>
            <div className="flex items-center gap-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              <input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)}
                min={1} max={365}
                className="w-14 px-2 py-2 text-xs text-center outline-none bg-white"
              />
              <button onClick={extendTrial} disabled={saving}
                className="px-3 py-2 text-xs font-semibold"
                style={{ background: T.border, color: T.muted }}>
                +dias trial
              </button>
            </div>
            <button onClick={() => onCreateUser(tenant)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
              style={{ background: T.bg, color: T.muted, border: `1px solid ${T.border}` }}>
              <UserPlus className="h-3.5 w-3.5" /> Utilizadores
            </button>
            <button onClick={toggleStatus} disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-bold ml-auto"
              style={{
                background: tenant.isActive ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.07)',
                color: tenant.isActive ? '#EF4444' : '#22C55E',
                border: `1px solid ${tenant.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
              }}>
              {tenant.isActive ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [tenants, setTenants]     = useState<Tenant[]>([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [userModal, setUserModal] = useState<Tenant | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/superadmin/tenants`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTenants(data)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erro ao carregar', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const active  = tenants.filter(t => t.isActive)
  const paid    = tenants.filter(t => !['trial'].includes(t.plan) && t.isActive)
  const expired = tenants.filter(t => t.trialExpired || t.planExpired)

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {userModal && (
        <CreateUserModal tenant={userModal} onClose={() => setUserModal(null)} onSaved={load} />
      )}

      <PageHeader
        title="Super Admin"
        sub={`${tenants.length} tenant${tenants.length !== 1 ? 's' : ''} · ${active.length} activo${active.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Shield className="h-3.5 w-3.5" /> SUPER ADMIN
            </div>
            <button onClick={load}
              className="rounded-xl p-2 hover:opacity-80"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: T.muted }} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tenants activos', value: active.length, color: '#22C55E' },
          { label: 'Planos pagos', value: paid.length, color: '#EAB308' },
          { label: 'Em trial', value: tenants.filter(t => t.plan === 'trial').length, color: '#3B82F6' },
          { label: 'Expirados', value: expired.length, color: expired.length > 0 ? '#EF4444' : T.subtle },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{k.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: '#EAB308' }} />
        </div>
      ) : tenants.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: T.subtle }}>Nenhum tenant</p>
      ) : (
        <div className="space-y-2">
          {tenants.map(t => <TenantRow key={t.id} tenant={t} onUpdate={load} onCreateUser={setUserModal} />)}
        </div>
      )}
    </div>
  )
}
