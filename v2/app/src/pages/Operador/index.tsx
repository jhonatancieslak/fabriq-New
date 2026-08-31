// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  MACHINE_TYPE_LABELS,
  MATERIAL_NAME_LABELS,
  type Client,
  type Material,
  type ProductionOrder,
  type ProductionOrderItem,
  type Quote,
} from '../../types/db'

export default function Operador() {
  const { company, appUser, signOut } = useAuth()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [items, setItems] = useState<ProductionOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: o }, { data: q }, { data: c }, { data: m }, { data: it }] = await Promise.all([
      supabase.from('production_orders').select('*').in('status', ['aguardando', 'em_producao']).order('created_at', { ascending: true }),
      supabase.from('quotes').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('materials').select('*'),
      supabase.from('production_order_items').select('*'),
    ])
    setOrders((o as ProductionOrder[]) ?? [])
    setQuotes((q as Quote[]) ?? [])
    setClients((c as Client[]) ?? [])
    setMaterials((m as Material[]) ?? [])
    setItems((it as ProductionOrderItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const clientName = (quoteId: string | null) => {
    const q = quotes.find((x) => x.id === quoteId)
    return clients.find((c) => c.id === q?.client_id)?.empresa ?? 'Sem cliente'
  }

  const materialName = (id: string | null) => {
    const m = materials.find((x) => x.id === id)
    return m ? MATERIAL_NAME_LABELS[m.nome] : '—'
  }

  async function iniciar(order: ProductionOrder) {
    setBusyId(order.id)
    const { data } = await supabase
      .from('production_orders')
      .update({ status: 'em_producao', iniciado_em: order.iniciado_em ?? new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .select()
      .single()
    if (data) setOrders((prev) => prev.map((o) => (o.id === order.id ? (data as ProductionOrder) : o)))
    setBusyId(null)
  }

  async function concluir(order: ProductionOrder, foto: File) {
    setBusyId(order.id)
    const now = new Date().toISOString()

    const { data: stage, error: stageError } = await supabase
      .from('production_order_stages')
      .upsert(
        {
          company_id: company!.id,
          production_order_id: order.id,
          numero_etapa: 1,
          etapa: 'corte',
          status: 'concluido',
          concluido_em: now,
          operador_id: appUser?.id ?? null,
        },
        { onConflict: 'production_order_id,etapa' },
      )
      .select()
      .single()

    if (stageError || !stage) {
      setBusyId(null)
      return
    }

    const path = `${company!.id}/${stage.id}/${Date.now()}-${foto.name}`
    const { error: uploadError } = await supabase.storage.from('production-photos').upload(path, foto, {
      contentType: foto.type,
    })

    if (!uploadError) {
      await supabase.from('production_order_photos').insert({
        company_id: company!.id,
        production_order_stage_id: stage.id,
        storage_path: path,
      })
    }

    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'concluido', concluido_em: now, updated_at: now })
      .eq('id', order.id)
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== order.id))
      setOpenId(null)
    }
    setBusyId(null)
  }

  const pendentes = orders.filter((o) => o.status === 'aguardando')
  const emCurso = orders.filter((o) => o.status === 'em_producao')

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <p className="text-base font-black tracking-tight">
            FABRIQ<span className="text-amber-400">.PT</span> <span className="text-slate-500 font-normal text-sm">Operador</span>
          </p>
          <p className="text-slate-500 text-xs">{company?.nome_fantasia || company?.razao_social}</p>
        </div>
        <button onClick={signOut} className="text-slate-400 text-sm hover:text-white px-3 py-2">
          Sair
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-10">A carregar…</p>
        ) : orders.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-10">Sem ordens pendentes. 🎉</p>
        ) : (
          <>
            {emCurso.length > 0 && (
              <Section title="Em curso">
                {emCurso.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    open={openId === o.id}
                    busy={busyId === o.id}
                    clientName={clientName(o.quote_id)}
                    itemRows={items.filter((it) => it.production_order_id === o.id)}
                    materialName={materialName}
                    onToggle={() => setOpenId((v) => (v === o.id ? null : o.id))}
                    onAction={(foto) => foto && concluir(o, foto)}
                    actionLabel="Concluir"
                    actionCls="bg-emerald-500 text-black"
                    requiresPhoto
                  />
                ))}
              </Section>
            )}
            {pendentes.length > 0 && (
              <Section title="Aguardando">
                {pendentes.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    open={openId === o.id}
                    busy={busyId === o.id}
                    clientName={clientName(o.quote_id)}
                    itemRows={items.filter((it) => it.production_order_id === o.id)}
                    materialName={materialName}
                    onToggle={() => setOpenId((v) => (v === o.id ? null : o.id))}
                    onAction={() => iniciar(o)}
                    actionLabel="Iniciar"
                    actionCls="bg-amber-500 text-black"
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function OrderCard({
  order,
  open,
  busy,
  clientName,
  itemRows,
  materialName,
  onToggle,
  onAction,
  actionLabel,
  actionCls,
  requiresPhoto,
}: {
  order: ProductionOrder
  open: boolean
  busy: boolean
  clientName: string
  itemRows: ProductionOrderItem[]
  materialName: (id: string | null) => string
  onToggle: () => void
  onAction: (foto?: File) => void
  actionLabel: string
  actionCls: string
  requiresPhoto?: boolean
}) {
  const [foto, setFoto] = useState<File | null>(null)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
      <button className="w-full text-left px-4 py-3 flex items-center justify-between" onClick={onToggle}>
        <div>
          <p className="font-medium">{clientName}</p>
          <p className="text-slate-500 text-xs">
            {MACHINE_TYPE_LABELS[order.tipo]} · {order.qr_code}
          </p>
        </div>
        <span className="text-slate-500 text-lg">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3">
          {itemRows.length === 0 ? (
            <p className="text-slate-500 text-sm mb-3">Sem peças registadas.</p>
          ) : (
            <ul className="text-sm space-y-1 mb-3">
              {itemRows.map((it) => (
                <li key={it.id} className="flex justify-between text-slate-300">
                  <span>{materialName(it.material_id)}</span>
                  <span className="text-slate-500">×{it.quantidade}</span>
                </li>
              ))}
            </ul>
          )}
          {requiresPhoto && (
            <label className="block mb-3">
              <span className="text-xs text-slate-400 block mb-1">Foto de rastreabilidade (obrigatória)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-800 file:text-white"
              />
            </label>
          )}
          <button
            onClick={() => onAction(foto ?? undefined)}
            disabled={busy || (requiresPhoto && !foto)}
            className={`w-full py-3 rounded-md font-semibold text-sm ${actionCls} disabled:opacity-50`}
          >
            {busy ? '…' : actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}
