// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { Plus, Search } from 'lucide-react'

export default function ClientsPage() {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de clientes</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar clientes..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left font-medium text-slate-500">Nome</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">NIF</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Email</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Telefone</th>
              <th className="px-5 py-3 text-right font-medium text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                Nenhum cliente cadastrado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
