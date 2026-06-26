// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Package, Pencil, Power } from 'lucide-react'
import { api, type Material } from '@/lib/api'
import {
  T, Toast, Modal, Btn, Field, Input, Select, ErrorMsg,
  PageHeader, SearchBar, Table, Tr, Td, Pagination, Badge, Empty,
} from '@/components/ui/admin-ui'

const TYPE_LABELS: Record<string, string> = {
  steel: 'Aço Carbono', stainless: 'Inox', aluminum: 'Alumínio',
  copper: 'Cobre', brass: 'Latão', other: 'Outro',
}

interface MaterialExt extends Material {
  isActive?: boolean; costPerKg?: number | null; costPerM2?: number | null
}
interface MaterialsResponse { materials: MaterialExt[]; total: number; page: number; pages: number }

interface FormState { name: string; type: string; costPerKg: string; costPerM2: string }
const EMPTY: FormState = { name: '', type: 'steel', costPerKg: '', costPerM2: '' }

function fmt(n: number) { return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n) }

function MaterialModal({ material, onClose, onDone }: {
  material: MaterialExt | null; onClose: () => void; onDone: () => void
}) {
  const [form, setForm] = useState<FormState>(material ? {
    name: material.name, type: material.type,
    costPerKg: material.costPerKg != null ? String(material.costPerKg) : '',
    costPerM2: material.costPerM2 != null ? String(material.costPerM2) : '',
  } : EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof FormState) { return (v: string) => setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        name: form.name, type: form.type,
        costPerKg: form.costPerKg ? Number(form.costPerKg) : null,
        costPerM2: form.costPerM2 ? Number(form.costPerM2) : null,
      }
      if (material) await api.materials.update(material.id, payload)
      else await api.materials.create(payload)
      onDone()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(false) }
  }

  return (
    <Modal title={material ? 'Editar Material' : 'Novo Material'} sub={material?.name} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose} className="flex-1">Cancelar</Btn><Btn onClick={submit} disabled={loading} className="flex-1">{loading ? 'A guardar…' : 'Guardar'}</Btn></>}>
      <Field label="Nome *"><Input value={form.name} onChange={set('name')} placeholder="Ex: Aço S235 2mm" /></Field>
      <Field label="Tipo *">
        <Select value={form.type} onChange={set('type')}>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <div className="rounded-xl px-4 py-3 text-xs" style={{ background: T.bg, color: T.subtle }}>
        Custos usados no cálculo automático de faturação quando activado na máquina.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Custo / kg (€)" hint="— opcional">
          <Input value={form.costPerKg} onChange={set('costPerKg')} type="number" placeholder="Ex: 1.20" />
        </Field>
        <Field label="Custo / m² (€)" hint="— opcional">
          <Input value={form.costPerM2} onChange={set('costPerM2')} type="number" placeholder="Ex: 8.50" />
        </Field>
      </div>
      {error && <ErrorMsg msg={error} />}
    </Modal>
  )
}

export default function MaterialsPage() {
  const [data, setData] = useState<MaterialsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState<MaterialExt | null | 'new'>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.materials.list({ search: search || undefined, page, includeInactive })
      setData(res as unknown as MaterialsResponse)
    } catch { showToast('Erro ao carregar materiais', 'err') }
    finally { setLoading(false) }
  }, [search, page, includeInactive])

  useEffect(() => { setPage(1) }, [search, includeInactive])
  useEffect(() => { load() }, [load])

  async function deactivate(m: MaterialExt) {
    if (!confirm(`Desactivar "${m.name}"?`)) return
    try {
      await api.materials.delete(m.id)
      showToast('Material desactivado'); load()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
  }

  const materials = data?.materials ?? []

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader title="Materiais" sub={data ? `${data.total} material${data.total !== 1 ? 'is' : ''}` : ''}
        action={<Btn onClick={() => setModal('new')}><Plus className="h-4 w-4" />Novo Material</Btn>} />

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar materiais…" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="w-5 h-5 rounded-md flex items-center justify-center transition-colors"
            style={{ background: includeInactive ? T.yellow : T.surface, border: `1px solid ${T.border}` }}
            onClick={() => setIncludeInactive(v => !v)}>
            {includeInactive && <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#07080A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <span className="text-sm" style={{ color: T.muted }}>Incluir inactivos</span>
        </label>
      </div>

      <Table headers={['Material', 'Tipo', 'Custo / kg', 'Custo / m²', 'Estado', 'Ações']} loading={loading}>
        {materials.length === 0 && !loading ? (
          <tr><td colSpan={6}>
            <Empty icon={Package} title="Nenhum material encontrado" sub="Crie o primeiro material para o catálogo" />
          </td></tr>
        ) : materials.map((m, i) => (
          <Tr key={m.id} last={i === materials.length - 1}>
            <Td>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.border }}>
                  <Package className="h-4 w-4" style={{ color: T.muted }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: T.text }}>{m.name}</span>
              </div>
            </Td>
            <Td><Badge label={TYPE_LABELS[m.type] ?? m.type} /></Td>
            <Td>
              <span className="text-sm font-mono" style={{ color: m.costPerKg ? T.text : T.faint }}>
                {m.costPerKg != null ? fmt(Number(m.costPerKg)) : '—'}
              </span>
            </Td>
            <Td>
              <span className="text-sm font-mono" style={{ color: m.costPerM2 ? T.text : T.faint }}>
                {m.costPerM2 != null ? fmt(Number(m.costPerM2)) : '—'}
              </span>
            </Td>
            <Td>
              <Badge label={m.isActive !== false ? 'Activo' : 'Inactivo'}
                color={m.isActive !== false ? '#22C55E' : T.faint} />
            </Td>
            <Td>
              <div className="flex items-center gap-1">
                <button onClick={() => setModal(m)} className="p-2 rounded-lg hover:bg-white/5" title="Editar">
                  <Pencil className="h-3.5 w-3.5" style={{ color: T.subtle }} />
                </button>
                {m.isActive !== false && (
                  <button onClick={() => deactivate(m)} className="p-2 rounded-lg hover:bg-red-500/10" title="Desactivar">
                    <Power className="h-3.5 w-3.5" style={{ color: T.faint }} />
                  </button>
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}

      {modal !== null && (
        <MaterialModal
          material={modal === 'new' ? null : modal as MaterialExt}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null)
            showToast(modal === 'new' ? 'Material criado' : 'Material actualizado')
            load()
          }}
        />
      )}
    </div>
  )
}
