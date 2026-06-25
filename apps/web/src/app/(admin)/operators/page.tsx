// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Smartphone, User } from 'lucide-react'
import { api, type Operator } from '@/lib/api'

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.operators.list().then(setOperators).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm text-slate-500 animate-pulse">A carregar...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operadores</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestão de operadores do chão de fábrica</p>
        </div>
        <Link href="/operators/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Novo Operador
        </Link>
      </div>

      {operators.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Sem operadores registados</p>
          <p className="text-sm mt-1">Crie o primeiro operador para começar</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map(op => (
            <div key={op.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900">{op.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">@{op.username}</div>
                  {op.phone && <div className="text-xs text-slate-500 mt-1">{op.phone}</div>}
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/operators/${op.id}/access`}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
                  <Smartphone className="h-3.5 w-3.5" /> Acesso PWA
                </Link>
                <Link href={`/operators/${op.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
