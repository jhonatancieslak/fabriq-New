// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { NESTING_JOB_STATUS_LABELS, type NestingJob } from '../../types/db'
import { btnPrimary, Card, Td, Th, PageLoading } from '../../components/form'

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-slate-700 text-slate-200',
  concluido: 'bg-amber-500/30 text-amber-300',
  erro: 'bg-red-600/30 text-red-300',
}

export default function Nesting() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<NestingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nesting_jobs').select('*').order('created_at', { ascending: false })
    setRows((data as NestingJob[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleNew() {
    if (!appUser) return
    setCreating(true)
    const { data, error } = await supabase
      .from('nesting_jobs')
      .insert({ company_id: appUser.company_id, status: 'pendente' })
      .select()
      .single()
    setCreating(false)
    if (!error && data) navigate(`/nesting/${data.id}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-xl font-semibold">Nesting</h1>
        <button className={btnPrimary} onClick={handleNew} disabled={creating}>
          + Novo Nesting
        </button>
      </div>

      <Card>
        {loading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum nesting cadastrado.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <Th>Chapa</Th>
                <Th>Estado</Th>
                <Th>Peças</Th>
                <Th>Chapas necessárias</Th>
                <Th>Aproveitamento</Th>
                <Th>Criado</Th>
                <Th>{null}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/40" onClick={() => navigate(`/nesting/${n.id}`)}>
                  <Td>{n.chapa_largura_mm && n.chapa_altura_mm ? `${n.chapa_largura_mm}×${n.chapa_altura_mm}mm` : '—'}</Td>
                  <Td>
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[n.status]}`}>{NESTING_JOB_STATUS_LABELS[n.status]}</span>
                  </Td>
                  <Td>{n.pecas_count ?? '—'}</Td>
                  <Td>{n.chapas_necessarias ?? '—'}</Td>
                  <Td>{n.aproveitamento_pct !== null ? `${n.aproveitamento_pct}%` : '—'}</Td>
                  <Td>{new Date(n.created_at).toLocaleDateString('pt-PT')}</Td>
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
  )
}
