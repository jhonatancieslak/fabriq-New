// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Client, PricingPreset } from '../types/db'
import { btnDanger, btnGhost, btnPrimary, Card, Field, inputCls, Td, Th } from '../components/form'

const EMPTY = {
  empresa: '',
  contacto: '',
  nif: '',
  email: '',
  telefone: '',
  endereco: '',
  cidade: '',
  codigo_postal: '',
  condicao_pagamento: '',
  pricing_preset_id: '',
  observacoes: '',
}

type FormState = typeof EMPTY

export default function Clientes() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<Client[]>([])
  const [presets, setPresets] = useState<PricingPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('clients').select('*').order('empresa'),
      supabase.from('pricing_presets').select('*').order('nome'),
    ])
    setRows((c as Client[]) ?? [])
    setPresets((p as PricingPreset[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openNew() {
    setEditingId(null)
    setForm(EMPTY)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(c: Client) {
    setEditingId(c.id)
    setForm({
      empresa: c.empresa,
      contacto: c.contacto ?? '',
      nif: c.nif ?? '',
      email: c.email ?? '',
      telefone: c.telefone ?? '',
      endereco: c.endereco ?? '',
      cidade: c.cidade ?? '',
      codigo_postal: c.codigo_postal ?? '',
      condicao_pagamento: c.condicao_pagamento ?? '',
      pricing_preset_id: c.pricing_preset_id ?? '',
      observacoes: c.observacoes ?? '',
    })
    setError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!appUser || !form.empresa.trim()) {
      setError('Nome da empresa é obrigatório.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      empresa: form.empresa,
      contacto: form.contacto || null,
      nif: form.nif || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      codigo_postal: form.codigo_postal || null,
      condicao_pagamento: form.condicao_pagamento || null,
      pricing_preset_id: form.pricing_preset_id || null,
      observacoes: form.observacoes || null,
      updated_at: new Date().toISOString(),
    }

    const { error: err } = editingId
      ? await supabase.from('clients').update(payload).eq('id', editingId)
      : await supabase.from('clients').insert({ ...payload, company_id: appUser.company_id })

    setSaving(false)
    if (err) return setError(err.message)
    setFormOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  const filtered = rows.filter((c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      c.empresa.toLowerCase().includes(q) ||
      (c.contacto ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.nif ?? '').toLowerCase().includes(q)
    )
  })

  const presetName = (id: string | null) => presets.find((p) => p.id === id)?.nome ?? '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-xl font-semibold">Clientes</h1>
        <button className={btnPrimary} onClick={openNew}>
          + Novo Cliente
        </button>
      </div>

      {formOpen && (
        <Card>
          <h2 className="text-white font-medium mb-4">{editingId ? 'Editar cliente' : 'Novo cliente'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <Field label="Empresa *">
              <input className={inputCls} value={form.empresa} onChange={(e) => set('empresa', e.target.value)} />
            </Field>
            <Field label="Contacto">
              <input className={inputCls} value={form.contacto} onChange={(e) => set('contacto', e.target.value)} />
            </Field>
            <Field label="NIF">
              <input className={inputCls} value={form.nif} onChange={(e) => set('nif', e.target.value)} />
            </Field>
            <Field label="E-mail">
              <input className={inputCls} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Telefone">
              <input className={inputCls} value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
            </Field>
            <Field label="Condição pagamento">
              <input className={inputCls} value={form.condicao_pagamento} onChange={(e) => set('condicao_pagamento', e.target.value)} />
            </Field>
            <Field label="Endereço">
              <input className={inputCls} value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
            </Field>
            <Field label="Cidade">
              <input className={inputCls} value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
            </Field>
            <Field label="Código postal">
              <input className={inputCls} value={form.codigo_postal} onChange={(e) => set('codigo_postal', e.target.value)} />
            </Field>
            <Field label="Preset de precificação">
              <select className={inputCls} value={form.pricing_preset_id} onChange={(e) => set('pricing_preset_id', e.target.value)}>
                <option value="">Sem preset específico</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Observações">
            <textarea className={inputCls} rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
          </Field>

          <div className="flex items-center gap-3 mt-4">
            <button className={btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar'}
            </button>
            <button className={btnGhost} onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </Card>
      )}

      <div className="mt-5">
        <Card>
          <input
            className={`${inputCls} max-w-sm mb-4`}
            placeholder="Pesquisar por empresa, contacto, e-mail ou NIF…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {loading ? (
            <p className="text-sm text-slate-500">A carregar…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum cliente encontrado.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th>Empresa</Th>
                  <Th>Contacto</Th>
                  <Th>E-mail</Th>
                  <Th>Telefone</Th>
                  <Th>Preset</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/60">
                    <Td>{c.empresa}</Td>
                    <Td>{c.contacto || '—'}</Td>
                    <Td>{c.email || '—'}</Td>
                    <Td>{c.telefone || '—'}</Td>
                    <Td>{presetName(c.pricing_preset_id)}</Td>
                    <Td>
                      <div className="flex gap-3">
                        <button className="text-xs text-slate-400 hover:text-white" onClick={() => openEdit(c)}>
                          Editar
                        </button>
                        <button className={btnDanger} onClick={() => handleDelete(c.id)}>
                          Remover
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
