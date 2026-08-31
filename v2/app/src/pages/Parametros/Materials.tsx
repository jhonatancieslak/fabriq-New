// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { confirmDialog, notifyError, notifySuccess } from '../../lib/ui'
import { MATERIAL_NAME_LABELS, type Material, type MaterialName } from '../../types/db'
import { btnDanger, btnPrimary, Card, Field, inputCls, Td, Th, PageLoading } from '../../components/form'

const NOMES: MaterialName[] = ['aco_carbono', 'aco_inoxidavel', 'aluminio', 'cobre', 'bronze']

export default function Materials() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState<MaterialName>('aco_carbono')
  const [precoKg, setPrecoKg] = useState('')
  const [pesoEsp, setPesoEsp] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('materials').select('*').order('created_at')
    setRows((data as Material[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    if (!appUser) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('materials').insert({
      nome,
      preco_kg: Number(precoKg) || 0,
      peso_especifico: Number(pesoEsp) || 0,
      company_id: appUser.company_id,
    })
    setSaving(false)
    if (err) return setError(err.message)
    setPrecoKg('')
    setPesoEsp('')
    load()
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog('Remover este material?'))) return
    const { error: err } = await supabase.from('materials').delete().eq('id', id)
    if (err) return notifyError(err.message)
    notifySuccess('Material removido.')
    load()
  }

  return (
    <Card>
      <h2 className="text-white font-medium mb-4">Materiais</h2>

      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div className="max-w-[12rem]">
          <Field label="Material">
            <select className={inputCls} value={nome} onChange={(e) => setNome(e.target.value as MaterialName)}>
              {NOMES.map((n) => (
                <option key={n} value={n}>
                  {MATERIAL_NAME_LABELS[n]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="max-w-[9rem]">
          <Field label="Preço/kg (€)">
            <input className={inputCls} type="number" step="0.0001" value={precoKg} onChange={(e) => setPrecoKg(e.target.value)} />
          </Field>
        </div>
        <div className="max-w-[9rem]">
          <Field label="Peso esp. (g/cm³)">
            <input className={inputCls} type="number" step="0.0001" value={pesoEsp} onChange={(e) => setPesoEsp(e.target.value)} />
          </Field>
        </div>
        <button className={btnPrimary} onClick={handleAdd} disabled={saving}>
          Adicionar
        </button>
      </div>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum material cadastrado.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <Th>Material</Th>
              <Th>Preço/kg</Th>
              <Th>Peso esp.</Th>
              <Th>{null}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-slate-800/60">
                <Td>{MATERIAL_NAME_LABELS[m.nome]}</Td>
                <Td>€{Number(m.preco_kg).toFixed(4)}</Td>
                <Td>{Number(m.peso_especifico).toFixed(4)} g/cm³</Td>
                <Td>
                  <button className={btnDanger} onClick={() => handleDelete(m.id)}>
                    Remover
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
