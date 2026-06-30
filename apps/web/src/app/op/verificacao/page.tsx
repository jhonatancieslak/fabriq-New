// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2, AlertCircle, ClipboardCheck } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeader() {
  const token = localStorage.getItem('fabriq_op_token')
  const slug  = localStorage.getItem('fabriq_tenant') ?? 'demo'
  return { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type': 'application/json' }
}

const TYPE_LABELS: Record<string, string> = {
  daily: 'Verificação Diária',
  biweekly: 'Verificação Quinzenal',
  quarterly: 'Verificação Trimestral',
}
const TYPE_COLORS: Record<string, string> = {
  daily: 'border-blue-700 bg-blue-900/20',
  biweekly: 'border-yellow-700 bg-yellow-900/20',
  quarterly: 'border-purple-700 bg-purple-900/20',
}
const TYPE_TEXT: Record<string, string> = {
  daily: 'text-blue-400',
  biweekly: 'text-yellow-400',
  quarterly: 'text-purple-400',
}

interface ChecklistItem { id: string; name: string; referenceValue: string | null }
interface ItemState { ok: boolean | null; obs: string }

export default function VerificacaoPage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [pending, setPending]   = useState<string[]>([])
  const [itemMap, setItemMap]   = useState<Record<string, ChecklistItem[]>>({})
  const [activeType, setActiveType] = useState<string | null>(null)
  const [states, setStates]     = useState<Record<string, ItemState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState<string[]>([])
  const [error, setError]       = useState('')

  useEffect(() => {
    const token = localStorage.getItem('fabriq_op_token')
    if (!token) { router.replace('/op/login'); return }

    fetch(`${API_URL}/api/v1/checklist/pending`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => {
        if (data.pending?.length === 0) {
          setPending([])
        } else {
          setPending(data.pending ?? [])
          setItemMap(data.items ?? {})
          if (data.pending?.length) setActiveType(data.pending[0])
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  function initStates(type: string) {
    const items = itemMap[type] ?? []
    const s: Record<string, ItemState> = {}
    items.forEach(i => { s[i.id] = { ok: null, obs: '' } })
    setStates(s)
    setActiveType(type)
    setError('')
  }

  function setOk(itemId: string, ok: boolean) {
    setStates(prev => ({ ...prev, [itemId]: { ...prev[itemId], ok } }))
  }
  function setObs(itemId: string, obs: string) {
    setStates(prev => ({ ...prev, [itemId]: { ...prev[itemId], obs } }))
  }

  async function handleSubmit() {
    if (!activeType) return
    const items = itemMap[activeType] ?? []
    // Verificar todos respondidos
    const unanswered = items.filter(i => states[i.id]?.ok === null)
    if (unanswered.length > 0) {
      setError(`Responde a todos os ${unanswered.length} item(s) antes de submeter.`)
      return
    }
    setSubmitting(true); setError('')
    try {
      const payload = {
        type: activeType,
        items: items.map(i => ({
          itemId: i.id,
          name: i.name,
          ok: states[i.id]?.ok ?? false,
          obs: states[i.id]?.obs || undefined,
        })),
      }
      const r = await fetch(`${API_URL}/api/v1/checklist/submit`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(payload),
      })
      if (!r.ok) { const e = await r.json(); setError(e.error ?? 'Erro ao submeter'); return }
      setDone(prev => [...prev, activeType!])
      const remaining = pending.filter(t => t !== activeType && !done.includes(t))
      if (remaining.length > 0) {
        initStates(remaining[0])
      } else {
        setActiveType(null)
      }
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="p-6 text-sm text-slate-500 animate-pulse">A carregar verificações...</div>
  )

  const allDone = pending.length > 0 && done.length >= pending.length

  return (
    <div className="p-4 space-y-4 pb-10">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-400 text-sm">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div>
        <h1 className="text-xl font-bold text-white">Verificação da Máquina</h1>
        <p className="text-xs text-slate-500 mt-0.5">Chiller · Laser</p>
      </div>

      {/* Sem verificações em dívida */}
      {pending.length === 0 && (
        <div className="rounded-xl border border-green-800 bg-green-900/20 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-green-300">Todas as verificações em dia</p>
          <p className="text-xs text-slate-500 mt-1">Bom trabalho!</p>
        </div>
      )}

      {/* Todas concluídas nesta sessão */}
      {allDone && (
        <div className="rounded-xl border border-green-800 bg-green-900/20 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-green-300">Verificações concluídas</p>
          <p className="text-xs text-slate-500 mt-1">
            {done.map(t => TYPE_LABELS[t]).join(' · ')}
          </p>
          <button onClick={() => router.back()}
            className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white active:bg-slate-600">
            Voltar ao Dashboard
          </button>
        </div>
      )}

      {/* Tabs de tipos */}
      {!allDone && pending.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pending.map(type => (
            <button key={type}
              onClick={() => initStates(type)}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                activeType === type ? TYPE_COLORS[type] + ' ' + TYPE_TEXT[type] :
                done.includes(type) ? 'border-green-800 bg-green-900/20 text-green-400' :
                'border-slate-700 bg-slate-800 text-slate-400'
              }`}>
              {done.includes(type) && '✓ '}{TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {/* Checklist activo */}
      {activeType && !done.includes(activeType) && !allDone && (
        <div>
          <div className={`rounded-xl border p-4 ${TYPE_COLORS[activeType]}`}>
            <div className={`text-xs font-semibold uppercase mb-3 ${TYPE_TEXT[activeType]}`}>
              <ClipboardCheck className="inline h-3.5 w-3.5 mr-1" />
              {TYPE_LABELS[activeType]}
            </div>

            <div className="space-y-3">
              {(itemMap[activeType] ?? []).map((item, idx) => {
                const s = states[item.id] ?? { ok: null, obs: '' }
                return (
                  <div key={item.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs text-slate-500 mt-0.5 flex-shrink-0 w-4">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{item.name}</p>
                        {item.referenceValue && (
                          <p className="text-xs text-yellow-400 mt-0.5">{item.referenceValue}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setOk(item.id, true)}
                        className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                          s.ok === true ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 active:bg-slate-600'
                        }`}>
                        ✓ Conforme
                      </button>
                      <button
                        onClick={() => setOk(item.id, false)}
                        className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                          s.ok === false ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 active:bg-slate-600'
                        }`}>
                        ✗ Não conforme
                      </button>
                    </div>
                    {s.ok === false && (
                      <input
                        value={s.obs}
                        onChange={e => setObs(item.id, e.target.value)}
                        placeholder="Observação (obrigatório para não conforme)"
                        className="mt-2 w-full rounded-lg bg-slate-700 border border-red-800 px-3 py-2 text-xs text-white placeholder-slate-500"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white active:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'A submeter...' : 'Submeter Verificação'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
