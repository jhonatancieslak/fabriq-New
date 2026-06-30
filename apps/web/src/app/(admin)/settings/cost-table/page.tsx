// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Btn, Toast, Modal, Field, Input, Select, PageHeader, Badge, Empty } from '@/components/ui/admin-ui'
import { Plus, Trash2, Edit2, Info } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

const MATERIAL_LABELS: Record<string, string> = {
  steel: 'Aço Carbono',
  stainless: 'Aço Inox',
  aluminum: 'Alumínio',
  copper: 'Cobre',
  other: 'Outro',
}

const MATERIAL_COLORS: Record<string, string> = {
  steel: '#6b7280',
  stainless: '#94a3b8',
  aluminum: '#60a5fa',
  copper: '#f97316',
  other: '#8b5cf6',
}

interface CostEntry {
  id: string
  materialType: string
  thicknessMm: number
  costPerM2: number
  description?: string
  isActive: boolean
}

const request = async (path: string, opts?: RequestInit) => {
  const token = localStorage.getItem('fabriq_token')
  const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant, ...(opts?.headers ?? {}) },
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Erro') }
  return res.json()
}

export default function CostTablePage() {
  const [entries, setEntries] = useState<CostEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<CostEntry | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fMat, setFMat] = useState('steel')
  const [fThick, setFThick] = useState('')
  const [fCost, setFCost] = useState('')
  const [fDesc, setFDesc] = useState('')

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    try {
      const data: CostEntry[] = await request('/api/v1/cost-table')
      setEntries(data)
    } catch { showToast('Erro ao carregar tabela', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null); setFMat('steel'); setFThick(''); setFCost(''); setFDesc(''); setModal('create')
  }
  const openEdit = (e: CostEntry) => {
    setEditing(e); setFMat(e.materialType); setFThick(String(e.thicknessMm === 0 ? '' : e.thicknessMm)); setFCost(String(e.costPerM2)); setFDesc(e.description ?? ''); setModal('edit')
  }

  const save = async () => {
    if (!fCost) return showToast('Preencha o custo €/m²', 'err')
    setSaving(true)
    const body = {
      materialType: fMat,
      thicknessMm: fThick ? parseFloat(fThick) : 0,
      costPerM2: parseFloat(fCost),
      description: fDesc || undefined,
    }
    try {
      if (modal === 'edit' && editing) {
        const updated = await request(`/api/v1/cost-table/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        setEntries(prev => prev.map(e => e.id === editing.id ? updated : e))
        showToast('Entrada actualizada')
      } else {
        const created = await request('/api/v1/cost-table', { method: 'POST', body: JSON.stringify(body) })
        setEntries(prev => {
          const existing = prev.findIndex(e => e.id === created.id)
          if (existing >= 0) { const n = [...prev]; n[existing] = created; return n }
          return [...prev, created]
        })
        showToast('Entrada criada')
      }
      setModal(null)
    } catch (e: any) { showToast(e.message, 'err') }
    finally { setSaving(false) }
  }

  const remove = async (entry: CostEntry) => {
    if (!confirm(`Remover ${MATERIAL_LABELS[entry.materialType]} ${entry.thicknessMm > 0 ? entry.thicknessMm + 'mm' : '(fallback)'}?`)) return
    try {
      await request(`/api/v1/cost-table/${entry.id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.id !== entry.id))
      showToast('Entrada removida')
    } catch (e: any) { showToast(e.message, 'err') }
  }

  // Agrupar por material
  const grouped = Object.entries(MATERIAL_LABELS).map(([type, label]) => ({
    type, label,
    entries: entries.filter(e => e.materialType === type).sort((a, b) => a.thicknessMm - b.thicknessMm),
  })).filter(g => g.entries.length > 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader
        title="Tabela de Custos de Material"
        sub="Preço €/m² por tipo de material e espessura — usado no cálculo automático de custo de corte"
        action={<Btn variant="primary" onClick={openCreate}><Plus size={16} /> Nova Entrada</Btn>}
      />

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
        <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-zinc-400 space-y-1">
          <p><span className="text-white font-medium">Espessura = 0</span> → preço fallback (usado quando não há entrada exacta para aquela espessura)</p>
          <p><span className="text-white font-medium">Hierarquia:</span> espessura exacta → fallback (0mm) → costPerM2 do material</p>
          <p>O custo de material só é aplicado quando a chapa <span className="text-white font-medium">não é fornecida pelo cliente</span>.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">A carregar…</div>
      ) : entries.length === 0 ? (
        <Empty icon={Info} title="Sem entradas na tabela de custos" sub="Clique em 'Nova Entrada' para começar." />
      ) : (
        <div className="space-y-5">
          {grouped.map(g => (
            <div key={g.type} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: MATERIAL_COLORS[g.type] }} />
                <h2 className="text-sm font-semibold text-white">{g.label}</h2>
                <span className="text-xs text-zinc-500">{g.entries.length} entrada{g.entries.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-5 py-2 text-left text-xs text-zinc-500 font-medium">Espessura</th>
                    <th className="px-5 py-2 text-right text-xs text-zinc-500 font-medium">€/m²</th>
                    <th className="px-5 py-2 text-left text-xs text-zinc-500 font-medium">Descrição</th>
                    <th className="px-5 py-2 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {g.entries.map((e, idx) => (
                    <tr key={e.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${idx === g.entries.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-5 py-3">
                        {e.thicknessMm === 0 ? (
                          <Badge label="Fallback (0mm)" color="#6b7280" />
                        ) : (
                          <span className="text-white font-mono font-medium">{e.thicknessMm} mm</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-yellow-400 font-bold font-mono">€ {Number(e.costPerM2).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3 text-zinc-400 text-sm">{e.description || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => remove(e)} className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Nova Entrada' : 'Editar Entrada'}
          onClose={() => setModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Material">
              <Select value={fMat} onChange={v => setFMat(v)}>
                {Object.entries(MATERIAL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Espessura (mm) — deixe vazio para fallback genérico">
              <Input type="number" placeholder="ex: 3 — ou deixe vazio para fallback"
                value={fThick} onChange={v => setFThick(v)} />
            </Field>
            <Field label="Custo €/m²">
              <Input type="number" placeholder="ex: 45.00" value={fCost} onChange={v => setFCost(v)} />
            </Field>
            <Field label="Descrição (opcional)">
              <Input
                placeholder="ex: Inox 304 — fornecedor X"
                value={fDesc} onChange={v => setFDesc(v)}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
