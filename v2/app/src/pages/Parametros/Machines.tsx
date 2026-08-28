// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { MACHINE_TYPE_LABELS, type Machine, type MachineType } from '../../types/db'
import { btnDanger, btnPrimary, Card, Field, inputCls, Td, Th } from './shared'

const TIPOS: MachineType[] = ['laser', 'guilhotina', 'quinagem']

export default function Machines() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<MachineType>('laser')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('machines').select('*').order('created_at')
    setRows((data as Machine[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    if (!nome.trim() || !appUser) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('machines').insert({ nome, tipo, company_id: appUser.company_id })
    setSaving(false)
    if (err) return setError(err.message)
    setNome('')
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta máquina?')) return
    await supabase.from('machines').delete().eq('id', id)
    load()
  }

  return (
    <Card>
      <h2 className="text-white font-medium mb-4">Máquinas</h2>

      <div className="flex items-end gap-3 mb-5">
        <div className="flex-1 max-w-xs">
          <Field label="Nome">
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Laser Bystronic 1" />
          </Field>
        </div>
        <div className="max-w-[10rem]">
          <Field label="Tipo">
            <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as MachineType)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {MACHINE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button className={btnPrimary} onClick={handleAdd} disabled={saving}>
          Adicionar
        </button>
      </div>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma máquina cadastrada.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <Th>Nome</Th>
              <Th>Tipo</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-slate-800/60">
                <Td>{m.nome}</Td>
                <Td>{MACHINE_TYPE_LABELS[m.tipo]}</Td>
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
