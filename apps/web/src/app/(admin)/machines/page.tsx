// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Cpu, Pencil, Power, Settings2 } from 'lucide-react'
import { api, type Machine } from '@/lib/api'
import {
  T, Toast, Modal, Btn, Field, Input, Select, ErrorMsg,
  PageHeader, SearchBar, Table, Tr, Td, Pagination, Badge, Empty,
} from '@/components/ui/admin-ui'

// ─── Constants ────────────────────────────────────────────────────────────────

const MACHINE_TYPE_LABELS: Record<string, string> = {
  laser_cnc:   'Corte Laser / CNC',
  cnc_router:  'Router CNC',
  plasma:      'Corte Plasma',
  waterjet:    'Corte Água',
  bending:     'Quinagem',
  guillotine:  'Guilhotina',
  welding:     'Soldadura',
  turning:     'Tornagem',
  milling:     'Fresagem',
  other:       'Outro',
}

interface MachineExt extends Machine {
  costPerHour?: number | null
  minBilledMinutes?: number | null
  costPerMinAfterMin?: number | null
  materialCostEnabled?: boolean
  marginPercent?: number | null
  isActive?: boolean
  serial?: string
}

interface MachinesResponse { machines: MachineExt[]; total: number; page: number; pages: number }

interface FormState {
  name: string; type: string; model: string; serial: string
  costPerHour: string; minBilledMinutes: string; costPerMinAfterMin: string
  materialCostEnabled: boolean; marginPercent: string
}

const EMPTY_FORM: FormState = {
  name: '', type: 'laser_cnc', model: '', serial: '',
  costPerHour: '', minBilledMinutes: '', costPerMinAfterMin: '',
  materialCostEnabled: false, marginPercent: '',
}

function fmtEuro(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
}

// ─── Machine Modal ────────────────────────────────────────────────────────────

function MachineModal({ machine, onClose, onDone }: {
  machine: MachineExt | null; onClose: () => void; onDone: () => void
}) {
  const isEdit = !!machine
  const [form, setForm] = useState<FormState>(machine ? {
    name: machine.name, type: machine.type, model: machine.model ?? '', serial: machine.serial ?? '',
    costPerHour: machine.costPerHour != null ? String(machine.costPerHour) : '',
    minBilledMinutes: machine.minBilledMinutes != null ? String(machine.minBilledMinutes) : '',
    costPerMinAfterMin: machine.costPerMinAfterMin != null ? String(machine.costPerMinAfterMin) : '',
    materialCostEnabled: machine.materialCostEnabled ?? false,
    marginPercent: machine.marginPercent != null ? String(machine.marginPercent) : '',
  } : EMPTY_FORM)
  const [tab, setTab] = useState<'info' | 'cost'>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof FormState) {
    return (v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  }

  async function submit() {
    setLoading(true); setError('')
    try {
      const payload = {
        name: form.name, type: form.type,
        model: form.model || undefined, serial: form.serial || undefined,
        costPerHour: form.costPerHour ? Number(form.costPerHour) : null,
        minBilledMinutes: form.minBilledMinutes ? Number(form.minBilledMinutes) : null,
        costPerMinAfterMin: form.costPerMinAfterMin ? Number(form.costPerMinAfterMin) : null,
        materialCostEnabled: form.materialCostEnabled,
        marginPercent: form.marginPercent ? Number(form.marginPercent) : null,
      }
      if (isEdit && machine) {
        await api.machines.update(machine.id, payload)
      } else {
        await api.machines.create(payload)
      }
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Máquina' : 'Nova Máquina'}
      sub={isEdit ? machine?.name : undefined}
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} className="flex-1">Cancelar</Btn>
          <Btn onClick={submit} disabled={loading} className="flex-1">
            {loading ? 'A guardar…' : 'Guardar'}
          </Btn>
        </>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl -mt-1" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        {(['info', 'cost'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 text-sm font-medium transition-all"
            style={tab === t ? { background: T.yellow, color: '#07080A' } : { color: T.subtle }}>
            {t === 'info' ? 'Informações' : 'Parâmetros de Custo'}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
          <Field label="Nome *">
            <Input value={form.name} onChange={set('name')} placeholder="Ex: Laser 3015" />
          </Field>
          <Field label="Tipo *">
            <Select value={form.type} onChange={set('type')}>
              {Object.entries(MACHINE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modelo">
              <Input value={form.model} onChange={set('model')} placeholder="Ex: Fiber 3015" />
            </Field>
            <Field label="Nº Série">
              <Input value={form.serial} onChange={set('serial')} placeholder="Ex: SN-001" />
            </Field>
          </div>
        </>
      )}

      {tab === 'cost' && (
        <>
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: T.bg, color: T.subtle }}>
            Estes valores são usados para calcular automaticamente o custo sugerido na faturação com base no tempo de corte registado.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Custo / Hora (€)" hint="— opcional">
              <Input value={form.costPerHour} onChange={set('costPerHour')} placeholder="Ex: 60.00" type="number" />
            </Field>
            <Field label="Tempo mínimo (min)" hint="— opcional">
              <Input value={form.minBilledMinutes} onChange={set('minBilledMinutes')} placeholder="Ex: 15" type="number" />
            </Field>
          </div>
          <Field label="Custo / min após mínimo (€)" hint="— opcional">
            <Input value={form.costPerMinAfterMin} onChange={set('costPerMinAfterMin')} placeholder="Ex: 1.20" type="number" />
          </Field>
          <Field label="Margem (%)" hint="— opcional">
            <Input value={form.marginPercent} onChange={set('marginPercent')} placeholder="Ex: 20" type="number" />
          </Field>
          <label className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: form.materialCostEnabled ? T.yellow : T.surface, border: `1px solid ${T.border}` }}
              onClick={() => set('materialCostEnabled')(!form.materialCostEnabled)}>
              {form.materialCostEnabled && <svg className="h-3 w-3" viewBox="0 0 12 12" fill="#07080A"><path d="M2 6l3 3 5-5" stroke="#07080A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
            </div>
            <div onClick={() => set('materialCostEnabled')(!form.materialCostEnabled)}>
              <p className="text-sm font-medium" style={{ color: T.text }}>Incluir custo de material</p>
              <p className="text-xs" style={{ color: T.subtle }}>O custo de material do item é somado ao custo de tempo</p>
            </div>
          </label>
        </>
      )}

      {error && <ErrorMsg msg={error} />}
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MachinesPage() {
  const [data, setData] = useState<MachinesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState<MachineExt | null | 'new'>('new' as never)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // fix initial state
  useEffect(() => { setModal(null) }, [])

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.machines.list({ search: search || undefined, page, includeInactive })
      setData(res as unknown as MachinesResponse)
    } catch {
      showToast('Erro ao carregar máquinas', 'err')
    } finally {
      setLoading(false)
    }
  }, [search, page, includeInactive])

  useEffect(() => { setPage(1) }, [search, includeInactive])
  useEffect(() => { load() }, [load])

  async function deactivate(m: MachineExt) {
    if (!confirm(`Desactivar "${m.name}"?`)) return
    try {
      await api.machines.delete(m.id)
      showToast('Máquina desactivada')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro', 'err')
    }
  }

  const machines = data?.machines ?? []

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader
        title="Máquinas"
        sub={data ? `${data.total} máquina${data.total !== 1 ? 's' : ''}` : ''}
        action={
          <Btn onClick={() => setModal({} as MachineExt)}>
            <Plus className="h-4 w-4" /> Nova Máquina
          </Btn>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar máquinas…" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: includeInactive ? T.yellow : T.surface, border: `1px solid ${T.border}` }}
            onClick={() => setIncludeInactive(v => !v)}>
            {includeInactive && <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#07080A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <span className="text-sm" style={{ color: T.muted }}>Incluir inactivas</span>
        </label>
      </div>

      {/* Table */}
      <Table
        headers={['Máquina', 'Tipo', 'Modelo', 'Custo/h', 'Mín. (min)', 'Margem', 'Estado', 'Ações']}
        loading={loading}
      >
        {machines.length === 0 && !loading ? (
          <tr><td colSpan={8}>
            <Empty icon={Cpu} title="Nenhuma máquina encontrada" sub="Crie a primeira máquina para começar" />
          </td></tr>
        ) : machines.map((m, i) => (
          <Tr key={m.id} last={i === machines.length - 1}>
            <Td>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.yellowBg }}>
                  <Settings2 className="h-4 w-4" style={{ color: T.yellow }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: T.text }}>{m.name}</p>
                  {m.serial && <p className="text-xs" style={{ color: T.subtle }}>#{m.serial}</p>}
                </div>
              </div>
            </Td>
            <Td>
              <Badge label={MACHINE_TYPE_LABELS[m.type] ?? m.type} />
            </Td>
            <Td>
              <span className="text-sm" style={{ color: T.muted }}>{m.model ?? '—'}</span>
            </Td>
            <Td>
              <span className="text-sm font-mono" style={{ color: m.costPerHour ? T.text : T.faint }}>
                {fmtEuro(m.costPerHour)}
              </span>
            </Td>
            <Td>
              <span className="text-sm" style={{ color: m.minBilledMinutes ? T.text : T.faint }}>
                {m.minBilledMinutes != null ? `${m.minBilledMinutes} min` : '—'}
              </span>
            </Td>
            <Td>
              <span className="text-sm" style={{ color: m.marginPercent ? T.text : T.faint }}>
                {m.marginPercent != null ? `${m.marginPercent}%` : '—'}
              </span>
            </Td>
            <Td>
              <Badge
                label={m.isActive !== false ? 'Activa' : 'Inactiva'}
                color={m.isActive !== false ? '#22C55E' : T.faint}
              />
            </Td>
            <Td>
              <div className="flex items-center gap-1">
                <button onClick={() => setModal(m)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/5"
                  title="Editar">
                  <Pencil className="h-3.5 w-3.5" style={{ color: T.subtle }} />
                </button>
                {m.isActive !== false && (
                  <button onClick={() => deactivate(m)}
                    className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                    title="Desactivar">
                    <Power className="h-3.5 w-3.5" style={{ color: T.faint }} />
                  </button>
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      {data && (
        <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
      )}

      {modal !== null && (
        <MachineModal
          machine={Object.keys(modal as object).length === 0 ? null : modal as MachineExt}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); showToast(modal && Object.keys(modal as object).length > 0 ? 'Máquina actualizada' : 'Máquina criada'); load() }}
        />
      )}
    </div>
  )
}
