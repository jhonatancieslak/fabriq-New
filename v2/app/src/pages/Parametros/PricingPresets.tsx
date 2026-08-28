// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { PricingPreset } from '../../types/db'
import { btnDanger, btnPrimary, Card, Field, inputCls, Td, Th } from './shared'

const EMPTY = { nome: '', mo_pct: '', mp_pct: '', se_pct: '', iva_pct: '23', is_default: false }

export default function PricingPresets() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<PricingPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('pricing_presets').select('*').order('created_at')
    setRows((data as PricingPreset[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAdd() {
    if (!appUser || !form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }
    setSaving(true)
    setError(null)

    if (form.is_default) {
      await supabase.from('pricing_presets').update({ is_default: false }).eq('company_id', appUser.company_id)
    }

    const { error: err } = await supabase.from('pricing_presets').insert({
      company_id: appUser.company_id,
      nome: form.nome,
      mo_pct: Number(form.mo_pct) || 0,
      mp_pct: Number(form.mp_pct) || 0,
      se_pct: Number(form.se_pct) || 0,
      iva_pct: Number(form.iva_pct) || 0,
      is_default: form.is_default,
    })
    setSaving(false)
    if (err) return setError(err.message)
    setForm(EMPTY)
    load()
  }

  async function handleSetDefault(id: string) {
    if (!appUser) return
    await supabase.from('pricing_presets').update({ is_default: false }).eq('company_id', appUser.company_id)
    await supabase.from('pricing_presets').update({ is_default: true }).eq('id', id)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este preset?')) return
    await supabase.from('pricing_presets').delete().eq('id', id)
    load()
  }

  return (
    <Card>
      <h2 className="text-white font-medium mb-1">Precificação</h2>
      <p className="text-xs text-slate-500 mb-4">Presets de margem (mão de obra, matéria-prima, serviço/extra) e IVA aplicável.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 items-end">
        <Field label="Nome do preset">
          <input className={inputCls} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Padrão" />
        </Field>
        <Field label="M.O. %">
          <input className={inputCls} type="number" step="0.001" value={form.mo_pct} onChange={(e) => set('mo_pct', e.target.value)} />
        </Field>
        <Field label="M.P. %">
          <input className={inputCls} type="number" step="0.001" value={form.mp_pct} onChange={(e) => set('mp_pct', e.target.value)} />
        </Field>
        <Field label="Serviço/Extra %">
          <input className={inputCls} type="number" step="0.001" value={form.se_pct} onChange={(e) => set('se_pct', e.target.value)} />
        </Field>
        <Field label="IVA %">
          <input className={inputCls} type="number" step="0.001" value={form.iva_pct} onChange={(e) => set('iva_pct', e.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300 mb-4">
        <input type="checkbox" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} />
        Definir como preset padrão
      </label>

      <button className={btnPrimary} onClick={handleAdd} disabled={saving}>
        Adicionar
      </button>
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum preset cadastrado.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <Th>Nome</Th>
                <Th>M.O.</Th>
                <Th>M.P.</Th>
                <Th>Serviço/Extra</Th>
                <Th>IVA</Th>
                <Th>Padrão</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/60">
                  <Td>{p.nome}</Td>
                  <Td>{p.mo_pct}%</Td>
                  <Td>{p.mp_pct}%</Td>
                  <Td>{p.se_pct}%</Td>
                  <Td>{p.iva_pct}%</Td>
                  <Td>
                    {p.is_default ? (
                      <span className="text-emerald-400 text-xs">✓ padrão</span>
                    ) : (
                      <button className="text-xs text-slate-400 hover:text-white" onClick={() => handleSetDefault(p.id)}>
                        tornar padrão
                      </button>
                    )}
                  </Td>
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
