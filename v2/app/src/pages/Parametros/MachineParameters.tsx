// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  GAS_TYPE_LABELS,
  MACHINE_TYPE_LABELS,
  MATERIAL_NAME_LABELS,
  type GasType,
  type Machine,
  type MachineParameter,
  type Material,
} from '../../types/db'
import { btnDanger, btnPrimary, Card, Field, inputCls, Td, Th } from './shared'

const GASES: GasType[] = ['oxigenio', 'nitrogenio', 'ar_comprimido']

const EMPTY = {
  machine_id: '',
  material_id: '',
  espessura_mm: '',
  tipo_gas: '' as GasType | '',
  consumo_gas_m3h: '',
  preco_gas_m3: '',
  valor_hora_maquina: '',
  taxa_minima: '',
  fator_penalizacao: '1',
  diametro_min_furo_mm: '',
  velocidade_corte_mms: '',
  parada_por_furo_s: '',
}

export default function MachineParameters() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<MachineParameter[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: m }, { data: mat }] = await Promise.all([
      supabase.from('machine_parameters').select('*').order('created_at'),
      supabase.from('machines').select('*').order('nome'),
      supabase.from('materials').select('*').order('nome'),
    ])
    setRows((p as MachineParameter[]) ?? [])
    setMachines((m as Machine[]) ?? [])
    setMaterials((mat as Material[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAdd() {
    if (!appUser || !form.machine_id || !form.material_id || !form.espessura_mm) {
      setError('Máquina, material e espessura são obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('machine_parameters').insert({
      company_id: appUser.company_id,
      machine_id: form.machine_id,
      material_id: form.material_id,
      espessura_mm: Number(form.espessura_mm),
      tipo_gas: form.tipo_gas || null,
      consumo_gas_m3h: form.consumo_gas_m3h ? Number(form.consumo_gas_m3h) : null,
      preco_gas_m3: form.preco_gas_m3 ? Number(form.preco_gas_m3) : null,
      valor_hora_maquina: Number(form.valor_hora_maquina) || 0,
      taxa_minima: Number(form.taxa_minima) || 0,
      fator_penalizacao: Number(form.fator_penalizacao) || 1,
      diametro_min_furo_mm: form.diametro_min_furo_mm ? Number(form.diametro_min_furo_mm) : null,
      velocidade_corte_mms: form.velocidade_corte_mms ? Number(form.velocidade_corte_mms) : null,
      parada_por_furo_s: form.parada_por_furo_s ? Number(form.parada_por_furo_s) : null,
    })
    setSaving(false)
    if (err) return setError(err.message)
    setForm(EMPTY)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este parâmetro?')) return
    await supabase.from('machine_parameters').delete().eq('id', id)
    load()
  }

  const machineName = (id: string) => machines.find((m) => m.id === id)?.nome ?? '—'
  const materialName = (id: string) => {
    const m = materials.find((x) => x.id === id)
    return m ? MATERIAL_NAME_LABELS[m.nome] : '—'
  }

  return (
    <Card>
      <h2 className="text-white font-medium mb-1">Parâmetros de Corte</h2>
      <p className="text-xs text-slate-500 mb-4">Combinação máquina + material + espessura, com custos de gás e velocidade.</p>

      {machines.length === 0 || materials.length === 0 ? (
        <p className="text-sm text-amber-400 mb-4">Cadastre pelo menos uma máquina e um material antes.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Field label="Máquina">
            <select className={inputCls} value={form.machine_id} onChange={(e) => set('machine_id', e.target.value)}>
              <option value="">Selecionar…</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({MACHINE_TYPE_LABELS[m.tipo]})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Material">
            <select className={inputCls} value={form.material_id} onChange={(e) => set('material_id', e.target.value)}>
              <option value="">Selecionar…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {MATERIAL_NAME_LABELS[m.nome]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Espessura (mm)">
            <input className={inputCls} type="number" step="0.001" value={form.espessura_mm} onChange={(e) => set('espessura_mm', e.target.value)} />
          </Field>
          <Field label="Gás">
            <select className={inputCls} value={form.tipo_gas} onChange={(e) => set('tipo_gas', e.target.value as GasType)}>
              <option value="">Nenhum</option>
              {GASES.map((g) => (
                <option key={g} value={g}>
                  {GAS_TYPE_LABELS[g]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Consumo gás (m³/h)">
            <input className={inputCls} type="number" step="0.0001" value={form.consumo_gas_m3h} onChange={(e) => set('consumo_gas_m3h', e.target.value)} />
          </Field>
          <Field label="Preço gás (€/m³)">
            <input className={inputCls} type="number" step="0.0001" value={form.preco_gas_m3} onChange={(e) => set('preco_gas_m3', e.target.value)} />
          </Field>
          <Field label="Valor hora máquina (€)">
            <input className={inputCls} type="number" step="0.0001" value={form.valor_hora_maquina} onChange={(e) => set('valor_hora_maquina', e.target.value)} />
          </Field>
          <Field label="Taxa mínima (€)">
            <input className={inputCls} type="number" step="0.0001" value={form.taxa_minima} onChange={(e) => set('taxa_minima', e.target.value)} />
          </Field>
          <Field label="Fator penalização">
            <input className={inputCls} type="number" step="0.0001" value={form.fator_penalizacao} onChange={(e) => set('fator_penalizacao', e.target.value)} />
          </Field>
          <Field label="Ø mín. furo (mm)">
            <input className={inputCls} type="number" step="0.001" value={form.diametro_min_furo_mm} onChange={(e) => set('diametro_min_furo_mm', e.target.value)} />
          </Field>
          <Field label="Vel. corte (mm/s)">
            <input className={inputCls} type="number" step="0.001" value={form.velocidade_corte_mms} onChange={(e) => set('velocidade_corte_mms', e.target.value)} />
          </Field>
          <Field label="Parada/furo (s)">
            <input className={inputCls} type="number" step="0.001" value={form.parada_por_furo_s} onChange={(e) => set('parada_por_furo_s', e.target.value)} />
          </Field>
        </div>
      )}

      <button className={btnPrimary} onClick={handleAdd} disabled={saving || machines.length === 0 || materials.length === 0}>
        Adicionar
      </button>
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum parâmetro cadastrado.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <Th>Máquina</Th>
                <Th>Material</Th>
                <Th>Esp. (mm)</Th>
                <Th>Gás</Th>
                <Th>€/h máquina</Th>
                <Th>Taxa mín.</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/60">
                  <Td>{machineName(p.machine_id)}</Td>
                  <Td>{materialName(p.material_id)}</Td>
                  <Td>{p.espessura_mm}</Td>
                  <Td>{p.tipo_gas ? GAS_TYPE_LABELS[p.tipo_gas] : '—'}</Td>
                  <Td>€{Number(p.valor_hora_maquina).toFixed(2)}</Td>
                  <Td>€{Number(p.taxa_minima).toFixed(2)}</Td>
                  <Td>
                    <button className={btnDanger} onClick={() => handleDelete(p.id)}>
                      Remover
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}
