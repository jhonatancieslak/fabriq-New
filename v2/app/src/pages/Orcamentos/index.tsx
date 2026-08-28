// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { QUOTE_STATUS_LABELS, type Client, type Quote } from '../../types/db'
import { btnPrimary, Card, Td, Th } from '../../components/form'

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-slate-700 text-slate-200',
  enviado: 'bg-amber-600/30 text-amber-300',
  aprovado: 'bg-emerald-600/30 text-emerald-300',
  rejeitado: 'bg-red-600/30 text-red-300',
}

export default function Orcamentos() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: q }, { data: c }] = await Promise.all([
      supabase.from('quotes').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*'),
    ])
    setRows((q as Quote[]) ?? [])
    setClients((c as Client[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleNew() {
    if (!appUser) return
    setCreating(true)
    const { data, error } = await supabase
      .from('quotes')
      .insert({ company_id: appUser.company_id, status: 'rascunho' })
      .select()
      .single()
    setCreating(false)
    if (!error && data) navigate(`/orcamentos/${data.id}`)
  }

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.empresa ?? 'Sem cliente'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-xl font-semibold">Orçamentos</h1>
        <button className={btnPrimary} onClick={handleNew} disabled={creating}>
          + Novo Orçamento
        </button>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum orçamento cadastrado.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <Th>Cliente</Th>
                <Th>Estado</Th>
                <Th>Total (bruto)</Th>
                <Th>Atualizado</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/40" onClick={() => navigate(`/orcamentos/${q.id}`)}>
                  <Td>{clientName(q.client_id)}</Td>
                  <Td>
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[q.status]}`}>{QUOTE_STATUS_LABELS[q.status]}</span>
                  </Td>
                  <Td>€{Number(q.total_bruto).toFixed(2)}</Td>
                  <Td>{new Date(q.updated_at).toLocaleDateString('pt-PT')}</Td>
                  <Td>
                    <span className="text-xs text-emerald-400">Abrir →</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
