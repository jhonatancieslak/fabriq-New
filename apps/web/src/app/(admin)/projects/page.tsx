// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, FolderOpen, Pencil, User } from 'lucide-react'
import { api, type Project, type Client } from '@/lib/api'
import {
  T, Toast, Modal, Btn, Field, Input, Select, Textarea, ErrorMsg,
  PageHeader, SearchBar, Table, Tr, Td, Pagination, Badge, Empty, Combobox,
} from '@/components/ui/admin-ui'

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa', completed: 'Concluída', cancelled: 'Cancelada', on_hold: 'Em espera',
}
const STATUS_COLOR: Record<string, string> = {
  active: '#22C55E', completed: '#A78BFA', cancelled: '#EF4444', on_hold: '#9CA3AF',
}

interface ProjectForm { clientId: string; code: string; name: string; description: string; status: string }
interface ClientForm  { name: string; email: string; phone: string }
const EMPTY_PROJECT: ProjectForm = { clientId: '', code: '', name: '', description: '', status: 'active' }
const EMPTY_CLIENT:  ClientForm  = { name: '', email: '', phone: '' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ProjectModal({ project, clients, onClose, onDone, onClientCreated }: {
  project: Project | null
  clients: Client[]
  onClose: () => void
  onDone: (msg: string) => void
  onClientCreated: (c: Client) => void
}) {
  const [form, setForm] = useState<ProjectForm>(project
    ? { clientId: project.clientId, code: project.code, name: project.name,
        description: (project as Project & { description?: string }).description ?? '',
        status: project.status }
    : EMPTY_PROJECT)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [clientForm, setClientForm]     = useState<ClientForm>(EMPTY_CLIENT)
  const [clientLoading, setClientLoading] = useState(false)
  const [clientError, setClientError]   = useState('')

  function set(k: keyof ProjectForm) { return (v: string) => setForm(f => ({ ...f, [k]: v })) }
  function setC(k: keyof ClientForm) { return (v: string) => setClientForm(f => ({ ...f, [k]: v })) }

  const clientOptions = clients.map(c => ({ id: c.id, label: c.name, sub: c.email ?? undefined }))

  async function createClient() {
    if (!clientForm.name.trim()) { setClientError('Nome obrigatório'); return }
    setClientLoading(true); setClientError('')
    try {
      const c = await api.clients.create({ name: clientForm.name.trim(), email: clientForm.email || undefined, phone: clientForm.phone || undefined })
      onClientCreated(c)
      setForm(f => ({ ...f, clientId: c.id }))
      setShowNewClient(false)
      setClientForm(EMPTY_CLIENT)
    } catch (e) { setClientError(e instanceof Error ? e.message : 'Erro') }
    finally { setClientLoading(false) }
  }

  async function submit() {
    if (!form.clientId) { setError('Seleccione um cliente'); return }
    if (!form.code.trim() || !form.name.trim()) { setError('Código e nome são obrigatórios'); return }
    setLoading(true); setError('')
    try {
      if (project) await api.projects.update(project.id, form)
      else await api.projects.create(form)
      onDone(project ? 'Obra actualizada' : 'Obra criada')
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(false) }
  }

  return (
    <Modal
      title={project ? 'Editar Obra' : 'Nova Obra'}
      sub={project?.name}
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose} className="flex-1">Cancelar</Btn><Btn onClick={submit} disabled={loading} className="flex-1">{loading ? 'A guardar…' : 'Guardar'}</Btn></>}
    >
      {/* Cliente */}
      <Field label="Cliente *">
        <Combobox
          options={clientOptions}
          value={form.clientId}
          onChange={set('clientId')}
          onCreate={name => { setClientForm(f => ({ ...f, name })); setShowNewClient(true) }}
          placeholder="Pesquisar ou criar cliente…"
          label={clients.find(c => c.id === form.clientId)?.name}
        />
      </Field>

      {/* Inline: criar cliente novo */}
      {showNewClient && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: T.yellowBg, border: `1px solid ${T.yellowBorder}` }}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 flex-shrink-0" style={{ color: T.yellow }} />
            <p className="text-sm font-semibold" style={{ color: T.yellow }}>Novo cliente</p>
          </div>
          <Field label="Nome *">
            <Input value={clientForm.name} onChange={setC('name')} placeholder="Nome da empresa ou pessoa" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" hint="— opcional">
              <Input value={clientForm.email} onChange={setC('email')} type="email" placeholder="geral@empresa.pt" />
            </Field>
            <Field label="Telefone" hint="— opcional">
              <Input value={clientForm.phone} onChange={setC('phone')} placeholder="+351 910 000 000" />
            </Field>
          </div>
          {clientError && <ErrorMsg msg={clientError} />}
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setShowNewClient(false)} className="flex-1">Cancelar</Btn>
            <Btn onClick={createClient} disabled={clientLoading} className="flex-1">
              {clientLoading ? 'A criar…' : 'Criar cliente'}
            </Btn>
          </div>
        </div>
      )}

      {/* Código + nome */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código *"><Input value={form.code} onChange={set('code')} placeholder="OB-2026-001" /></Field>
        <Field label="Nome *"><Input value={form.name} onChange={set('name')} placeholder="Armazém Braga" /></Field>
      </div>

      {/* Estado (só na edição) */}
      {project && (
        <Field label="Estado">
          <Select value={form.status} onChange={set('status')}>
            <option value="active">Activa</option>
            <option value="on_hold">Em espera</option>
            <option value="completed">Concluída</option>
            <option value="cancelled">Cancelada</option>
          </Select>
        </Field>
      )}

      <Field label="Descrição" hint="— opcional">
        <Textarea value={form.description} onChange={set('description')} placeholder="Notas sobre a obra…" rows={2} />
      </Field>

      {error && <ErrorMsg msg={error} />}
    </Modal>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients]   = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const PER_PAGE = 20
  const [modal, setModal] = useState<Project | null | 'new'>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([api.projects.list(), api.clients.list()])
      setProjects(p); setClients(c)
    } catch { showToast('Erro ao carregar obras', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(projects.filter(p =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) ||
      (p.client?.name ?? '').toLowerCase().includes(q)
    ))
    setPage(1)
  }, [search, projects])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader title="Obras" sub={`${filtered.length} obra${filtered.length !== 1 ? 's' : ''}`}
        action={<Btn onClick={() => setModal('new')}><Plus className="h-4 w-4" />Nova Obra</Btn>} />

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar por código, nome ou cliente…" />
      </div>

      <Table headers={['Obra', 'Código', 'Cliente', 'Estado', 'Data', 'Ações']} loading={loading}>
        {paginated.length === 0 && !loading ? (
          <tr><td colSpan={6}>
            <Empty icon={FolderOpen} title="Nenhuma obra encontrada" sub="Crie a primeira obra para começar" />
          </td></tr>
        ) : paginated.map((p, i) => (
          <Tr key={p.id} last={i === paginated.length - 1}>
            <Td><span className="text-sm font-semibold" style={{ color: T.text }}>{p.name}</span></Td>
            <Td><span className="text-sm font-mono" style={{ color: T.yellow }}>{p.code}</span></Td>
            <Td><span className="text-sm" style={{ color: T.muted }}>{p.client?.name ?? '—'}</span></Td>
            <Td><Badge label={STATUS_LABEL[p.status] ?? p.status} color={STATUS_COLOR[p.status] ?? T.subtle} /></Td>
            <Td><span className="text-sm" style={{ color: T.subtle }}>
              {(p as Project & { createdAt?: string }).createdAt ? fmtDate((p as Project & { createdAt?: string }).createdAt!) : '—'}
            </span></Td>
            <Td>
              <button onClick={() => setModal(p)} className="p-2 rounded-lg hover:bg-gray-100" title="Editar">
                <Pencil className="h-3.5 w-3.5" style={{ color: T.subtle }} />
              </button>
            </Td>
          </Tr>
        ))}
      </Table>

      <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />

      {modal !== null && (
        <ProjectModal
          project={modal === 'new' ? null : modal as Project}
          clients={clients}
          onClose={() => setModal(null)}
          onClientCreated={c => setClients(prev => [...prev, c])}
          onDone={msg => { setModal(null); showToast(msg); load() }}
        />
      )}
    </div>
  )
}
