// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  MACHINE_TYPE_LABELS,
  PRODUCTION_ORDER_STATUS_LABELS,
  type Client,
  type MachineType,
  type ProductionOrder,
  type Quote,
} from '../../types/db'
import { btnGhost, btnPrimary, Card, Field, inputCls, Td, Th } from '../../components/form'

const STATUS_COLORS: Record<string, string> = {
  aguardando: 'bg-slate-700 text-slate-200',
  em_producao: 'bg-amber-600/30 text-amber-300',
  concluido: 'bg-amber-500/30 text-amber-300',
  cancelado: 'bg-red-600/30 text-red-300',
}

const TIPOS: MachineType[] = ['laser', 'guilhotina', 'quinagem']

export default function Ordens() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProductionOrder[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [approvedQuotes, setApprovedQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState('')
  const [tipo, setTipo] = useState<MachineType>('laser')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: o }, { data: q }, { data: c }] = await Promise.all([
      supabase.from('production_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*'),
      supabase.from('clients').select('*'),
    ])
    setRows((o as ProductionOrder[]) ?? [])
    setQuotes((q as Quote[]) ?? [])
    setApprovedQuotes(((q as Quote[]) ?? []).filter((x) => x.status === 'aprovado'))
    setClients((c as Client[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    if (!appUser || !selectedQuoteId) {
      setError('Selecione um orçamento aprovado.')
      return
    }
    setCreating(true)
    setError(null)

    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .insert({ company_id: appUser.company_id, quote_id: selectedQuoteId, tipo })
      .select()
      .single()

    if (orderErr || !order) {
      setCreating(false)
      setError(orderErr?.message ?? 'Erro ao criar ordem.')
      return
    }

    const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', selectedQuoteId)

    if (items && items.length > 0) {
      const rows = items.map((it: { id: string; material_id: string | null; quantidade: number; peso_kg: number | null }) => ({
        company_id: appUser.company_id,
        production_order_id: order.id,
        quote_item_id: it.id,
        material_id: it.material_id,
        quantidade: it.quantidade,
        materia_prima_consumida_kg: it.peso_kg ? Number(it.peso_kg) * it.quantidade : null,
      }))
      await supabase.from('production_order_items').insert(rows)
    }

    setCreating(false)
    navigate(`/ordens/${order.id}`)
  }

  const clientName = (quoteId: string | null) => {
    const q = quotes.find((x) => x.id === quoteId)
    return clients.find((c) => c.id === q?.client_id)?.empresa ?? 'Sem cliente'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-xl font-semibold">Ordens de Produção</h1>
        <button className={btnPrimary} onClick={() => setShowNew((v) => !v)}>
          + Nova Ordem
        </button>
      </div>

      {showNew && (
        <Card>
          <h2 className="text-white font-medium mb-4">Nova ordem de produção</h2>
          {approvedQuotes.length === 0 ? (
            <p className="text-sm text-amber-400">Nenhum orçamento aprovado disponível. Aprove um orçamento primeiro.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4 max-w-lg">
                <Field label="Orçamento aprovado">
                  <select className={inputCls} value={selectedQuoteId} onChange={(e) => setSelectedQuoteId(e.target.value)}>
                    <option value="">Selecionar…</option>
                    {approvedQuotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {clientName(q.id)} — €{Number(q.total_bruto).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo de processo">
                  <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as MachineType)}>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {MACHINE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <button className={btnPrimary} onClick={handleCreate} disabled={creating}>
                  {creating ? 'A criar…' : 'Criar ordem'}
                </button>
                <button className={btnGhost} onClick={() => setShowNew(false)}>
                  Cancelar
                </button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </Card>
      )}

      <div className="mt-5">
        <Card>
          {loading ? (
            <p className="text-sm text-slate-500">A carregar…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma ordem de produção.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th>Cliente</Th>
                  <Th>Tipo</Th>
                  <Th>Estado</Th>
                  <Th>Criada em</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/40" onClick={() => navigate(`/ordens/${o.id}`)}>
                    <Td>{clientName(o.quote_id)}</Td>
                    <Td>{MACHINE_TYPE_LABELS[o.tipo]}</Td>
                    <Td>
                      <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[o.status]}`}>{PRODUCTION_ORDER_STATUS_LABELS[o.status]}</span>
                    </Td>
                    <Td>{new Date(o.created_at).toLocaleDateString('pt-PT')}</Td>
                    <Td>
                      <span className="text-xs text-amber-400">Abrir →</span>
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
