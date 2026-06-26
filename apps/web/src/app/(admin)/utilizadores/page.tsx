// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Users, Shield, DollarSign, Send, Eye, Pencil, KeyRound, Power } from 'lucide-react'
import { api, type AppUser } from '@/lib/api'
import {
  T, Toast, Modal, Btn, Field, Input, Select, ErrorMsg,
  PageHeader, SearchBar, Table, Tr, Td, Empty, Badge,
} from '@/components/ui/admin-ui'

const ROLES: Record<string, { label: string; icon: React.ReactNode }> = {
  admin:     { label: 'Admin',        icon: <Shield className="h-3 w-3" /> },
  financial: { label: 'Financeiro',   icon: <DollarSign className="h-3 w-3" /> },
  requester: { label: 'Solicitador',  icon: <Send className="h-3 w-3" /> },
  viewer:    { label: 'Visualizador', icon: <Eye className="h-3 w-3" /> },
}

type ModalMode = 'create' | 'edit' | 'password' | null

interface FormState { name: string; email: string; password: string; role: string }
const DEFAULT_FORM: FormState = { name: '', email: '', password: '', role: 'viewer' }

export default function UtilizadoresPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<AppUser | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await api.users.list()) }
    catch { showToast('Erro ao carregar utilizadores', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setSelected(null); setForm(DEFAULT_FORM); setError(''); setModal('create') }
  function openEdit(u: AppUser) { setSelected(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setError(''); setModal('edit') }
  function openPassword(u: AppUser) { setSelected(u); setForm({ ...DEFAULT_FORM, name: u.name }); setError(''); setModal('password') }

  async function handleSubmit() {
    setError(''); setSubmitting(true)
    try {
      if (modal === 'create') await api.users.create({ name: form.name, email: form.email, password: form.password, role: form.role })
      else if (modal === 'edit' && selected) await api.users.update(selected.id, { name: form.name, email: form.email, role: form.role })
      else if (modal === 'password' && selected) await api.users.resetPassword(selected.id, form.password)
      setModal(null)
      showToast(modal === 'create' ? 'Utilizador criado' : modal === 'password' ? 'Password redefinida' : 'Utilizador actualizado')
      load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro desconhecido') }
    finally { setSubmitting(false) }
  }

  async function handleToggle(u: AppUser) {
    try { await api.users.toggle(u.id); showToast(u.isActive ? 'Utilizador desactivado' : 'Utilizador reactivado'); load() }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
  }

  const q = search.toLowerCase()
  const filtered = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  const active = filtered.filter(u => u.isActive)
  const inactive = filtered.filter(u => !u.isActive)

  const modalTitle = modal === 'create' ? 'Novo Utilizador' : modal === 'edit' ? 'Editar Utilizador' : 'Redefinir Password'

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader title="Utilizadores" sub={`${users.length} utilizador${users.length !== 1 ? 'es' : ''}`}
        action={<Btn onClick={openCreate}><Plus className="h-4 w-4" />Novo Utilizador</Btn>} />

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar por nome ou email…" />
      </div>

      {/* Activos */}
      {active.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.subtle }}>
            Activos ({active.length})
          </p>
          <Table headers={['Utilizador', 'Perfil', 'Último login', 'Ações']} loading={loading}>
            {active.map((u, i) => <UserRow key={u.id} user={u} last={i === active.length - 1}
              onEdit={openEdit} onPassword={openPassword} onToggle={handleToggle} />)}
          </Table>
        </div>
      )}

      {/* Inactivos */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.faint }}>
            Desactivados ({inactive.length})
          </p>
          <div style={{ opacity: 0.6 }}>
            <Table headers={['Utilizador', 'Perfil', 'Último login', 'Ações']} loading={false}>
              {inactive.map((u, i) => <UserRow key={u.id} user={u} last={i === inactive.length - 1}
                onEdit={openEdit} onPassword={openPassword} onToggle={handleToggle} />)}
            </Table>
          </div>
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <Empty icon={Users} title="Sem utilizadores registados" sub="Crie o primeiro utilizador da empresa" />
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={modalTitle} sub={selected?.email ?? selected?.name} onClose={() => setModal(null)}
          footer={<><Btn variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Btn>
            <Btn onClick={handleSubmit} disabled={submitting} className="flex-1">{submitting ? 'A guardar…' : 'Guardar'}</Btn></>}>
          {modal !== 'password' && (
            <>
              <Field label="Nome"><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Nome completo" /></Field>
              <Field label="Email"><Input value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" placeholder="utilizador@empresa.pt" /></Field>
              <Field label="Perfil">
                <Select value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))}>
                  <option value="admin">Admin — acesso total</option>
                  <option value="financial">Financeiro — faturação e relatórios</option>
                  <option value="requester">Solicitador — criar e acompanhar ordens</option>
                  <option value="viewer">Visualizador — só leitura</option>
                </Select>
              </Field>
            </>
          )}
          {(modal === 'create' || modal === 'password') && (
            <Field label={modal === 'password' ? 'Nova Password' : 'Password'}>
              <Input value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" placeholder="Mínimo 8 caracteres" />
            </Field>
          )}
          {error && <ErrorMsg msg={error} />}
        </Modal>
      )}
    </div>
  )
}

function UserRow({ user, last, onEdit, onPassword, onToggle }: {
  user: AppUser; last: boolean
  onEdit: (u: AppUser) => void; onPassword: (u: AppUser) => void; onToggle: (u: AppUser) => void
}) {
  const initials = user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const lastLogin = user.lastLoginAt
    ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(user.lastLoginAt))
    : 'Nunca'
  const role = ROLES[user.role] ?? { label: user.role, icon: null }

  return (
    <Tr last={last}>
      <Td>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: T.yellowBg, color: T.yellow }}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: T.text }}>{user.name}</p>
            <p className="text-xs" style={{ color: T.subtle }}>{user.email}</p>
          </div>
        </div>
      </Td>
      <Td>
        <Badge label={role.label} />
      </Td>
      <Td><span className="text-sm" style={{ color: T.subtle }}>{lastLogin}</span></Td>
      <Td>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(user)} className="p-2 rounded-lg hover:bg-white/5" title="Editar">
            <Pencil className="h-3.5 w-3.5" style={{ color: T.subtle }} />
          </button>
          <button onClick={() => onPassword(user)} className="p-2 rounded-lg hover:bg-white/5" title="Password">
            <KeyRound className="h-3.5 w-3.5" style={{ color: T.subtle }} />
          </button>
          <button onClick={() => onToggle(user)} className="p-2 rounded-lg hover:bg-red-500/10" title={user.isActive ? 'Desactivar' : 'Reactivar'}>
            <Power className="h-3.5 w-3.5" style={{ color: user.isActive ? T.faint : '#22C55E' }} />
          </button>
        </div>
      </Td>
    </Tr>
  )
}
