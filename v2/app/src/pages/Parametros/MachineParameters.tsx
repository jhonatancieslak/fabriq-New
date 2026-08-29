// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useRef, useState } from 'react'
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
import { downloadCsvTemplate, parseCsvFile, type ParsedRow } from '../../lib/csvImport'
import { btnDanger, btnGhost, btnPrimary, Card, Field, inputCls, Td, Th } from '../../components/form'

const GASES: GasType[] = ['oxigenio', 'nitrogenio', 'ar_comprimido']

const CSV_HEADERS = [
  'maquina', 'material', 'espessura_mm', 'tipo_gas', 'consumo_gas_m3h', 'preco_gas_m3',
  'valor_hora_maquina', 'taxa_minima', 'fator_penalizacao', 'diametro_min_furo_mm',
  'velocidade_corte_mms', 'parada_por_furo_s',
]
const CSV_EXAMPLE = ['Laser 1', 'Aço carbono', '3', 'oxigenio', '0.8', '0.15', '45', '15', '1', '0.3', '25', '0.5']

interface ImportRow {
  machine_id: string
  material_id: string
  espessura_mm: number
  tipo_gas: GasType | null
  consumo_gas_m3h: number | null
  preco_gas_m3: number | null
  valor_hora_maquina: number
  taxa_minima: number
  fator_penalizacao: number
  diametro_min_furo_mm: number | null
  velocidade_corte_mms: number | null
  parada_por_furo_s: number | null
}

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
  const [importRows, setImportRows] = useState<ParsedRow<ImportRow>[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function findMachineByName(nome: string) {
    return machines.find((m) => m.nome.trim().toLowerCase() === nome.trim().toLowerCase())
  }

  function findMaterialByLabel(label: string) {
    const entry = Object.entries(MATERIAL_NAME_LABELS).find(
      ([, l]) => l.trim().toLowerCase() === label.trim().toLowerCase(),
    )
    if (!entry) return undefined
    const [enumKey] = entry
    return materials.find((m) => m.nome === enumKey)
  }

  function parseNumber(v: string | undefined): number | null {
    if (!v || !v.trim()) return null
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  function validateImportRow(raw: Record<string, string>): { value: ImportRow | null; error: string | null } {
    const machine = findMachineByName(raw.maquina ?? '')
    if (!machine) return { value: null, error: `Máquina "${raw.maquina}" não encontrada.` }

    const material = findMaterialByLabel(raw.material ?? '')
    if (!material) return { value: null, error: `Material "${raw.material}" não encontrado.` }

    const espessura = parseNumber(raw.espessura_mm)
    if (espessura === null || espessura <= 0) return { value: null, error: 'Espessura inválida.' }

    const tipoGasRaw = (raw.tipo_gas ?? '').trim().toLowerCase()
    const tipoGas: GasType | null = GASES.includes(tipoGasRaw as GasType) ? (tipoGasRaw as GasType) : null
    if (tipoGasRaw && !tipoGas) return { value: null, error: `Tipo de gás "${raw.tipo_gas}" inválido (use: ${GASES.join(', ')}).` }

    return {
      value: {
        machine_id: machine.id,
        material_id: material.id,
        espessura_mm: espessura,
        tipo_gas: tipoGas,
        consumo_gas_m3h: parseNumber(raw.consumo_gas_m3h),
        preco_gas_m3: parseNumber(raw.preco_gas_m3),
        valor_hora_maquina: parseNumber(raw.valor_hora_maquina) ?? 0,
        taxa_minima: parseNumber(raw.taxa_minima) ?? 0,
        fator_penalizacao: parseNumber(raw.fator_penalizacao) ?? 1,
        diametro_min_furo_mm: parseNumber(raw.diametro_min_furo_mm),
        velocidade_corte_mms: parseNumber(raw.velocidade_corte_mms),
        parada_por_furo_s: parseNumber(raw.parada_por_furo_s),
      },
      error: null,
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const raw = await parseCsvFile(file)
    const parsed: ParsedRow<ImportRow>[] = raw.map((r, idx) => {
      const { value, error: err } = validateImportRow(r)
      return { line: idx + 2, raw: r, value, error: err }
    })
    setImportRows(parsed)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleConfirmImport() {
    if (!appUser) return
    const valid = importRows.filter((r) => r.value !== null).map((r) => r.value as ImportRow)
    if (valid.length === 0) return

    setImporting(true)
    const { error: err } = await supabase.from('machine_parameters').insert(
      valid.map((v) => ({ company_id: appUser.company_id, ...v })),
    )
    setImporting(false)

    if (err) {
      setError(err.message)
      return
    }
    setImportRows([])
    load()
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

      <div className="mt-8 pt-6 border-t border-slate-800">
        <h3 className="text-white font-medium mb-1">Importar em lote (CSV)</h3>
        <p className="text-xs text-slate-500 mb-3">
          Colunas: {CSV_HEADERS.join(', ')}. Máquina e material são identificados pelo nome já cadastrado.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <button className={btnGhost} onClick={() => downloadCsvTemplate('parametros-corte-modelo.csv', CSV_HEADERS, CSV_EXAMPLE)}>
            Baixar modelo CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelected}
            className="text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:text-slate-200"
          />
        </div>

        {importRows.length > 0 && (
          <div>
            <table className="w-full mb-3">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th>Linha</Th>
                  <Th>Máquina</Th>
                  <Th>Material</Th>
                  <Th>Esp.</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r) => (
                  <tr key={r.line} className="border-b border-slate-800/60">
                    <Td>{r.line}</Td>
                    <Td>{r.raw.maquina}</Td>
                    <Td>{r.raw.material}</Td>
                    <Td>{r.raw.espessura_mm}</Td>
                    <Td>
                      {r.error ? <span className="text-red-400 text-xs">{r.error}</span> : <span className="text-amber-400 text-xs">✓ válido</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-3">
              <button className={btnPrimary} onClick={handleConfirmImport} disabled={importing || importRows.every((r) => r.error)}>
                {importing ? 'A importar…' : `Confirmar importação (${importRows.filter((r) => !r.error).length} válidas)`}
              </button>
              <button className={btnGhost} onClick={() => setImportRows([])}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

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
