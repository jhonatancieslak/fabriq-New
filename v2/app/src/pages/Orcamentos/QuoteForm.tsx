// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  MATERIAL_NAME_LABELS,
  QUOTE_STATUS_LABELS,
  type Client,
  type CompanySettings,
  type GeometriaTipo,
  type Machine,
  type MachineParameter,
  type Material,
  type PricingPreset,
  type Quote,
  type QuoteItem,
  type QuoteItemOrigem,
  type QuoteStatus,
} from '../../types/db'
import { computeQuoteTotals, itemCustoMaoDeObra, itemCustoMateriaPrima, perimetroMm, pesoKg, tempoCorteS } from '../../lib/pricing'
import { gerarOrcamentoPdf } from '../../lib/quotePdf'
import { confirmDialog, notifyError, notifySuccess } from '../../lib/ui'
import { useAuth } from '../../contexts/AuthContext'
import { btnDanger, btnGhost, btnPrimary, Card, Field, inputCls, Td, Th, PageLoading } from '../../components/form'

const STATUSES: QuoteStatus[] = ['rascunho', 'enviado', 'aprovado', 'rejeitado']

const EMPTY_ITEM = {
  origem: 'parametrica' as QuoteItemOrigem,
  material_id: '',
  machine_id: '',
  espessura_mm: '',
  tipo_geometria: 'retangulo' as GeometriaTipo,
  largura_mm: '',
  altura_mm: '',
  diametro_mm: '',
  furos: '',
  dxf_url: '',
  descricao: '',
  quantidade: '1',
  chapa_cliente: false,
}

export default function QuoteForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { company } = useAuth()

  const [quote, setQuote] = useState<Quote | null>(null)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [presets, setPresets] = useState<PricingPreset[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [machineParams, setMachineParams] = useState<MachineParameter[]>([])
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [itemError, setItemError] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    const [{ data: q }, { data: it }, { data: c }, { data: p }, { data: m }, { data: cs }, { data: mac }, { data: mp }] = await Promise.all([
      supabase.from('quotes').select('*').eq('id', id).maybeSingle(),
      supabase.from('quote_items').select('*').eq('quote_id', id).order('created_at'),
      supabase.from('clients').select('*').order('empresa'),
      supabase.from('pricing_presets').select('*').order('nome'),
      supabase.from('materials').select('*').order('nome'),
      supabase.from('company_settings').select('*').maybeSingle(),
      supabase.from('machines').select('*').order('nome'),
      supabase.from('machine_parameters').select('*'),
    ])
    setQuote(q as Quote)
    setItems((it as QuoteItem[]) ?? [])
    setClients((c as Client[]) ?? [])
    setPresets((p as PricingPreset[]) ?? [])
    setMaterials((m as Material[]) ?? [])
    setCompanySettings((cs as CompanySettings) ?? null)
    setMachines((mac as Machine[]) ?? [])
    setMachineParams((mp as MachineParameter[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const preset = presets.find((p) => p.id === quote?.pricing_preset_id) ?? null
  const totals = quote ? computeQuoteTotals(items, preset, Number(quote.desconto_pct), Number(quote.iva_pct)) : null

  async function patchQuote(patch: Partial<Quote>) {
    if (!quote) return
    const { data, error } = await supabase
      .from('quotes')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', quote.id)
      .select()
      .single()
    if (!error && data) setQuote(data as Quote)
  }

  async function persistTotals(nextItems: QuoteItem[]) {
    if (!quote) return
    const t = computeQuoteTotals(nextItems, preset, Number(quote.desconto_pct), Number(quote.iva_pct))
    await patchQuote({ total_liquido: t.totalLiquido, total_iva: t.totalIva, total_bruto: t.totalBruto })
  }

  function setField<K extends keyof typeof EMPTY_ITEM>(key: K, value: (typeof EMPTY_ITEM)[K]) {
    setItemForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAddItem() {
    if (!quote) return
    setItemError(null)

    const material = materials.find((m) => m.id === itemForm.material_id) ?? null
    const espessura = itemForm.espessura_mm ? Number(itemForm.espessura_mm) : null

    let geometria = null
    let dxf_url: string | null = null

    if (itemForm.origem === 'parametrica') {
      if (itemForm.tipo_geometria === 'retangulo' && (!itemForm.largura_mm || !itemForm.altura_mm)) {
        setItemError('Indique largura e altura.')
        return
      }
      if (itemForm.tipo_geometria === 'circulo' && !itemForm.diametro_mm) {
        setItemError('Indique o diâmetro.')
        return
      }
      geometria = {
        tipo: itemForm.tipo_geometria,
        largura_mm: itemForm.largura_mm ? Number(itemForm.largura_mm) : undefined,
        altura_mm: itemForm.altura_mm ? Number(itemForm.altura_mm) : undefined,
        diametro_mm: itemForm.diametro_mm ? Number(itemForm.diametro_mm) : undefined,
        furos: itemForm.furos ? Number(itemForm.furos) : undefined,
      }
    } else {
      if (!itemForm.dxf_url.trim()) {
        setItemError('Indique o link do ficheiro DXF.')
        return
      }
      dxf_url = itemForm.dxf_url
    }

    const peso = pesoKg(geometria, espessura, material)
    const custo = itemCustoMateriaPrima(peso, material, itemForm.chapa_cliente)

    const machineParam = machineParams.find(
      (mp) => mp.machine_id === itemForm.machine_id && mp.material_id === itemForm.material_id && Number(mp.espessura_mm) === espessura
    ) ?? null
    const perimetro = perimetroMm(geometria)
    const furosCount = itemForm.furos ? Number(itemForm.furos) : 0
    const tempoS = tempoCorteS(perimetro, furosCount, machineParam)
    const custoMo = itemCustoMaoDeObra(tempoS, machineParam)

    setSaving(true)
    const { data, error } = await supabase
      .from('quote_items')
      .insert({
        company_id: quote.company_id,
        quote_id: quote.id,
        material_id: itemForm.material_id || null,
        machine_id: itemForm.machine_id || null,
        espessura_mm: espessura,
        dxf_url,
        geometria,
        origem: itemForm.origem,
        descricao: itemForm.descricao || null,
        quantidade: Number(itemForm.quantidade) || 1,
        peso_kg: peso || null,
        perimetro_mm: perimetro || null,
        tempo_corte_s: tempoS || null,
        custo_calculado: custo || null,
        custo_mo_calculado: custoMo || null,
        chapa_cliente: itemForm.chapa_cliente,
      })
      .select()
      .single()
    setSaving(false)

    if (error) {
      setItemError(error.message)
      notifyError(error.message)
      return
    }

    notifySuccess('Item adicionado.')
    const nextItems = [...items, data as QuoteItem]
    setItems(nextItems)
    setItemForm(EMPTY_ITEM)
    persistTotals(nextItems)
  }

  async function handleDeleteItem(itemId: string) {
    if (!(await confirmDialog('Remover este item?'))) return
    const { error: err } = await supabase.from('quote_items').delete().eq('id', itemId)
    if (err) return notifyError(err.message)
    notifySuccess('Item removido.')
    const nextItems = items.filter((it) => it.id !== itemId)
    setItems(nextItems)
    persistTotals(nextItems)
  }

  function geometriaLabel(it: QuoteItem) {
    if (it.origem === 'dxf') return it.descricao || 'Ficheiro DXF'
    const g = it.geometria
    if (!g) return '—'
    if (g.tipo === 'retangulo') return `Retângulo ${g.largura_mm}×${g.altura_mm}mm`
    if (g.tipo === 'circulo') return `Círculo Ø${g.diametro_mm}mm`
    return g.tipo
  }

  const materialName = (id: string | null) => {
    const m = materials.find((x) => x.id === id)
    return m ? MATERIAL_NAME_LABELS[m.nome] : '—'
  }

  if (loading) return <PageLoading />
  if (!quote) return <p className="text-sm text-red-400">Orçamento não encontrado.</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button className={btnGhost} onClick={() => navigate('/orcamentos')}>
          ← Orçamentos
        </button>
        <div className="flex items-center gap-3">
          <button
            className={btnPrimary}
            disabled={!company || items.length === 0}
            onClick={() =>
              company &&
              totals &&
              gerarOrcamentoPdf({
                quote,
                items,
                client: clients.find((c) => c.id === quote.client_id) ?? null,
                company,
                companySettings,
                materials,
                materialLabels: MATERIAL_NAME_LABELS,
                totals,
                geometriaLabel,
              })
            }
          >
            Gerar PDF
          </button>
          <select
            className={`${inputCls} max-w-[10rem]`}
            value={quote.status}
            onChange={(e) => patchQuote({ status: e.target.value as QuoteStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {QUOTE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <h2 className="text-white font-medium mb-4">Dados do orçamento</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Cliente">
            <select className={inputCls} value={quote.client_id ?? ''} onChange={(e) => patchQuote({ client_id: e.target.value || null })}>
              <option value="">Selecionar…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.empresa}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preset de precificação">
            <select
              className={inputCls}
              value={quote.pricing_preset_id ?? ''}
              onChange={async (e) => {
                await patchQuote({ pricing_preset_id: e.target.value || null })
                persistTotals(items)
              }}
            >
              <option value="">Sem preset</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Desconto (%)">
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={quote.desconto_pct}
              onChange={async (e) => {
                await patchQuote({ desconto_pct: Number(e.target.value) || 0 })
                persistTotals(items)
              }}
            />
          </Field>
          <Field label="IVA (%)">
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={quote.iva_pct}
              onChange={async (e) => {
                await patchQuote({ iva_pct: Number(e.target.value) || 0 })
                persistTotals(items)
              }}
            />
          </Field>
        </div>
      </Card>

      <div className="mt-5">
        <Card>
          <h2 className="text-white font-medium mb-1">Itens</h2>
          <p className="text-xs text-slate-500 mb-4">Peça paramétrica (calcula peso/custo automaticamente) ou ficheiro DXF.</p>

          <div className="flex gap-2 mb-4">
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${itemForm.origem === 'parametrica' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}
              onClick={() => setField('origem', 'parametrica')}
            >
              Paramétrica
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${itemForm.origem === 'dxf' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}
              onClick={() => setField('origem', 'dxf')}
            >
              Ficheiro DXF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Field label="Material">
              <select className={inputCls} value={itemForm.material_id} onChange={(e) => setField('material_id', e.target.value)}>
                <option value="">Selecionar…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {MATERIAL_NAME_LABELS[m.nome]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Espessura (mm)">
              <input className={inputCls} type="number" step="0.01" value={itemForm.espessura_mm} onChange={(e) => setField('espessura_mm', e.target.value)} />
            </Field>
            <Field label="Máquina">
              <select className={inputCls} value={itemForm.machine_id} onChange={(e) => setField('machine_id', e.target.value)}>
                <option value="">Sem máquina (só material)</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </Field>

            {itemForm.origem === 'parametrica' ? (
              <>
                <Field label="Forma">
                  <select className={inputCls} value={itemForm.tipo_geometria} onChange={(e) => setField('tipo_geometria', e.target.value as GeometriaTipo)}>
                    <option value="retangulo">Retângulo</option>
                    <option value="circulo">Círculo</option>
                  </select>
                </Field>
                {itemForm.tipo_geometria === 'retangulo' ? (
                  <>
                    <Field label="Largura (mm)">
                      <input className={inputCls} type="number" step="0.1" value={itemForm.largura_mm} onChange={(e) => setField('largura_mm', e.target.value)} />
                    </Field>
                    <Field label="Altura (mm)">
                      <input className={inputCls} type="number" step="0.1" value={itemForm.altura_mm} onChange={(e) => setField('altura_mm', e.target.value)} />
                    </Field>
                  </>
                ) : (
                  <Field label="Diâmetro (mm)">
                    <input className={inputCls} type="number" step="0.1" value={itemForm.diametro_mm} onChange={(e) => setField('diametro_mm', e.target.value)} />
                  </Field>
                )}
                <Field label="Nº furos">
                  <input className={inputCls} type="number" value={itemForm.furos} onChange={(e) => setField('furos', e.target.value)} />
                </Field>
              </>
            ) : (
              <Field label="Link DXF">
                <input className={inputCls} value={itemForm.dxf_url} onChange={(e) => setField('dxf_url', e.target.value)} placeholder="https://…" />
              </Field>
            )}

            <Field label="Descrição">
              <input className={inputCls} value={itemForm.descricao} onChange={(e) => setField('descricao', e.target.value)} />
            </Field>
            <Field label="Quantidade">
              <input className={inputCls} type="number" min="1" value={itemForm.quantidade} onChange={(e) => setField('quantidade', e.target.value)} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 mb-4">
            <input type="checkbox" checked={itemForm.chapa_cliente} onChange={(e) => setField('chapa_cliente', e.target.checked)} />
            Cliente fornece o material (cobrar só mão-de-obra)
          </label>

          <button className={btnPrimary} onClick={handleAddItem} disabled={saving}>
            Adicionar item
          </button>
          {itemError && <p className="text-sm text-red-400 mt-3">{itemError}</p>}

          <div className="mt-6">
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum item adicionado.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <Th>Peça</Th>
                    <Th>Material</Th>
                    <Th>Esp.</Th>
                    <Th>Qtd</Th>
                    <Th>Peso (kg)</Th>
                    <Th>Custo M.P.</Th>
                    <Th>Custo M.O.</Th>
                    <Th>{null}</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b border-slate-800/60">
                      <Td>{geometriaLabel(it)}</Td>
                      <Td>
                        {it.chapa_cliente ? <span className="text-amber-400 text-xs">Cliente traz material</span> : materialName(it.material_id)}
                      </Td>
                      <Td>{it.espessura_mm ?? '—'}</Td>
                      <Td>{it.quantidade}</Td>
                      <Td>{it.peso_kg ? Number(it.peso_kg).toFixed(3) : '—'}</Td>
                      <Td>€{it.custo_calculado ? Number(it.custo_calculado).toFixed(2) : '0.00'}</Td>
                      <Td>€{it.custo_mo_calculado ? Number(it.custo_mo_calculado).toFixed(2) : '0.00'}</Td>
                      <Td>
                        <button className={btnDanger} onClick={() => handleDeleteItem(it.id)}>
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
      </div>

      {totals && (
        <div className="mt-5 max-w-sm ml-auto">
          <Card>
            <div className="space-y-1 text-sm">
              {companySettings?.discriminar_mo_mp === false ? (
                <div className="flex justify-between text-slate-400">
                  <span>Material + mão-de-obra</span>
                  <span>€{(totals.subtotalMp + totals.subtotalMo).toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Matéria-prima</span>
                    <span>€{totals.subtotalMp.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Mão-de-obra</span>
                    <span>€{totals.subtotalMo.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-slate-300">
                <span>Total líquido</span>
                <span>€{totals.totalLiquido.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IVA ({quote.iva_pct}%)</span>
                <span>€{totals.totalIva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-semibold text-base pt-2 border-t border-slate-800">
                <span>Total</span>
                <span>€{totals.totalBruto.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
