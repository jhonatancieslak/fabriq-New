// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Users } from 'lucide-react'
import { api, type Client } from '@/lib/api'
import {
  T, Toast, Modal, Btn, Field, Input, Textarea, ErrorMsg,
  PageHeader, Table, Tr, Td, Pagination, Empty,
  ActionBtn, TableToolbar, exportCSV, printOrPDF,
} from '@/components/ui/admin-ui'

interface FormState { name: string; taxId: string; email: string; phone: string; address: string }
const EMPTY: FormState = { name: '', taxId: '', email: '', phone: '', address: '' }

function ClientModal({ client, onClose, onDone }: { client: Client | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<FormState>(client
    ? { name: client.name, taxId: client.taxId ?? '', email: client.email ?? '', phone: client.phone ?? '', address: client.address ?? '' }
    : EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof FormState) { return (v: string) => setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const payload = { ...form, taxId: form.taxId || undefined, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined }
      if (client) await api.clients.update(client.id, payload)
      else await api.clients.create(payload)
      onDone()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(false) }
  }

  return (
    <Modal title={client ? 'Editar Cliente' : 'Novo Cliente'} sub={client?.name} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose} className="flex-1">Cancelar</Btn><Btn onClick={submit} disabled={loading} className="flex-1">{loading ? 'A guardar…' : 'Guardar'}</Btn></>}>
      <Field label="Nome *"><Input value={form.name} onChange={set('name')} placeholder="Nome do cliente" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NIF" hint="— opcional"><Input value={form.taxId} onChange={set('taxId')} placeholder="123456789" /></Field>
        <Field label="Telefone" hint="— opcional"><Input value={form.phone} onChange={set('phone')} placeholder="+351 912 000 000" /></Field>
      </div>
      <Field label="Email" hint="— opcional"><Input value={form.email} onChange={set('email')} type="email" placeholder="cliente@empresa.pt" /></Field>
      <Field label="Morada" hint="— opcional"><Textarea value={form.address} onChange={set('address')} placeholder="Rua, cidade, código postal…" rows={2} /></Field>
      {error && <ErrorMsg msg={error} />}
    </Modal>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20
  const [modal, setModal] = useState<Client | null | 'new'>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try { setClients(await api.clients.list()) }
    catch { showToast('Erro ao carregar clientes', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clients.filter(c =>
      c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.taxId ?? '').includes(q)
    ))
    setPage(1)
  }, [search, clients])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pages = Math.ceil(filtered.length / PER_PAGE)

  async function handleDelete(c: Client) {
    if (!confirm(`Remover "${c.name}"?`)) return
    try { await api.clients.delete(c.id); showToast('Cliente removido'); load() }
    catch (e) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
  }

  const HEADERS = ['Cliente', 'NIF', 'Email', 'Telefone']
  function rows() { return filtered.map(c => [c.name, c.taxId ?? '', c.email ?? '', c.phone ?? '']) }

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader title="Clientes" sub={`${filtered.length} cliente${filtered.length !== 1 ? 's' : ''}`}
        action={<Btn onClick={() => setModal('new')}><Plus className="h-4 w-4" />Novo Cliente</Btn>} />

      <TableToolbar
        search={search} onSearch={setSearch} placeholder="Pesquisar por nome, email ou NIF…"
        onPrint={() => printOrPDF('Clientes', HEADERS, rows(), 'print')}
        onXLS={() => exportCSV('clientes', HEADERS, rows())}
        onPDF={() => printOrPDF('Clientes', HEADERS, rows(), 'pdf')}
      />

      <Table headers={[...HEADERS, 'Ações']} loading={loading}>
        {paginated.length === 0 && !loading ? (
          <tr><td colSpan={5}><Empty icon={Users} title="Nenhum cliente encontrado" sub="Crie o primeiro cliente para começar" /></td></tr>
        ) : paginated.map((c, i) => (
          <Tr key={c.id} last={i === paginated.length - 1}>
            <Td>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: T.border, color: T.muted }}>{c.name[0].toUpperCase()}</div>
                <span className="text-sm font-semibold" style={{ color: T.text }}>{c.name}</span>
              </div>
            </Td>
            <Td><span className="text-sm font-mono" style={{ color: T.muted }}>{c.taxId ?? '—'}</span></Td>
            <Td><span className="text-sm" style={{ color: T.muted }}>{c.email ?? '—'}</span></Td>
            <Td><span className="text-sm" style={{ color: T.muted }}>{c.phone ?? '—'}</span></Td>
            <Td>
              <div className="flex items-center gap-1.5">
                <ActionBtn variant="edit"   onClick={() => setModal(c)} title="Editar" />
                <ActionBtn variant="delete" onClick={() => handleDelete(c)} title="Remover" />
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />

      {modal !== null && (
        <ClientModal client={modal === 'new' ? null : modal as Client} onClose={() => setModal(null)}
          onDone={() => { setModal(null); showToast(modal === 'new' ? 'Cliente criado' : 'Cliente actualizado'); load() }} />
      )}
    </div>
  )
}
