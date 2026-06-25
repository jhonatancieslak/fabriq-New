// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, Clock, QrCode } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

interface Stage {
  id: string
  type: string
  status: string
  order: {
    id: string
    orderNumber: string
    project: { name: string }
    client: { name: string }
  }
}

const stageLabels: Record<string, string> = { laser_cnc: 'Corte CNC', bending: 'Quinagem', guillotine: 'Guilhotina' }
const stageIcons:  Record<string, string>  = { laser_cnc: '⚡', bending: '🔧', guillotine: '✂️' }

export default function OperadorDashboardPage() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [operatorName, setOperatorName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('fabriq_op_token')
    const slug  = localStorage.getItem('fabriq_tenant') ?? 'demo'
    if (!token) { router.replace('/op/login'); return }

    fetch(`${API_URL}/api/v1/orders/operator/mine`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug },
    })
      .then(r => {
        if (r.status === 401) { router.replace('/op/login'); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setStages(data.stages ?? [])
        setOperatorName(data.operatorName ?? '')
      })
      .finally(() => setLoading(false))
  }, [router])

  const pending    = stages.filter(s => s.status === 'pending')
  const inProgress = stages.filter(s => s.status === 'in_progress')
  const completed  = stages.filter(s => s.status === 'completed')

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="text-slate-500 text-sm animate-pulse">A carregar tarefas...</div>
    </div>
  )

  return (
    <div className="p-4 space-y-5">
      {/* Saudação */}
      <div className="pt-2">
        <p className="text-slate-400 text-sm">Bom dia,</p>
        <h1 className="text-xl font-bold text-white">{operatorName || 'Operador'}</h1>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-2xl font-bold text-white">{inProgress.length}</div>
          <div className="text-xs text-blue-400 font-medium mt-0.5">Em execução</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-2xl font-bold text-white">{pending.length}</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">Pendentes</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-2xl font-bold text-white">{completed.length}</div>
          <div className="text-xs text-green-400 font-medium mt-0.5">Hoje</div>
        </div>
      </div>

      {/* Em execução */}
      {inProgress.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-blue-400 uppercase mb-2">Em execução</h2>
          <div className="space-y-2">
            {inProgress.map(stage => (
              <Link key={stage.id} href={`/op/ordem/${stage.order.id}`}
                className="block bg-blue-900/30 border border-blue-800 rounded-xl p-4 active:bg-blue-900/50 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{stageIcons[stage.type]}</span>
                  <span className="text-sm font-semibold text-white">{stage.order.orderNumber}</span>
                </div>
                <div className="text-xs text-blue-300">{stageLabels[stage.type]}</div>
                <div className="text-xs text-slate-400 mt-0.5">{stage.order.project.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pendentes */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase mb-2">Próximas tarefas</h2>
          <div className="space-y-2">
            {pending.map(stage => (
              <Link key={stage.id} href={`/op/ordem/${stage.order.id}`}
                className="block bg-slate-800 border border-slate-700 rounded-xl p-4 active:bg-slate-700 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{stageIcons[stage.type]}</span>
                  <span className="text-sm font-medium text-white">{stage.order.orderNumber}</span>
                </div>
                <div className="text-xs text-slate-400">{stageLabels[stage.type]}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stage.order.project.name} · {stage.order.client.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {inProgress.length === 0 && pending.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-700" />
          <p className="text-sm font-medium text-slate-500">Sem tarefas pendentes</p>
          <p className="text-xs text-slate-600 mt-1">Use o QR da folha de corte para iniciar</p>
        </div>
      )}

      {/* Botão QR Scanner */}
      <Link href="/op/ordens"
        className="fixed bottom-20 right-4 bg-yellow-400 text-slate-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:bg-yellow-300 transition-colors">
        <QrCode className="h-6 w-6" />
      </Link>
    </div>
  )
}
