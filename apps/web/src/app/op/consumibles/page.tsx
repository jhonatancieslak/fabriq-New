// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2, AlertTriangle, Package } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeader() {
  const token = localStorage.getItem('fabriq_op_token')
  const slug  = localStorage.getItem('fabriq_tenant') ?? 'demo'
  return { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type': 'application/json' }
}

const CATEGORY_LABELS: Record<string, string> = {
  lens: 'Lente', nozzle: 'Bico', ceramic: 'Cerâmica', protection: 'Janela protecção',
  fiber: 'Fibra Ótica', filter: 'Filtro', gas: 'Gás', accessory: 'Acessório', other: 'Outro',
}
const REASONS = ['Troca preventiva', 'Queimada / danificada', 'Desgaste', 'Quebrada', 'Uso em corte']

interface Consumable {
  id: string; name: string; category: string; unit: string
  stockCurrent: number; stockMin: number; lowStock: boolean
}

export default function OpConsumablesPage() {
  const router = useRouter()
  const [items, setItems]         = useState<Consumable[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Consumable | null>(null)
  const [qty, setQty]             = useState(1)
  const [reason, setReason]       = useState('Troca preventiva')
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState<string | null>(null)
  const [error, setError]         = useState('')

  useEffect(() => {
    const token = localStorage.getItem('fabriq_op_token')
    if (!token) { router.replace('/op/login'); return }

    fetch(`${API_URL}/api/v1/consumables`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(setItems)
      .finally(() => setLoading(false))
  }, [router])

  async function handleRegister() {
    if (!selected || qty <= 0) return
    setSaving(true); setError('')
    const r = await fetch(`${API_URL}/api/v1/consumables/${selected.id}/movement/operator`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ quantity: qty, reason }),
    })
    setSaving(false)
    if (!r.ok) { const e = await r.json(); setError(e.error ?? 'Erro'); return }
    setSuccess(`${qty}× ${selected.name} registado!`)
    setSelected(null); setQty(1); setReason('Troca preventiva')
    // Recarregar stock
    fetch(`${API_URL}/api/v1/consumables`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : items).then(setItems)
    setTimeout(() => setSuccess(null), 3000)
  }

  const byCategory = items.reduce((acc, i) => {
    acc[i.category] = [...(acc[i.category] ?? []), i]
    return acc
  }, {} as Record<string, Consumable[]>)

  if (loading) return <div className="p-6 text-sm text-slate-500 animate-pulse">A carregar...</div>

  return (
    <div className="p-4 space-y-4 pb-10">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-400 text-sm">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div>
        <h1 className="text-xl font-bold text-white">Consumíveis</h1>
        <p className="text-xs text-slate-500 mt-0.5">Regista o uso de bicos, lentes e outros</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-800 bg-green-900/20 p-3">
          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-300 font-medium">{success}</p>
        </div>
      )}

      {/* Painel de registo */}
      {selected ? (
        <div className="rounded-xl border border-blue-700 bg-blue-900/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{selected.name}</p>
              <p className="text-xs text-blue-300">{CATEGORY_LABELS[selected.category] ?? selected.category}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-slate-400 underline">cancelar</button>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantidade utilizada</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold text-lg active:bg-slate-600">−</button>
              <span className="text-2xl font-black text-white w-10 text-center">{qty}</span>
              <button onClick={() => setQty(q => Math.min(selected.stockCurrent, q + 1))}
                disabled={qty >= selected.stockCurrent}
                className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold text-lg active:bg-slate-600 disabled:opacity-30">+</button>
              <span className="text-xs text-slate-500">{selected.unit} · stock: {selected.stockCurrent}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Motivo</label>
            <div className="grid grid-cols-2 gap-1.5">
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium text-left transition-colors ${
                    reason === r ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 active:bg-slate-700'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={handleRegister} disabled={saving || qty <= 0 || qty > selected.stockCurrent}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white active:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'A registar...' : `Registar saída de ${qty} ${selected.unit}`}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Toca num consumível para registar uso:</p>
      )}

      {/* Lista por categoria */}
      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>
            {CATEGORY_LABELS[cat] ?? cat}
          </p>
          <div className="space-y-2">
            {catItems.map(item => (
              <button key={item.id}
                onClick={() => { setSelected(item); setQty(1); setError('') }}
                disabled={item.stockCurrent === 0}
                className={`w-full flex items-center gap-3 rounded-xl p-3 border text-left transition-colors disabled:opacity-40 ${
                  selected?.id === item.id
                    ? 'bg-blue-900/40 border-blue-700'
                    : item.lowStock
                    ? 'bg-yellow-900/10 border-yellow-800 active:bg-yellow-900/20'
                    : 'bg-slate-800 border-slate-700 active:bg-slate-700'
                }`}>
                <Package className={`h-4 w-4 flex-shrink-0 ${item.lowStock ? 'text-yellow-400' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  {item.lowStock && <p className="text-xs text-yellow-400">⚠ Stock baixo</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className={`text-lg font-black ${item.stockCurrent === 0 ? 'text-red-400' : item.lowStock ? 'text-yellow-400' : 'text-white'}`}>
                    {item.stockCurrent}
                  </div>
                  <div className="text-xs text-slate-500">{item.unit}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
