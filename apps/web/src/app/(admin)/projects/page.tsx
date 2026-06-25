// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function ProjectsPage() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Obras</h1>
          <p className="text-sm text-slate-500 mt-1">Projectos e obras associadas a clientes</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Nova obra
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar obras..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left font-medium text-slate-500">Código</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Designação</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Cliente</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Estado</th>
              <th className="px-5 py-3 text-right font-medium text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-5 py-16 text-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">📁</span>
                  <span className="font-medium">Nenhuma obra criada</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
