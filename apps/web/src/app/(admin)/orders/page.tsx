// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const statusFilters = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'in_progress', label: 'Em execução' },
  { value: 'completed', label: 'Concluídas' },
  { value: 'awaiting_invoice', label: 'Aguarda faturação' },
  { value: 'invoiced', label: 'Faturadas' },
]

export default function OrdersPage() {
  return (
    <div className="p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ordens de Serviço</h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de ordens de corte, quinagem e guilhotina</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Nova ordem
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map(f => (
          <button
            key={f.value}
            className="shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors first:bg-blue-600 first:text-white first:border-blue-600"
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar por número, cliente ou obra..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left font-medium text-slate-500">Número</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Cliente</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Obra</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Etapas</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Estado</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Data</th>
              <th className="px-5 py-3 text-right font-medium text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">📋</span>
                  <span className="font-medium">Nenhuma ordem criada</span>
                  <span className="text-xs">Crie a primeira ordem para começar</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
