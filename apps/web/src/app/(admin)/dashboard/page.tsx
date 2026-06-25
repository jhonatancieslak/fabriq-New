// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { ClipboardList, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

const kpis = [
  { label: 'Ordens abertas',    value: '—', icon: ClipboardList, color: 'text-blue-600',   bg: 'bg-blue-50' },
  { label: 'Em execução',       value: '—', icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { label: 'Concluídas hoje',   value: '—', icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50' },
  { label: 'Aguardam faturação',value: '—', icon: AlertCircle,   color: 'text-orange-600', bg: 'bg-orange-50' },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral da produção</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder ordens recentes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Ordens em execução</h2>
        </div>
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
          Nenhuma ordem em execução
        </div>
      </div>
    </div>
  )
}
