// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Sliders } from 'lucide-react'
import { api, type CuttingParam } from '@/lib/api'
import { confirmDelete } from '@/lib/confirm'
import {
  T, Toast, Modal, Btn, Field, Input, Select, ErrorMsg,
  PageHeader, Table, Tr, Td, Pagination, Badge, Empty,
  ActionBtn, TableToolbar,
} from '@/components/ui/admin-ui'

const MATERIAL_LABELS: Record<string, string> = {
  steel: 'Aço Carbono', stainless: 'Inox', aluminum: 'Alumínio',
  copper: 'Cobre', brass: 'Latão', other: 'Outro',
}

const GAS_LABELS: Record<string, string> = { nitrogen: 'N₂', oxygen: 'O₂', air: 'Ar' }

const CUTTING_MACHINE_TYPES = ['laser_cnc', 'cnc_router', 'plasma', 'waterjet']
const MACHINE_TYPE_LABELS: Record<string, string> = {
  laser_cnc:  'Corte Laser / CNC',
  cnc_router: 'Router CNC',
  plasma:     'Corte Plasma',
  waterjet:   'Corte Água',
  bending:    'Quinagem',
  guillotine: 'Guilhotina',
}

const GROUPS = [
  { key: 'cutting',    label: 'Corte Laser', machineTypes: CUTTING_MACHINE_TYPES },
  { key: 'bending',    label: 'Quinagem',    machineTypes: ['bending'] },
  { key: 'guillotine', label: 'Guilhotina',  machineTypes: ['guillotine'] },
] as const

interface ParamsResponse { params: CuttingParam[]; total: number; page: number; pages: number }

interface FormState {
  materialType: string; thicknessMm: string; machineType: string; notes: string
  speedMmMin: string; powerPercent: string; gasPressureBar: string; gasType: string; nozzleMm: string
  tonnageT: string; bendAngleDeg: string; bendRadiusMm: string; backGaugeMm: string
  bladeClearanceMm: string; maxSheetThicknessMm: string
}

const EMPTY_FORM: FormState = {
  materialType: 'steel', thicknessMm: '', machineType: 'laser_cnc', notes: '',
  speedMmMin: '', powerPercent: '', gasPressureBar: '', gasType: 'nitrogen', nozzleMm: '',
  tonnageT: '', bendAngleDeg: '', bendRadiusMm: '', backGaugeMm: '',
  bladeClearanceMm: '', maxSheetThicknessMm: '',
}

function toForm(p: CuttingParam): FormState {
  return {
    materialType: p.materialType, thicknessMm: String(p.thicknessMm), machineType: p.machineType,
    notes: p.notes ?? '',
    speedMmMin: p.speedMmMin != null ? String(p.speedMmMin) : '',
    powerPercent: p.powerPercent != null ? String(p.powerPercent) : '',
    gasPressureBar: p.gasPressureBar != null ? String(p.gasPressureBar) : '',
    gasType: p.gasType ?? 'nitrogen',
    nozzleMm: p.nozzleMm != null ? String(p.nozzleMm) : '',
    tonnageT: p.tonnageT != null ? String(p.tonnageT) : '',
    bendAngleDeg: p.bendAngleDeg != null ? String(p.bendAngleDeg) : '',
    bendRadiusMm: p.bendRadiusMm != null ? String(p.bendRadiusMm) : '',
    backGaugeMm: p.backGaugeMm != null ? String(p.backGaugeMm) : '',
    bladeClearanceMm: p.bladeClearanceMm != null ? String(p.bladeClearanceMm) : '',
    maxSheetThicknessMm: p.maxSheetThicknessMm != null ? String(p.maxSheetThicknessMm) : '',
  }
}

function ParamModal({ param, onClose, onDone }: {
  param: CuttingParam | null; onClose: () => void; onDone: () => void
}) {
  const isEdit = !!param
  const [form, setForm] = useState<FormState>(param ? toForm(param) : EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof FormState) {
    return (v: string) => setForm(f => ({ ...f, [k]: v }))
  }

  const isCutting = CUTTING_MACHINE_TYPES.includes(form.machineType)
  const isBending = form.machineType === 'bending'
  const isGuillotine = form.machineType === 'guillotine'

  async function submit() {
    setLoading(true); setError('')
    try {
      if (!form.thicknessMm) { setError('Espessura é obrigatória'); return }

      const payload: Partial<CuttingParam> = {
        materialType: form.materialType,
        thicknessMm: Number(form.thicknessMm),
        machineType: form.machineType,
        notes: form.notes || undefined,
      }

      if (isCutting) {
        if (!form.speedMmMin || !form.powerPercent || !form.gasPressureBar || !form.nozzleMm) {
          setError('Preencha velocidade, potência, pressão de gás e bico'); return
        }
        Object.assign(payload, {
          speedMmMin: Number(form.speedMmMin),
          powerPercent: Number(form.powerPercent),
          gasPressureBar: Number(form.gasPressureBar),
          gasType: form.gasType,
          nozzleMm: Number(form.nozzleMm),
        })
      } else if (isBending) {
        if (!form.tonnageT || !form.bendAngleDeg || !form.bendRadiusMm) {
          setError('Preencha tonelagem, ângulo e raio de quinagem'); return
        }
        Object.assign(payload, {
          tonnageT: Number(form.tonnageT),
          bendAngleDeg: Number(form.bendAngleDeg),
          bendRadiusMm: Number(form.bendRadiusMm),
          backGaugeMm: form.backGaugeMm ? Number(form.backGaugeMm) : undefined,
        })
      } else if (isGuillotine) {
        if (!form.bladeClearanceMm) { setError('Preencha a folga da lâmina'); return }
        Object.assign(payload, {
          bladeClearanceMm: Number(form.bladeClearanceMm),
          maxSheetThicknessMm: form.maxSheetThicknessMm ? Number(form.maxSheetThicknessMm) : undefined,
        })
      }

      if (isEdit && param) {
        await api.cuttingParams.update(param.id, payload)
      } else {
        await api.cuttingParams.create(payload)
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
      title={isEdit ? 'Editar Parâmetro' : 'Novo Parâmetro'}
      sub={isEdit ? `${MATERIAL_LABELS[param!.materialType] ?? param!.materialType} · ${param!.thicknessMm}mm` : undefined}
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
      <Field label="Tipo de Máquina *">
        <Select value={form.machineType} onChange={set('machineType')}>
          {Object.entries(MACHINE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Material *">
          <Select value={form.materialType} onChange={set('materialType')}>
            {Object.entries(MATERIAL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Espessura (mm) *">
          <Input value={form.thicknessMm} onChange={set('thicknessMm')} placeholder="Ex: 3" type="number" />
        </Field>
      </div>

      {isCutting && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Velocidade (mm/min) *">
              <Input value={form.speedMmMin} onChange={set('speedMmMin')} placeholder="Ex: 4500" type="number" />
            </Field>
            <Field label="Potência (%) *">
              <Input value={form.powerPercent} onChange={set('powerPercent')} placeholder="Ex: 80" type="number" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pressão Gás (bar) *">
              <Input value={form.gasPressureBar} onChange={set('gasPressureBar')} placeholder="Ex: 12" type="number" />
            </Field>
            <Field label="Gás *">
              <Select value={form.gasType} onChange={set('gasType')}>
                {Object.entries(GAS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Bico (mm) *">
            <Input value={form.nozzleMm} onChange={set('nozzleMm')} placeholder="Ex: 1.5" type="number" />
          </Field>
        </>
      )}

      {isBending && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tonelagem (T) *">
              <Input value={form.tonnageT} onChange={set('tonnageT')} placeholder="Ex: 25" type="number" />
            </Field>
            <Field label="Ângulo (º) *">
              <Input value={form.bendAngleDeg} onChange={set('bendAngleDeg')} placeholder="Ex: 90" type="number" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Raio (mm) *">
              <Input value={form.bendRadiusMm} onChange={set('bendRadiusMm')} placeholder="Ex: 2" type="number" />
            </Field>
            <Field label="Encosto (mm)" hint="— opcional">
              <Input value={form.backGaugeMm} onChange={set('backGaugeMm')} placeholder="Ex: 50" type="number" />
            </Field>
          </div>
        </>
      )}

      {isGuillotine && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Folga Lâmina (mm) *">
            <Input value={form.bladeClearanceMm} onChange={set('bladeClearanceMm')} placeholder="Ex: 0.2" type="number" />
          </Field>
          <Field label="Espessura Máx. (mm)" hint="— opcional">
            <Input value={form.maxSheetThicknessMm} onChange={set('maxSheetThicknessMm')} placeholder="Ex: 6" type="number" />
          </Field>
        </div>
      )}

      <Field label="Notas" hint="— opcional">
        <Input value={form.notes} onChange={set('notes')} placeholder="Observações" />
      </Field>

      {error && <ErrorMsg msg={error} />}
    </Modal>
  )
}

export default function CuttingParamsPage() {
  const [data, setData] = useState<ParamsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [group, setGroup] = useState<typeof GROUPS[number]['key']>('cutting')
  const [modal, setModal] = useState<CuttingParam | null | 'new'>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const activeGroup = GROUPS.find(g => g.key === group)!

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.cuttingParams.list({ search: search || undefined, page })
      setData(res)
    } catch {
      showToast('Erro ao carregar parâmetros', 'err')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { setPage(1) }, [search, group])
  useEffect(() => { load() }, [load])

  async function remove(p: CuttingParam) {
    if (!(await confirmDelete(`${MATERIAL_LABELS[p.materialType] ?? p.materialType} ${p.thicknessMm}mm`))) return
    try {
      await api.cuttingParams.delete(p.id)
      showToast('Parâmetro removido')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro', 'err')
    }
  }

  const params = (data?.params ?? []).filter(p => (activeGroup.machineTypes as readonly string[]).includes(p.machineType))

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader
        title="Parâmetros de Corte"
        sub={`${params.length} parâmetro${params.length !== 1 ? 's' : ''} · ${activeGroup.label}`}
        action={
          <Btn onClick={() => setModal('new')}>
            <Plus className="h-4 w-4" /> Novo Parâmetro
          </Btn>
        }
      />

      <TableToolbar
        search={search} onSearch={setSearch} placeholder="Pesquisar por notas…"
        filters={GROUPS.map(g => ({ key: g.key, label: g.label }))}
        activeFilter={group} onFilter={v => setGroup(v as typeof group)}
      />

      <Table
        headers={
          group === 'cutting'
            ? ['Máquina', 'Material', 'Espessura', 'Velocidade', 'Potência', 'Gás', 'Bico', 'Ações']
            : group === 'bending'
            ? ['Material', 'Espessura', 'Tonelagem', 'Ângulo', 'Raio', 'Ações']
            : ['Material', 'Espessura', 'Folga Lâmina', 'Espessura Máx.', 'Ações']
        }
        loading={loading}
      >
        {params.length === 0 && !loading ? (
          <tr><td colSpan={8}>
            <Empty icon={Sliders} title="Nenhum parâmetro encontrado" sub="Crie o primeiro parâmetro para este tipo de máquina" />
          </td></tr>
        ) : params.map((p, i) => (
          <Tr key={p.id} last={i === params.length - 1}>
            {group === 'cutting' && (
              <Td><Badge label={MACHINE_TYPE_LABELS[p.machineType] ?? p.machineType} /></Td>
            )}
            <Td><span className="text-sm" style={{ color: T.text }}>{MATERIAL_LABELS[p.materialType] ?? p.materialType}</span></Td>
            <Td><span className="text-sm font-mono" style={{ color: T.muted }}>{p.thicknessMm}mm</span></Td>

            {group === 'cutting' && (
              <>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.speedMmMin ?? '—'} mm/min</span></Td>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.powerPercent ?? '—'}%</span></Td>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.gasType ? GAS_LABELS[p.gasType] ?? p.gasType : '—'}</span></Td>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.nozzleMm ?? '—'}mm</span></Td>
              </>
            )}

            {group === 'bending' && (
              <>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.tonnageT ?? '—'}T</span></Td>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.bendAngleDeg ?? '—'}º</span></Td>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.bendRadiusMm ?? '—'}mm</span></Td>
              </>
            )}

            {group === 'guillotine' && (
              <>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.bladeClearanceMm ?? '—'}mm</span></Td>
                <Td><span className="text-sm" style={{ color: T.muted }}>{p.maxSheetThicknessMm ?? '—'}mm</span></Td>
              </>
            )}

            <Td>
              <div className="flex items-center gap-1.5">
                <ActionBtn variant="edit" onClick={() => setModal(p)} title="Editar" />
                <ActionBtn variant="delete" onClick={() => remove(p)} title="Apagar" />
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      {data && (
        <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
      )}

      {modal !== null && (
        <ParamModal
          param={modal === 'new' ? null : modal as CuttingParam}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null)
            showToast(modal !== 'new' ? 'Parâmetro actualizado' : 'Parâmetro criado')
            load()
          }}
        />
      )}
    </div>
  )
}
