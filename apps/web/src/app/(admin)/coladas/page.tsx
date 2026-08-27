// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Layers, Search } from 'lucide-react'
import { T, Table, Tr, Td, Badge, Empty, PageHeader } from '@/components/ui/admin-ui'
import { api, type BatchSheetResult } from '@/lib/api'

const ORIGIN_LABEL: Record<string, string> = { ours: 'Nossa', offcut: 'Sobra', client: 'Do cliente' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendente',   color: '#94A3B8' },
  in_progress: { label: 'Em Execução', color: '#EAB308' },
  completed:   { label: 'Concluída',  color: '#22C55E' },
  cancelled:   { label: 'Cancelada',  color: '#EF4444' },
}

export default function ColadasPage() {
  const [query, setQuery] = useState('')
  const [sheets, setSheets] = useState<BatchSheetResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.orders.searchByBatch(query.trim())
      setSheets(res.sheets)
    } catch {
      setSheets([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Rastreabilidade de Coladas"
        sub="Consulte todas as ordens e chapas que utilizaram um número de colada"
      />

      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: T.subtle }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Número da colada (ex: Colada A, Mesa 2…)"
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
          />
        </div>
        <button type="submit"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: T.yellow, color: '#111827' }}>
          Pesquisar
        </button>
      </form>

      {!searched ? (
        <Empty icon={Layers} title="Pesquise por uma colada"
          sub="Introduza o número/etiqueta de uma colada para ver todas as ordens e chapas onde foi usada." />
      ) : (
        <Table
          headers={['Colada', 'Ordem', 'Cliente / Obra', 'Origem', 'Material', 'Dimensões', 'Estado', 'Data']}
          loading={loading}
          empty={sheets?.length === 0 ? (
            <Empty icon={Layers} title="Nenhuma colada encontrada"
              sub={`Não foi encontrada nenhuma chapa com colada a corresponder a "${query}".`} />
          ) : undefined}
        >
          {sheets?.map(s => {
            const st = STATUS_LABEL[s.serviceOrder.status] ?? { label: s.serviceOrder.status, color: T.subtle }
            return (
              <Tr key={s.id}>
                <Td><span className="font-semibold" style={{ color: T.text }}>{s.batchNumber ?? '—'}</span></Td>
                <Td>
                  <Link href={`/orders/${s.serviceOrder.id}`} className="font-medium hover:underline" style={{ color: T.yellow }}>
                    {s.serviceOrder.orderNumber}
                  </Link>
                </Td>
                <Td>
                  <p style={{ color: T.text }}>{s.serviceOrder.client?.name ?? '—'}</p>
                  {s.serviceOrder.project && (
                    <p className="text-xs" style={{ color: T.faint }}>{s.serviceOrder.project.code} — {s.serviceOrder.project.name}</p>
                  )}
                </Td>
                <Td>{ORIGIN_LABEL[s.origin] ?? s.origin}</Td>
                <Td>{s.material?.name ?? '—'}</Td>
                <Td>
                  {s.widthMm && s.lengthMm ? `${Number(s.widthMm).toFixed(0)}×${Number(s.lengthMm).toFixed(0)}mm` : '—'}
                  {s.thicknessMm && <span className="ml-1 text-xs" style={{ color: T.faint }}>· {s.thicknessMm}mm</span>}
                </Td>
                <Td><Badge label={st.label} color={st.color} /></Td>
                <Td><span className="text-xs" style={{ color: T.faint }}>{fmtDate(s.serviceOrder.createdAt)}</span></Td>
              </Tr>
            )
          })}
        </Table>
      )}
    </div>
  )
}
