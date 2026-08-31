// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type EtapaProducao = 'corte' | 'quinagem' | 'guilhotina' | 'acabamento' | 'finalizado'
type StageStatus = 'pendente' | 'em_curso' | 'pausado' | 'concluido'

interface TrackingPhoto {
  storage_path: string
  thumbnail_path: string | null
  tirada_em: string
}

interface TrackingStage {
  id: string
  numero_etapa: number
  etapa: EtapaProducao
  status: StageStatus
  iniciado_em: string | null
  concluido_em: string | null
  operador_nome: string | null
  fotos: TrackingPhoto[]
}

interface TrackingResult {
  found: boolean
  status?: string
  tipo?: string
  iniciado_em?: string | null
  concluido_em?: string | null
  concluido?: boolean
  etapas?: TrackingStage[]
}

const ETAPA_LABEL: Record<EtapaProducao, string> = {
  corte: 'Corte',
  quinagem: 'Quinagem',
  guilhotina: 'Guilhotina',
  acabamento: 'Acabamento',
  finalizado: 'Finalizado',
}

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando início',
  em_producao: 'Em produção',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/production-photos`

function photoUrl(path: string) {
  return `${STORAGE_URL}/${path}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-PT')
}

export default function Tracking() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<TrackingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    supabase
      .rpc('get_order_tracking', { p_token: token })
      .then(({ data, error }) => {
        if (error) {
          setError('Não foi possível carregar a rastreabilidade.')
          return
        }
        setData(data as TrackingResult)
      })
  }, [token])

  if (error) {
    return <PublicShell><p className="text-red-400">{error}</p></PublicShell>
  }

  if (!data) {
    return <PublicShell><p className="text-slate-400">A carregar…</p></PublicShell>
  }

  if (!data.found) {
    return (
      <PublicShell>
        <p className="text-slate-400">Ordem não encontrada. Verifique o código QR.</p>
      </PublicShell>
    )
  }

  if (!data.concluido) {
    return (
      <PublicShell>
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-2xl">
            ⏳
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">
            {STATUS_LABEL[data.status ?? ''] ?? data.status}
          </h1>
          <p className="text-sm text-slate-400">
            A rastreabilidade completa (etapas e fotos) fica disponível assim que a ordem for concluída.
          </p>
          {data.iniciado_em && (
            <p className="text-xs text-slate-500 mt-4">Iniciado em {formatDate(data.iniciado_em)}</p>
          )}
        </div>
      </PublicShell>
    )
  }

  const etapas = data.etapas ?? []

  return (
    <PublicShell>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-2xl">
          ✅
        </div>
        <h1 className="text-lg font-semibold text-white mb-1">Ordem concluída</h1>
        <p className="text-sm text-slate-500">Concluído em {formatDate(data.concluido_em)}</p>
      </div>

      <div className="space-y-3">
        {etapas.map((etapa) => (
          <div key={etapa.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">
                {etapa.numero_etapa}. {ETAPA_LABEL[etapa.etapa] ?? etapa.etapa}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  etapa.status === 'concluido'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {etapa.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-0.5">
              {etapa.operador_nome && <p>Operador: {etapa.operador_nome}</p>}
              <p>Início: {formatDate(etapa.iniciado_em)}</p>
              <p>Conclusão: {formatDate(etapa.concluido_em)}</p>
            </div>
            {etapa.fotos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {etapa.fotos.map((foto, i) => (
                  <img
                    key={i}
                    src={photoUrl(foto.thumbnail_path ?? foto.storage_path)}
                    alt={`Foto ${ETAPA_LABEL[etapa.etapa]}`}
                    className="rounded-md object-cover aspect-square"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </PublicShell>
  )
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}
