// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { Plus, Users, Shield, DollarSign, Send, Eye, MoreVertical, KeyRound, Power } from 'lucide-react'
import { api, type AppUser } from '@/lib/api'

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin:     { label: 'Admin',       color: 'bg-yellow-100 text-yellow-800', icon: <Shield className="h-3 w-3" /> },
  financial: { label: 'Financeiro',  color: 'bg-green-100 text-green-800',   icon: <DollarSign className="h-3 w-3" /> },
  requester: { label: 'Solicitador', color: 'bg-blue-100 text-blue-800',     icon: <Send className="h-3 w-3" /> },
  viewer:    { label: 'Visualizador',color: 'bg-slate-100 text-slate-600',   icon: <Eye className="h-3 w-3" /> },
}

function RoleBadge({ role }: { role: string }) {
  const r = ROLE_LABELS[role] ?? { label: role, color: 'bg-slate-100 text-slate-600', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${r.color}`}>
      {r.icon}{r.label}
    </span>
  )
}

type ModalMode = 'create' | 'edit' | 'password' | null

interface FormState {
  name: string; email: string; password: string; role: string
}

const DEFAULT_FORM: FormState = { name: '', email: '', password: '', role: 'viewer' }

export default function UtilizadoresPage() {
  const [users, setUsers]           = useState<AppUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<ModalMode>(null)
  const [selected, setSelected]     = useState<AppUser | null>(null)
  const [form, setForm]             = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [menuOpen, setMenuOpen]     = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.users.list().then(setUsers).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setSelected(null)
    setForm(DEFAULT_FORM)
    setError('')
    setModal('create')
  }

  function openEdit(u: AppUser) {
    setSelected(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setError('')
    setModal('edit')
    setMenuOpen(null)
  }

  function openPassword(u: AppUser) {
    setSelected(u)
    setForm({ ...DEFAULT_FORM, name: u.name })
    setError('')
    setModal('password')
    setMenuOpen(null)
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      if (modal === 'create') {
        await api.users.create({ name: form.name, email: form.email, password: form.password, role: form.role })
      } else if (modal === 'edit' && selected) {
        await api.users.update(selected.id, { name: form.name, email: form.email, role: form.role })
      } else if (modal === 'password' && selected) {
        await api.users.resetPassword(selected.id, form.password)
      }
      setModal(null)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(u: AppUser) {
    setMenuOpen(null)
    try {
      await api.users.toggle(u.id)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro')
    }
  }

  const active   = users.filter(u => u.isActive)
  const inactive = users.filter(u => !u.isActive)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilizadores</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestão de acesso ao painel administrativo</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-300 transition-colors">
          <Plus className="h-4 w-4" /> Novo Utilizador
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 animate-pulse py-12 text-center">A carregar...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Sem utilizadores registados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active users */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Activos ({active.length})
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {active.map(u => (
                <UserRow key={u.id} user={u} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
                  onEdit={openEdit} onPassword={openPassword} onToggle={handleToggle} />
              ))}
            </div>
          </div>

          {/* Inactive users */}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Desactivados ({inactive.length})
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 opacity-60">
                {inactive.map(u => (
                  <UserRow key={u.id} user={u} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
                    onEdit={openEdit} onPassword={openPassword} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {modal === 'create' ? 'Novo Utilizador' : modal === 'edit' ? 'Editar Utilizador' : 'Redefinir Password'}
              </h2>
              {modal === 'edit' && selected && (
                <p className="text-sm text-slate-500 mt-0.5">{selected.email}</p>
              )}
              {modal === 'password' && selected && (
                <p className="text-sm text-slate-500 mt-0.5">{selected.name}</p>
              )}
            </div>

            <div className="p-6 space-y-4">
              {modal !== 'password' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Perfil</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                      <option value="admin">Admin — acesso total</option>
                      <option value="financial">Financeiro — faturação e relatórios</option>
                      <option value="requester">Solicitador — criar e acompanhar ordens</option>
                      <option value="viewer">Visualizador — só leitura</option>
                    </select>
                  </div>
                </>
              )}

              {(modal === 'create' || modal === 'password') && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {modal === 'password' ? 'Nova Password' : 'Password'}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              )}

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 rounded-lg bg-yellow-400 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-300 disabled:opacity-50">
                {submitting ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserRow({ user, menuOpen, setMenuOpen, onEdit, onPassword, onToggle }: {
  user: AppUser
  menuOpen: string | null
  setMenuOpen: (id: string | null) => void
  onEdit: (u: AppUser) => void
  onPassword: (u: AppUser) => void
  onToggle: (u: AppUser) => void
}) {
  const initials = user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const lastLogin = user.lastLoginAt
    ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(user.lastLoginAt))
    : 'Nunca'

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-yellow-400">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 truncate">{user.name}</span>
          <RoleBadge role={user.role} />
          {!user.isActive && (
            <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Desactivado</span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</div>
      </div>

      <div className="hidden sm:block text-right flex-shrink-0">
        <div className="text-xs text-slate-400">Último login</div>
        <div className="text-xs text-slate-600 font-medium">{lastLogin}</div>
      </div>

      <div className="relative flex-shrink-0">
        <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen === user.id && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-lg z-10 overflow-hidden">
            <button onClick={() => onEdit(user)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Shield className="h-3.5 w-3.5 text-slate-400" /> Editar perfil
            </button>
            <button onClick={() => onPassword(user)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <KeyRound className="h-3.5 w-3.5 text-slate-400" /> Redefinir password
            </button>
            <div className="border-t border-slate-100" />
            <button onClick={() => onToggle(user)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 ${user.isActive ? 'text-red-600' : 'text-green-600'}`}>
              <Power className="h-3.5 w-3.5" />
              {user.isActive ? 'Desactivar' : 'Reactivar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
