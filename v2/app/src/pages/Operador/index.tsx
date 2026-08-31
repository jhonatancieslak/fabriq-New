// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import InstallAppBanner from '../../components/InstallAppBanner'
import {
  MACHINE_TYPE_LABELS,
  MATERIAL_NAME_LABELS,
  type Client,
  type EtapaProducao,
  type Material,
  type ProductionOrder,
  type ProductionOrderItem,
  type ProductionOrderStage,
  type Quote,
} from '../../types/db'

const ETAPA_LABEL: Record<EtapaProducao, string> = {
  corte: 'Corte',
  quinagem: 'Quinagem',
  guilhotina: 'Guilhotina',
  acabamento: 'Acabamento',
  finalizado: 'Finalizado',
}

export default function Operador() {
  const { company, appUser, signOut } = useAuth()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [stages, setStages] = useState<ProductionOrderStage[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [items, setItems] = useState<ProductionOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: o }, { data: st }, { data: q }, { data: c }, { data: m }, { data: it }] = await Promise.all([
      supabase.from('production_orders').select('*').in('status', ['aguardando', 'em_producao']).order('created_at', { ascending: true }),
      supabase.from('production_order_stages').select('*').order('numero_etapa', { ascending: true }),
      supabase.from('quotes').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('materials').select('*'),
      supabase.from('production_order_items').select('*'),
    ])
    setOrders((o as ProductionOrder[]) ?? [])
    setStages((st as ProductionOrderStage[]) ?? [])
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
    const now = new Date().toISOString()
    const { data: updated } = await supabase
      .from('production_orders')
      .update({ status: 'em_producao', iniciado_em: order.iniciado_em ?? now, updated_at: now })
      .eq('id', order.id)
      .select()
      .single()
    const { data: stage } = await supabase
      .from('production_order_stages')
      .insert({
        company_id: company!.id,
        production_order_id: order.id,
        numero_etapa: 1,
        etapa: 'corte',
        status: 'em_curso',
        iniciado_em: now,
        operador_id: appUser?.id ?? null,
      })
      .select()
      .single()
    if (updated) setOrders((prev) => prev.map((o) => (o.id === order.id ? (updated as ProductionOrder) : o)))
    if (stage) setStages((prev) => [...prev, stage as ProductionOrderStage])
    setBusyId(null)
  }

  async function concluirEtapa(order: ProductionOrder, stage: ProductionOrderStage, foto: File) {
    setBusyId(order.id)
    const now = new Date().toISOString()

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

    const { data: updatedStage } = await supabase
      .from('production_order_stages')
      .update({ status: 'concluido', concluido_em: now })
      .eq('id', stage.id)
      .select()
      .single()
    if (updatedStage) setStages((prev) => prev.map((s) => (s.id === stage.id ? (updatedStage as ProductionOrderStage) : s)))
    setBusyId(null)
  }

  async function avancarEtapa(order: ProductionOrder, numeroAnterior: number, etapa: EtapaProducao) {
    setBusyId(order.id)
    const now = new Date().toISOString()
    const { data: stage } = await supabase
      .from('production_order_stages')
      .insert({
        company_id: company!.id,
        production_order_id: order.id,
        numero_etapa: numeroAnterior + 1,
        etapa,
        status: 'em_curso',
        iniciado_em: now,
        operador_id: appUser?.id ?? null,
      })
      .select()
      .single()
    if (stage) setStages((prev) => [...prev, stage as ProductionOrderStage])
    setBusyId(null)
  }

  async function finalizar(order: ProductionOrder, numeroAnterior: number) {
    setBusyId(order.id)
    const now = new Date().toISOString()
    await supabase.from('production_order_stages').insert({
      company_id: company!.id,
      production_order_id: order.id,
      numero_etapa: numeroAnterior + 1,
      etapa: 'finalizado',
      status: 'concluido',
      iniciado_em: now,
      concluido_em: now,
      operador_id: appUser?.id ?? null,
    })
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

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <InstallAppBanner />
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
                    stages={stages.filter((s) => s.production_order_id === o.id)}
                    open={openId === o.id}
                    busy={busyId === o.id}
                    clientName={clientName(o.quote_id)}
                    itemRows={items.filter((it) => it.production_order_id === o.id)}
                    materialName={materialName}
                    onToggle={() => setOpenId((v) => (v === o.id ? null : o.id))}
                    onConcluirEtapa={(stage, foto) => concluirEtapa(o, stage, foto)}
                    onAvancar={(numero, etapa) => avancarEtapa(o, numero, etapa)}
                    onFinalizar={(numero) => finalizar(o, numero)}
                  />
                ))}
              </Section>
            )}
            {pendentes.length > 0 && (
              <Section title="Aguardando">
                {pendentes.map((o) => (
                  <div key={o.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{clientName(o.quote_id)}</p>
                      <p className="text-slate-500 text-xs">
                        {MACHINE_TYPE_LABELS[o.tipo]} · {o.qr_code}
                      </p>
                    </div>
                    <button
                      onClick={() => iniciar(o)}
                      disabled={busyId === o.id}
                      className="bg-amber-500 text-black px-4 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
                    >
                      {busyId === o.id ? '…' : 'Iniciar'}
                    </button>
                  </div>
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
  stages,
  open,
  busy,
  clientName,
  itemRows,
  materialName,
  onToggle,
  onConcluirEtapa,
  onAvancar,
  onFinalizar,
}: {
  order: ProductionOrder
  stages: ProductionOrderStage[]
  open: boolean
  busy: boolean
  clientName: string
  itemRows: ProductionOrderItem[]
  materialName: (id: string | null) => string
  onToggle: () => void
  onConcluirEtapa: (stage: ProductionOrderStage, foto: File) => void
  onAvancar: (numeroAnterior: number, etapa: EtapaProducao) => void
  onFinalizar: (numeroAnterior: number) => void
}) {
  const [foto, setFoto] = useState<File | null>(null)
  const ordenadas = [...stages].sort((a, b) => a.numero_etapa - b.numero_etapa)
  const emCurso = ordenadas.find((s) => s.status === 'em_curso')
  const ultimaConcluida = [...ordenadas].reverse().find((s) => s.status === 'concluido')

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
      <button className="w-full text-left px-4 py-3 flex items-center justify-between" onClick={onToggle}>
        <div>
          <p className="font-medium">{clientName}</p>
          <p className="text-slate-500 text-xs">
            {MACHINE_TYPE_LABELS[order.tipo]} · {order.qr_code}
            {emCurso && <span className="text-amber-400"> · {ETAPA_LABEL[emCurso.etapa]}</span>}
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

          {ordenadas.length > 0 && (
            <ol className="text-xs text-slate-500 mb-4 flex flex-wrap gap-1">
              {ordenadas.map((s) => (
                <li
                  key={s.id}
                  className={`px-2 py-0.5 rounded-full ${
                    s.status === 'concluido' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  {ETAPA_LABEL[s.etapa]}
                </li>
              ))}
            </ol>
          )}

          {emCurso ? (
            <>
              <label className="block mb-3">
                <span className="text-xs text-slate-400 block mb-1">Foto de {ETAPA_LABEL[emCurso.etapa].toLowerCase()} (obrigatória)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-800 file:text-white"
                />
              </label>
              <button
                onClick={() => foto && onConcluirEtapa(emCurso, foto)}
                disabled={busy || !foto}
                className="w-full py-3 rounded-md font-semibold text-sm bg-emerald-500 text-black disabled:opacity-50"
              >
                {busy ? '…' : `Concluir ${ETAPA_LABEL[emCurso.etapa]}`}
              </button>
            </>
          ) : ultimaConcluida?.etapa === 'corte' ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAvancar(ultimaConcluida.numero_etapa, 'quinagem')}
                disabled={busy}
                className="py-2 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
              >
                Quinagem
              </button>
              <button
                onClick={() => onAvancar(ultimaConcluida.numero_etapa, 'guilhotina')}
                disabled={busy}
                className="py-2 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
              >
                Guilhotina
              </button>
              <button
                onClick={() => onAvancar(ultimaConcluida.numero_etapa, 'acabamento')}
                disabled={busy}
                className="py-2 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
              >
                Sem dobra
              </button>
            </div>
          ) : ultimaConcluida?.etapa === 'quinagem' || ultimaConcluida?.etapa === 'guilhotina' ? (
            <button
              onClick={() => onAvancar(ultimaConcluida.numero_etapa, 'acabamento')}
              disabled={busy}
              className="w-full py-3 rounded-md font-semibold text-sm bg-amber-500 text-black disabled:opacity-50"
            >
              {busy ? '…' : 'Avançar p/ Acabamento'}
            </button>
          ) : ultimaConcluida?.etapa === 'acabamento' ? (
            <button
              onClick={() => onFinalizar(ultimaConcluida.numero_etapa)}
              disabled={busy}
              className="w-full py-3 rounded-md font-semibold text-sm bg-emerald-500 text-black disabled:opacity-50"
            >
              {busy ? '…' : 'Finalizar ordem'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
