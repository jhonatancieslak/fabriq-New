// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabase'
import {
  MACHINE_TYPE_LABELS,
  MATERIAL_NAME_LABELS,
  PRODUCTION_ORDER_STATUS_LABELS,
  type Client,
  type Material,
  type ProductionOrder,
  type ProductionOrderItem,
  type ProductionOrderStatus,
  type Quote,
} from '../../types/db'
import { btnGhost, Card, Td, Th, PageLoading } from '../../components/form'

const STATUSES: ProductionOrderStatus[] = ['aguardando', 'em_producao', 'concluido', 'cancelado']

async function printLabel(qrCode: string) {
  const dataUrl = await QRCode.toDataURL(`https://v2.fabriq.pt/t/${qrCode}`, { width: 300, margin: 1 })
  const win = window.open('', '_blank', 'width=400,height=500')
  if (!win) return
  win.document.write(`
    <html>
      <head><title>Etiqueta ${qrCode}</title></head>
      <body style="text-align:center;font-family:sans-serif;padding:20px">
        <img src="${dataUrl}" style="width:250px;height:250px" />
        <p style="font-size:12px;letter-spacing:1px">${qrCode}</p>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close() }</script>
      </body>
    </html>
  `)
  win.document.close()
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<ProductionOrder | null>(null)
  const [items, setItems] = useState<ProductionOrderItem[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) return
    setLoading(true)
    const { data: o } = await supabase.from('production_orders').select('*').eq('id', id).maybeSingle()
    const [{ data: it }, { data: m }] = await Promise.all([
      supabase.from('production_order_items').select('*').eq('production_order_id', id),
      supabase.from('materials').select('*'),
    ])
    setOrder(o as ProductionOrder)
    setItems((it as ProductionOrderItem[]) ?? [])
    setMaterials((m as Material[]) ?? [])

    if (o?.quote_id) {
      const { data: q } = await supabase.from('quotes').select('*').eq('id', o.quote_id).maybeSingle()
      setQuote(q as Quote)
      if (q?.client_id) {
        const { data: c } = await supabase.from('clients').select('*').eq('id', q.client_id).maybeSingle()
        setClient(c as Client)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleStatus(status: ProductionOrderStatus) {
    if (!order) return
    const patch: Partial<ProductionOrder> = { status, updated_at: new Date().toISOString() }
    if (status === 'em_producao' && !order.iniciado_em) patch.iniciado_em = new Date().toISOString()
    if (status === 'concluido' && !order.concluido_em) patch.concluido_em = new Date().toISOString()

    const { data, error } = await supabase.from('production_orders').update(patch).eq('id', order.id).select().single()
    if (!error && data) setOrder(data as ProductionOrder)
  }

  const materialName = (id: string | null) => {
    const m = materials.find((x) => x.id === id)
    return m ? MATERIAL_NAME_LABELS[m.nome] : '—'
  }

  if (loading) return <PageLoading />
  if (!order) return <p className="text-sm text-red-400">Ordem não encontrada.</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button className={btnGhost} onClick={() => navigate('/ordens')}>
          ← Ordens de Produção
        </button>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              className={`px-3 py-1.5 rounded-md text-sm transition ${
                order.status === s ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {PRODUCTION_ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white font-medium mb-1">{client?.empresa ?? 'Sem cliente'}</h2>
            <p className="text-sm text-slate-400">
              Tipo: {MACHINE_TYPE_LABELS[order.tipo]} · Criada em {new Date(order.created_at).toLocaleDateString('pt-PT')}
            </p>
            {order.iniciado_em && <p className="text-xs text-slate-500 mt-1">Iniciada: {new Date(order.iniciado_em).toLocaleString('pt-PT')}</p>}
            {order.concluido_em && <p className="text-xs text-slate-500">Concluída: {new Date(order.concluido_em).toLocaleString('pt-PT')}</p>}
            {quote && <p className="text-xs text-slate-500 mt-1">Orçamento total: €{Number(quote.total_bruto).toFixed(2)}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">QR de rastreio</p>
            <code className="text-xs text-amber-400 bg-slate-800 px-2 py-1 rounded">{order.qr_code}</code>
            <div className="mt-2 flex flex-col items-end gap-2">
              <div className="bg-white p-2 rounded-md inline-block">
                <QRCodeSVG value={`https://v2.fabriq.pt/t/${order.qr_code}`} size={96} />
              </div>
              <button onClick={() => printLabel(order.qr_code)} className={btnGhost}>
                Imprimir etiqueta
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5">
        <Card>
          <h2 className="text-white font-medium mb-4">Peças a executar</h2>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Sem itens.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th>Material</Th>
                  <Th>Quantidade</Th>
                  <Th>Matéria-prima consumida (kg)</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-800/60">
                    <Td>{materialName(it.material_id)}</Td>
                    <Td>{it.quantidade}</Td>
                    <Td>{it.materia_prima_consumida_kg ? Number(it.materia_prima_consumida_kg).toFixed(3) : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
