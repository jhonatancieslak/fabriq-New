// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { CompanySettings as CompanySettingsRow, DobraPricingMode } from '../../types/db'
import { btnPrimary, Card, Field, inputCls } from '../../components/form'

export default function CompanySettings() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<CompanySettingsRow>>({
    dobra_pricing_mode: 'por_batida',
    pdf_orientacao: 'vertical',
    pdf_densidade: 'normal',
    pdf_tamanho_desenho: 'medio',
    pdf_listras_zebradas: false,
    pdf_mostrar_logo: true,
  })

  useEffect(() => {
    async function load() {
      if (!appUser) return
      setLoading(true)
      const { data } = await supabase.from('company_settings').select('*').eq('company_id', appUser.company_id).maybeSingle()
      if (data) setForm(data as CompanySettingsRow)
      setLoading(false)
    }
    load()
  }, [appUser])

  function set<K extends keyof CompanySettingsRow>(key: K, value: CompanySettingsRow[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    if (!appUser) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('company_settings').upsert({ ...form, company_id: appUser.company_id })
    setSaving(false)
    if (err) return setError(err.message)
    setSaved(true)
  }

  if (loading) return <Card><p className="text-sm text-slate-500">A carregar…</p></Card>

  return (
    <Card>
      <h2 className="text-white font-medium mb-1">Configurações Gerais</h2>
      <p className="text-xs text-slate-500 mb-4">Descontos, dobra, setup e formatação de PDF — aplicados por padrão em orçamentos.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <Field label="Desconto opção 1 (%)">
          <input className={inputCls} type="number" step="0.001" value={form.desconto_opcao1_pct ?? ''} onChange={(e) => set('desconto_opcao1_pct', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Desconto opção 2 (%)">
          <input className={inputCls} type="number" step="0.001" value={form.desconto_opcao2_pct ?? ''} onChange={(e) => set('desconto_opcao2_pct', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Dias p/ cliente inativo">
          <input className={inputCls} type="number" value={form.cliente_inativo_dias ?? ''} onChange={(e) => set('cliente_inativo_dias', e.target.value ? Number(e.target.value) : null)} />
        </Field>

        <Field label="Modo preço dobra">
          <select className={inputCls} value={form.dobra_pricing_mode} onChange={(e) => set('dobra_pricing_mode', e.target.value as DobraPricingMode)}>
            <option value="por_batida">Por batida</option>
            <option value="por_kg">Por kg</option>
          </select>
        </Field>
        <Field label="Preço/batida (€)">
          <input className={inputCls} type="number" step="0.0001" value={form.preco_dobra ?? ''} onChange={(e) => set('preco_dobra', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Preço/kg dobra (€)">
          <input className={inputCls} type="number" step="0.0001" value={form.preco_kg_dobra ?? ''} onChange={(e) => set('preco_kg_dobra', e.target.value ? Number(e.target.value) : null)} />
        </Field>

        <Field label="Custo setup/hora (€)">
          <input className={inputCls} type="number" step="0.0001" value={form.custo_setup_hora ?? ''} onChange={(e) => set('custo_setup_hora', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Tempo setup padrão (min)">
          <input className={inputCls} type="number" step="0.01" value={form.tempo_setup_padrao_min ?? ''} onChange={(e) => set('tempo_setup_padrao_min', e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Condição pagamento padrão">
          <input className={inputCls} value={form.condicao_pagamento_padrao ?? ''} onChange={(e) => set('condicao_pagamento_padrao', e.target.value)} />
        </Field>
      </div>

      <h3 className="text-sm text-slate-300 font-medium mb-3">PDF de orçamento</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <Field label="Orientação">
          <select className={inputCls} value={form.pdf_orientacao ?? 'vertical'} onChange={(e) => set('pdf_orientacao', e.target.value)}>
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </Field>
        <Field label="Densidade">
          <select className={inputCls} value={form.pdf_densidade ?? 'normal'} onChange={(e) => set('pdf_densidade', e.target.value)}>
            <option value="compacta">Compacta</option>
            <option value="normal">Normal</option>
            <option value="espacada">Espaçada</option>
          </select>
        </Field>
        <Field label="Tamanho do desenho">
          <select className={inputCls} value={form.pdf_tamanho_desenho ?? 'medio'} onChange={(e) => set('pdf_tamanho_desenho', e.target.value)}>
            <option value="pequeno">Pequeno</option>
            <option value="medio">Médio</option>
            <option value="grande">Grande</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-6 mb-6">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={!!form.pdf_listras_zebradas} onChange={(e) => set('pdf_listras_zebradas', e.target.checked)} />
          Listras zebradas na tabela
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.pdf_mostrar_logo ?? true} onChange={(e) => set('pdf_mostrar_logo', e.target.checked)} />
          Mostrar logo
        </label>
      </div>

      <Field label="Observação padrão">
        <textarea className={inputCls} rows={3} value={form.observacao_padrao ?? ''} onChange={(e) => set('observacao_padrao', e.target.value)} />
      </Field>

      <div className="flex items-center gap-3 mt-5">
        <button className={btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
        {saved && <span className="text-sm text-emerald-400">Guardado ✓</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </Card>
  )
}
