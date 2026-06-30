// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { Plus, TrendingDown, TrendingUp, AlertTriangle, Package, X, History, ChevronDown, ChevronUp } from 'lucide-react'
import { T, PageHeader } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') : 'demo'
  return { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant ?? 'demo', 'Content-Type': 'application/json' }
}

const CATEGORY_LABELS: Record<string, string> = {
  lens: 'Lente', nozzle: 'Bico', ceramic: 'Cerâmica', protection: 'Janela protecção',
  fiber: 'Fibra Ótica', filter: 'Filtro', gas: 'Gás', accessory: 'Acessório', other: 'Outro',
}
const CATEGORY_EMOJI: Record<string, string> = {
  lens: '🔬', nozzle: '🔧', ceramic: '🏺', protection: '🛡️',
  fiber: '💡', filter: '🫧', gas: '💨', accessory: '⚙️', other: '📦',
}

interface Consumable {
  id: string; name: string; category: string; reference?: string
  unit: string; stockCurrent: number; stockMin: number
  description?: string; lowStock: boolean
}
interface Movement {
  id: string; type: 'in' | 'out'; quantity: number; reason?: string
  createdAt: string; operator?: { name: string } | null
}

export default function ConsumablesPage() {
  const [items, setItems]           = useState<Consumable[]>([])
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [movements, setMovements]   = useState<Record<string, Movement[]>>({})

  // Modal criar consumível
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState({ name: '', category: 'nozzle', reference: '', unit: 'un', stockCurrent: 0, stockMin: 1, description: '' })
  const [saving, setSaving]         = useState(false)

  // Modal movimento
  const [movId, setMovId]           = useState<string | null>(null)
  const [movType, setMovType]       = useState<'in' | 'out'>('out')
  const [movQty, setMovQty]         = useState(1)
  const [movReason, setMovReason]   = useState('')
  const [movSaving, setMovSaving]   = useState(false)

  async function load() {
    const r = await fetch(`${API_URL}/api/v1/consumables`, { headers: authHeaders() })
    if (r.ok) setItems(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function loadMovements(id: string) {
    const r = await fetch(`${API_URL}/api/v1/consumables/${id}/movements`, { headers: authHeaders() })
    if (r.ok) { const data = await r.json(); setMovements(p => ({ ...p, [id]: data })) }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!movements[id]) loadMovements(id)
  }

  async function handleCreate() {
    setSaving(true)
    const r = await fetch(`${API_URL}/api/v1/consumables`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
    })
    if (r.ok) { setShowCreate(false); load() }
    setSaving(false)
  }

  async function handleMovement() {
    if (!movId) return
    setMovSaving(true)
    const r = await fetch(`${API_URL}/api/v1/consumables/${movId}/movement`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ type: movType, quantity: movQty, reason: movReason || undefined }),
    })
    if (r.ok) {
      setMovId(null); setMovQty(1); setMovReason(''); load()
      if (movements[movId]) loadMovements(movId)
    } else {
      const e = await r.json()
      alert(e.error ?? 'Erro ao registar movimento')
    }
    setMovSaving(false)
  }

  const lowStockCount = items.filter(i => i.lowStock).length
  const byCategory = items.reduce((acc, i) => {
    acc[i.category] = [...(acc[i.category] ?? []), i]
    return acc
  }, {} as Record<string, Consumable[]>)

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Consumíveis" sub="Stock e movimentos" />
      <div className="text-sm text-slate-500 mt-8 animate-pulse">A carregar...</div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Consumíveis" sub="Bicos, lentes, cerâmica e outros materiais de desgaste" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-3xl font-black" style={{ color: T.text }}>{items.length}</div>
          <div className="text-xs mt-1" style={{ color: T.subtle }}>Referências activas</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: lowStockCount > 0 ? 'rgba(239,68,68,0.08)' : T.surface, border: `1px solid ${lowStockCount > 0 ? '#7f1d1d' : T.border}` }}>
          <div className="text-3xl font-black" style={{ color: lowStockCount > 0 ? '#EF4444' : '#22C55E' }}>{lowStockCount}</div>
          <div className="text-xs mt-1" style={{ color: T.subtle }}>Stock abaixo do mínimo</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="text-3xl font-black" style={{ color: T.text }}>{Object.keys(byCategory).length}</div>
          <div className="text-xs mt-1" style={{ color: T.subtle }}>Categorias</div>
        </div>
      </div>

      {/* Alerta de stock baixo */}
      {lowStockCount > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #7f1d1d' }}>
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Stock mínimo atingido</p>
            <p className="text-xs text-red-600 mt-0.5">
              {items.filter(i => i.lowStock).map(i => i.name).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Botão novo */}
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: '#EAB308', color: '#0A0B0D' }}>
          <Plus className="h-4 w-4" /> Novo consumível
        </button>
      </div>

      {/* Lista por categoria */}
      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: T.subtle }}>
            <span>{CATEGORY_EMOJI[cat]}</span> {CATEGORY_LABELS[cat] ?? cat}
          </p>
          <div className="space-y-2">
            {catItems.map(item => {
              const expanded = expandedId === item.id
              const stockPct = item.stockMin > 0 ? Math.min((item.stockCurrent / Math.max(item.stockMin * 3, 1)) * 100, 100) : 100
              return (
                <div key={item.id} className="rounded-2xl overflow-hidden"
                  style={{ background: T.surface, border: `1px solid ${item.lowStock ? '#7f1d1d' : T.border}` }}>
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Stock badge */}
                      <div className="flex-shrink-0 text-center w-14">
                        <div className={`text-2xl font-black ${item.lowStock ? 'text-red-400' : 'text-white'}`}>
                          {item.stockCurrent}
                        </div>
                        <div className="text-xs" style={{ color: T.muted }}>{item.unit}</div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: T.text }}>{item.name}</p>
                          {item.lowStock && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                        </div>
                        {item.reference && <p className="text-xs" style={{ color: T.muted }}>Ref: {item.reference}</p>}
                        <p className="text-xs mt-0.5" style={{ color: T.subtle }}>Mínimo: {item.stockMin} {item.unit}</p>
                        {/* barra de stock */}
                        <div className="mt-1.5 h-1 rounded-full w-24" style={{ background: T.border }}>
                          <div className="h-1 rounded-full" style={{
                            width: `${stockPct}%`,
                            background: item.stockCurrent === 0 ? '#EF4444' : item.lowStock ? '#F97316' : '#22C55E',
                          }} />
                        </div>
                      </div>

                      {/* Acções */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => { setMovId(item.id); setMovType('in'); setMovQty(1); setMovReason('') }}
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                          <TrendingUp className="h-3 w-3" /> Entrada
                        </button>
                        <button onClick={() => { setMovId(item.id); setMovType('out'); setMovQty(1); setMovReason('') }}
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                          <TrendingDown className="h-3 w-3" /> Saída
                        </button>
                        <button onClick={() => toggleExpand(item.id)} style={{ color: T.subtle }}>
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Histórico expandido */}
                  {expanded && (
                    <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: T.border }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <History className="h-3.5 w-3.5" style={{ color: T.subtle }} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>Últimos movimentos</span>
                      </div>
                      {!movements[item.id] ? (
                        <p className="text-xs" style={{ color: T.muted }}>A carregar...</p>
                      ) : movements[item.id].length === 0 ? (
                        <p className="text-xs" style={{ color: T.muted }}>Sem movimentos registados</p>
                      ) : (
                        <div className="space-y-1.5">
                          {movements[item.id].slice(0, 8).map(m => (
                            <div key={m.id} className="flex items-center gap-2 text-xs">
                              <span className={`flex-shrink-0 font-bold w-12 text-right ${m.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                                {m.type === 'in' ? '+' : '-'}{m.quantity}
                              </span>
                              <span style={{ color: T.subtle }}>{m.reason ?? (m.type === 'in' ? 'Entrada' : 'Saída')}</span>
                              <span className="ml-auto flex-shrink-0" style={{ color: T.muted }}>
                                {new Date(m.createdAt).toLocaleDateString('pt-PT')}
                                {m.operator && ` · ${m.operator.name}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* ─── Modal: Novo consumível ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#111318', border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: T.text }}>Novo consumível</h2>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4" style={{ color: T.muted }} /></button>
            </div>
            {[
              { label: 'Nome', el: <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} /> },
              { label: 'Categoria', el: <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select> },
              { label: 'Referência / código', el: <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="ex: D1.2, S2.0..." className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} /> },
              { label: 'Unidade', el: <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                {['un','cx','m','kg','L'].map(u => <option key={u} value={u}>{u}</option>)}
              </select> },
              { label: 'Stock actual / mínimo', el: (
                <div className="flex gap-2">
                  <input type="number" min={0} value={form.stockCurrent} onChange={e => setForm(p => ({ ...p, stockCurrent: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} placeholder="Actual" />
                  <input type="number" min={0} value={form.stockMin} onChange={e => setForm(p => ({ ...p, stockMin: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} placeholder="Mínimo" />
                </div>
              ) },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs mb-1" style={{ color: T.subtle }}>{f.label}</label>
                {f.el}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl py-2.5 text-sm" style={{ background: T.border, color: T.text }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.name}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: '#EAB308', color: '#0A0B0D' }}>
                {saving ? 'A guardar...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Registar movimento ─────────────────────────────────────────── */}
      {movId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: '#111318', border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: T.text }}>
                {movType === 'in' ? '📦 Entrada de stock' : '📤 Saída de stock'}
              </h2>
              <button onClick={() => setMovId(null)}><X className="h-4 w-4" style={{ color: T.muted }} /></button>
            </div>
            <p className="text-sm" style={{ color: T.subtle }}>{items.find(i => i.id === movId)?.name}</p>

            {/* Toggle entrada/saída */}
            <div className="flex gap-1 rounded-xl p-1" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              {(['in', 'out'] as const).map(t => (
                <button key={t} onClick={() => setMovType(t)}
                  className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
                  style={movType === t ? { background: t === 'in' ? '#22C55E' : '#EF4444', color: '#fff' } : { color: T.subtle }}>
                  {t === 'in' ? '↑ Entrada' : '↓ Saída'}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: T.subtle }}>Quantidade</label>
              <input type="number" min={1} value={movQty} onChange={e => setMovQty(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg px-3 py-2 text-sm text-center font-bold"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: T.subtle }}>Motivo</label>
              <input value={movReason} onChange={e => setMovReason(e.target.value)}
                placeholder={movType === 'in' ? 'Reposição de stock, Compra...' : 'Troca preventiva, Queimada, Uso em corte...'}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setMovId(null)} className="flex-1 rounded-xl py-2.5 text-sm" style={{ background: T.border, color: T.text }}>Cancelar</button>
              <button onClick={handleMovement} disabled={movSaving}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: movType === 'in' ? '#22C55E' : '#EF4444', color: '#fff' }}>
                {movSaving ? 'A registar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
