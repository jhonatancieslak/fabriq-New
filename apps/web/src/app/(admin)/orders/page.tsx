// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { api, type Order } from '@/lib/api'
import {
  T, Toast, PageHeader, Table, Tr, Td,
  Pagination, Badge, Empty, Btn, ActionBtn, TableToolbar, exportCSV, printOrPDF,
} from '@/components/ui/admin-ui'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em execução', completed: 'Concluída',
  cancelled: 'Cancelada', invoiced: 'Faturada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#9CA3AF', in_progress: '#EAB308', completed: '#22C55E',
  cancelled: '#EF4444', invoiced: '#A78BFA',
}

const TABS = [
  { key: '', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'in_progress', label: 'Em execução' },
  { key: 'completed', label: 'Concluídas' },
  { key: 'invoiced', label: 'Faturadas' },
  { key: 'cancelled', label: 'Canceladas' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.orders.list({ status: tab || undefined, page })
      setOrders(res.orders)
      setTotal(res.total)
      setPages(res.pages)
    } catch { showToast('Erro ao carregar ordens', 'err') }
    finally { setLoading(false) }
  }, [tab, page])

  useEffect(() => { setPage(1) }, [tab, search])
  useEffect(() => { load() }, [load])

  // client-side search filter (sobre os resultados já paginados)
  const filtered = search
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.client?.name.toLowerCase().includes(search.toLowerCase()) ||
        o.project?.name.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader
        title="Ordens de Serviço"
        sub={`${total} ordem${total !== 1 ? 's' : ''}`}
        action={
          <Link href="/orders/new" data-tour="new-order-btn">
            <Btn><Plus className="h-4 w-4" />Nova Ordem</Btn>
          </Link>
        }
      />

      <TableToolbar
        search={search} onSearch={setSearch} placeholder="Pesquisar por número, cliente ou obra…"
        filters={TABS} activeFilter={tab} onFilter={setTab}
        onPrint={() => printOrPDF('Ordens de Serviço', ['Nº', 'Cliente', 'Obra', 'Estado', 'Data'],
          filtered.map(o => [o.orderNumber, o.client?.name ?? '', o.project?.name ?? '', STATUS_LABEL[o.status] ?? o.status, fmtDate(o.createdAt)]), 'print')}
        onXLS={() => exportCSV('ordens', ['Nº', 'Cliente', 'Obra', 'Estado', 'Data'],
          filtered.map(o => [o.orderNumber, o.client?.name ?? '', o.project?.name ?? '', STATUS_LABEL[o.status] ?? o.status, fmtDate(o.createdAt)]))}
        onPDF={() => printOrPDF('Ordens de Serviço', ['Nº', 'Cliente', 'Obra', 'Estado', 'Data'],
          filtered.map(o => [o.orderNumber, o.client?.name ?? '', o.project?.name ?? '', STATUS_LABEL[o.status] ?? o.status, fmtDate(o.createdAt)]), 'pdf')}
      />

      <Table
        headers={['Número', 'Cliente', 'Obra', 'Etapas', 'Estado', 'Data', 'Ações']}
        loading={loading}
      >
        {filtered.length === 0 && !loading ? (
          <tr><td colSpan={7}>
            <Empty icon={ClipboardList} title="Nenhuma ordem encontrada" sub="Crie a primeira ordem para começar" />
          </td></tr>
        ) : filtered.map((o, i) => (
          <Tr key={o.id} last={i === filtered.length - 1}>
            <Td>
              <span className="text-sm font-mono font-bold" style={{ color: T.yellow }}>#{o.orderNumber}</span>
            </Td>
            <Td>
              <span className="text-sm font-medium" style={{ color: T.text }}>{o.client?.name ?? '—'}</span>
            </Td>
            <Td>
              <div>
                <span className="text-sm" style={{ color: T.muted }}>{o.project?.name ?? '—'}</span>
                {o.project?.code && <span className="text-xs ml-1.5 font-mono" style={{ color: T.faint }}>{o.project.code}</span>}
              </div>
            </Td>
            <Td>
              <div className="flex gap-1">
                {(o.stages ?? []).map(s => (
                  <span key={s.id} className="w-2 h-2 rounded-full" title={s.status}
                    style={{ background: s.status === 'completed' ? '#22C55E' : s.status === 'in_progress' ? T.yellow : T.faint }} />
                ))}
              </div>
            </Td>
            <Td>
              <Badge label={STATUS_LABEL[o.status] ?? o.status} color={STATUS_COLOR[o.status] ?? T.subtle} />
            </Td>
            <Td>
              <span className="text-sm" style={{ color: T.subtle }}>{fmtDate(o.createdAt)}</span>
            </Td>
            <Td>
              <Link href={`/orders/${o.id}`}>
                <ActionBtn variant="view" onClick={() => {}} title="Ver detalhe" label="Ver" />
              </Link>
            </Td>
          </Tr>
        ))}
      </Table>

      <Pagination page={page} pages={pages} total={total} onPage={setPage} />
    </div>
  )
}
