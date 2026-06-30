// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, HardHat, QrCode, Copy, Check } from 'lucide-react'
import { api, type Operator } from '@/lib/api'
import { confirmDisable } from '@/lib/confirm'
import {
  T, Toast, Modal, Btn, Field, Input, ErrorMsg,
  PageHeader, Table, Tr, Td, Pagination, Badge, Empty,
  ActionBtn, TableToolbar, exportCSV, printOrPDF,
} from '@/components/ui/admin-ui'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': (typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') : null) ?? 'demo',
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''}`,
  }
}

interface OperatorExt extends Operator { email?: string }
interface FormState { name: string; username: string; password: string; phone: string; email: string }
const EMPTY: FormState = { name: '', username: '', password: '', phone: '', email: '' }

function OperatorModal({ operator, onClose, onDone }: {
  operator: OperatorExt | null; onClose: () => void; onDone: () => void
}) {
  const isEdit = !!operator
  const [form, setForm] = useState<FormState>(operator
    ? { name: operator.name, username: operator.username, password: '', phone: operator.phone ?? '', email: operator.email ?? '' }
    : EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof FormState) { return (v: string) => setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    if (!isEdit && !form.username.trim()) { setError('Username é obrigatório'); return }
    if (!isEdit && form.password.length < 6) { setError('Password mínima 6 caracteres'); return }
    setLoading(true); setError('')
    try {
      const payload: Record<string, string> = { name: form.name, username: form.username }
      if (form.phone) payload.phone = form.phone
      if (form.email) payload.email = form.email
      if (form.password) payload.password = form.password
      const url  = isEdit ? `${BASE}/api/v1/operators/${operator!.id}` : `${BASE}/api/v1/operators`
      const meth = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, { method: meth, headers: authHeaders(), body: JSON.stringify(payload) })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Erro') }
      onDone()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(false) }
  }

  return (
    <Modal title={isEdit ? 'Editar Operador' : 'Novo Operador'} sub={operator?.name} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose} className="flex-1">Cancelar</Btn><Btn onClick={submit} disabled={loading} className="flex-1">{loading ? 'A guardar…' : 'Guardar'}</Btn></>}>
      <Field label="Nome completo *">
        <Input value={form.name} onChange={set('name')} placeholder="Ex: João Ferreira" />
      </Field>
      <Field label="Username *" hint="letras minúsculas, números, . _ -">
        <Input value={form.username} onChange={set('username')} placeholder="joao.ferreira" disabled={isEdit} />
      </Field>
      <Field label={isEdit ? 'Nova password' : 'Password *'} hint={isEdit ? '— vazio = não alterar' : '— mín. 6 caracteres'}>
        <Input value={form.password} onChange={set('password')} type="password" placeholder={isEdit ? '••••••' : 'Mínimo 6 caracteres'} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telemóvel" hint="— opcional">
          <Input value={form.phone} onChange={set('phone')} placeholder="+351 912…" />
        </Field>
        <Field label="Email" hint="— opcional">
          <Input value={form.email} onChange={set('email')} type="email" placeholder="op@empresa.pt" />
        </Field>
      </div>
      {error && <ErrorMsg msg={error} />}
    </Modal>
  )
}

function PwaAccessModal({ operator, onClose }: { operator: OperatorExt; onClose: () => void }) {
  const pwaUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/pwa/login?u=${encodeURIComponent(operator.username)}`
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(pwaUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2200)
  }

  return (
    <Modal title="Acesso PWA" sub={operator.name} onClose={onClose}
      footer={<Btn onClick={onClose} className="w-full">Fechar</Btn>}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <QrCode className="h-10 w-10" style={{ color: T.subtle }} />
          </div>
        </div>
        <p className="text-xs text-center" style={{ color: T.subtle }}>
          Na PWA, cada operador tem um QR code gerado automaticamente. Partilhe o link abaixo para acesso directo.
        </p>
        <div className="rounded-xl px-3 py-2.5 text-xs font-mono break-all"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}>
          {pwaUrl}
        </div>
      </div>
      <div className="rounded-2xl p-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold mb-2" style={{ color: T.subtle }}>Credenciais</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span style={{ color: T.faint }}>Username</span>
            <p className="font-mono font-bold mt-0.5" style={{ color: T.text }}>{operator.username}</p>
          </div>
          <div>
            <span style={{ color: T.faint }}>Password</span>
            <p className="mt-0.5" style={{ color: T.subtle }}>Definida no registo</p>
          </div>
        </div>
      </div>
      <Btn variant="ghost" onClick={copyLink} className="w-full">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Link copiado!' : 'Copiar link PWA'}
      </Btn>
    </Modal>
  )
}

const PER_PAGE = 15

export default function OperatorsPage() {
  const [all, setAll] = useState<OperatorExt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<OperatorExt | null | 'new'>(null)
  const [pwaModal, setPwaModal] = useState<OperatorExt | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try { setAll(await api.operators.list() as OperatorExt[]) }
    catch { showToast('Erro ao carregar operadores', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  const filtered = all.filter(o =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.username.toLowerCase().includes(search.toLowerCase()) ||
    (o.phone ?? '').includes(search)
  )
  const pages   = Math.ceil(filtered.length / PER_PAGE)
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  async function deactivate(op: OperatorExt) {
    if (!(await confirmDisable(op.name))) return
    try {
      const r = await fetch(`${BASE}/api/v1/operators/${op.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error()
      showToast('Operador desactivado'); load()
    } catch { showToast('Erro ao desactivar', 'err') }
  }

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader title="Operadores" sub={`${filtered.length} operador${filtered.length !== 1 ? 'es' : ''}`}
        action={<Btn onClick={() => setModal('new')}><Plus className="h-4 w-4" />Novo Operador</Btn>} />

      <TableToolbar
        search={search} onSearch={setSearch} placeholder="Pesquisar operadores…"
        onPrint={() => printOrPDF('Operadores', ['Nome', 'Username', 'Telemóvel', 'Email'],
          all.map(o => [o.name, o.username, o.phone ?? '', o.email ?? '']), 'print')}
        onXLS={() => exportCSV('operadores', ['Nome', 'Username', 'Telemóvel', 'Email'],
          all.map(o => [o.name, o.username, o.phone ?? '', o.email ?? '']))}
        onPDF={() => printOrPDF('Operadores', ['Nome', 'Username', 'Telemóvel', 'Email'],
          all.map(o => [o.name, o.username, o.phone ?? '', o.email ?? '']), 'pdf')}
      />

      <Table headers={['Operador', 'Username', 'Telemóvel', 'Ações']} loading={loading}>
        {visible.length === 0 && !loading ? (
          <tr><td colSpan={4}>
            <Empty icon={HardHat} title="Nenhum operador" sub="Crie o primeiro operador para o chão de fábrica" />
          </td></tr>
        ) : visible.map((op, i) => (
          <Tr key={op.id} last={i === visible.length - 1}>
            <Td>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.border }}>
                  <HardHat className="h-4 w-4" style={{ color: T.muted }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: T.text }}>{op.name}</span>
              </div>
            </Td>
            <Td><Badge label={`@${op.username}`} /></Td>
            <Td>
              <span className="text-sm font-mono" style={{ color: op.phone ? T.text : T.faint }}>
                {op.phone ?? '—'}
              </span>
            </Td>
            <Td>
              <div className="flex items-center gap-1.5">
                <ActionBtn variant="qr"      onClick={() => setPwaModal(op)} title="Acesso PWA" label="QR" />
                <ActionBtn variant="edit"    onClick={() => setModal(op)} title="Editar" />
                <ActionBtn variant="disable" onClick={() => deactivate(op)} title="Desactivar" />
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />

      {modal !== null && (
        <OperatorModal
          operator={modal === 'new' ? null : modal as OperatorExt}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); showToast(modal === 'new' ? 'Operador criado' : 'Actualizado'); load() }}
        />
      )}
      {pwaModal && <PwaAccessModal operator={pwaModal} onClose={() => setPwaModal(null)} />}
    </div>
  )
}
