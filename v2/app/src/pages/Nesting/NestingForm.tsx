// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { calcularNestingMultiChapas, type Peca } from '../../lib/nesting'
import {
  NESTING_JOB_STATUS_LABELS,
  type NestingJob,
  type NestingLayout,
  type Quote,
  type QuoteItem,
  type SheetModel,
} from '../../types/db'
import { btnGhost, btnPrimary, Card, Field, inputCls, labelCls } from '../../components/form'

function pecasFromQuoteItems(items: QuoteItem[]): Peca[] {
  const pecas: Peca[] = []
  for (const it of items) {
    const g = it.geometria
    if (!g) continue
    const largura = g.tipo === 'circulo' ? g.diametro_mm : g.largura_mm
    const altura = g.tipo === 'circulo' ? g.diametro_mm : g.altura_mm
    if (!largura || !altura) continue
    pecas.push({ id: it.id, largura, altura, quantidade: it.quantidade, nome: it.descricao ?? undefined })
  }
  return pecas
}

export default function NestingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<NestingJob | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [sheetModels, setSheetModels] = useState<SheetModel[]>([])
  const [quoteId, setQuoteId] = useState<string>('')
  const [sheetModelId, setSheetModelId] = useState<string>('')
  const [largura, setLargura] = useState<string>('')
  const [altura, setAltura] = useState<string>('')
  const [gap, setGap] = useState<string>('2')
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      const [{ data: j }, { data: q }, { data: sm }] = await Promise.all([
        supabase.from('nesting_jobs').select('*').eq('id', id).single(),
        supabase.from('quotes').select('*').eq('status', 'aprovado').order('created_at', { ascending: false }),
        supabase.from('sheet_models').select('*').order('nome'),
      ])
      const nj = j as NestingJob
      setJob(nj)
      setQuotes((q as Quote[]) ?? [])
      setSheetModels((sm as SheetModel[]) ?? [])
      setQuoteId(nj?.quote_id ?? '')
      setLargura(nj?.chapa_largura_mm ? String(nj.chapa_largura_mm) : '')
      setAltura(nj?.chapa_altura_mm ? String(nj.chapa_altura_mm) : '')
      setGap(nj?.gap_mm ? String(nj.gap_mm) : '2')
      setLoading(false)
    }
    load()
  }, [id])

  function handleSheetModel(smId: string) {
    setSheetModelId(smId)
    const sm = sheetModels.find((s) => s.id === smId)
    if (sm) {
      setLargura(String(sm.largura_mm))
      setAltura(String(sm.altura_mm))
    }
  }

  async function handleCalcular() {
    if (!id || !job) return
    const chapaLargura = Number(largura)
    const chapaAltura = Number(altura)
    const gapMm = Number(gap)
    if (!quoteId) {
      setErro('Selecione um orçamento de origem das peças.')
      return
    }
    if (!chapaLargura || !chapaAltura) {
      setErro('Informe as dimensões da chapa.')
      return
    }
    setErro(null)
    setCalculando(true)

    const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', quoteId)
    const pecas = pecasFromQuoteItems((items as QuoteItem[]) ?? [])

    if (pecas.length === 0) {
      setErro('Nenhuma peça com geometria válida encontrada no orçamento selecionado.')
      setCalculando(false)
      return
    }

    const resultado = calcularNestingMultiChapas(pecas, chapaLargura, chapaAltura, gapMm)

    const layout: NestingLayout = {
      chapas: resultado.chapas.map((c) => ({ pecas: c.pecas, aproveitamento_pct: c.aproveitamentoPct })),
    }
    const aproveitamentoMedio =
      resultado.chapas.length > 0
        ? Math.round((resultado.chapas.reduce((s, c) => s + c.aproveitamentoPct, 0) / resultado.chapas.length) * 10) / 10
        : 0

    const { data, error } = await supabase
      .from('nesting_jobs')
      .update({
        quote_id: quoteId,
        chapa_largura_mm: chapaLargura,
        chapa_altura_mm: chapaAltura,
        gap_mm: gapMm,
        pecas_count: resultado.pecasCount,
        chapas_necessarias: resultado.chapasNecessarias,
        pecas_por_chapa: resultado.pecasPorChapa,
        pecas_nao_encaixadas: resultado.pecasNaoEncaixadas,
        aproveitamento_pct: aproveitamentoMedio,
        layout_json: layout,
        status: resultado.pecasNaoEncaixadas > 0 && resultado.chapasNecessarias === 0 ? 'erro' : 'concluido',
      })
      .eq('id', id)
      .select()
      .single()

    setCalculando(false)
    if (!error && data) setJob(data as NestingJob)
    else if (error) setErro(error.message)
  }

  if (loading) return <p className="text-sm text-slate-500">A carregar…</p>
  if (!job) return <p className="text-sm text-slate-500">Nesting não encontrado.</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-xl font-semibold">Nesting</h1>
        <button className={btnGhost} onClick={() => navigate('/nesting')}>
          ← Voltar
        </button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label="Orçamento (origem das peças)">
            <select className={inputCls} value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
              <option value="">Selecione…</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id.slice(0, 8)} — €{Number(q.total_bruto).toFixed(2)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Modelo de chapa">
            <select className={inputCls} value={sheetModelId} onChange={(e) => handleSheetModel(e.target.value)}>
              <option value="">Manual…</option>
              {sheetModels.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} ({s.largura_mm}×{s.altura_mm}mm)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Largura chapa (mm)">
            <input className={inputCls} type="number" value={largura} onChange={(e) => setLargura(e.target.value)} />
          </Field>

          <Field label="Altura chapa (mm)">
            <input className={inputCls} type="number" value={altura} onChange={(e) => setAltura(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label="Gap entre peças (mm)">
            <input className={inputCls} type="number" value={gap} onChange={(e) => setGap(e.target.value)} />
          </Field>
        </div>

        {erro && <p className="text-sm text-red-400 mb-4">{erro}</p>}

        <button className={btnPrimary} onClick={handleCalcular} disabled={calculando}>
          {calculando ? 'A calcular…' : 'Calcular nesting'}
        </button>

        <div className="mt-4 text-sm text-slate-400">
          Estado: <span className={labelCls + ' inline'}>{NESTING_JOB_STATUS_LABELS[job.status]}</span>
          {job.aproveitamento_pct !== null && ` — Aproveitamento médio: ${job.aproveitamento_pct}%`}
          {job.pecas_nao_encaixadas > 0 && ` — ${job.pecas_nao_encaixadas} peça(s) não encaixaram`}
        </div>
      </Card>

      {job.layout_json && job.layout_json.chapas.length > 0 && (
        <div className="mt-6 space-y-6">
          {job.layout_json.chapas.map((chapa, idx) => (
            <Card key={idx}>
              <p className="text-sm text-slate-300 mb-2">
                Chapa {idx + 1} de {job.layout_json!.chapas.length} — Aproveitamento: {chapa.aproveitamento_pct}%
              </p>
              <svg
                viewBox={`0 0 ${job.chapa_largura_mm} ${job.chapa_altura_mm}`}
                className="w-full bg-slate-950 border border-slate-800 rounded mx-auto"
                style={{
                  aspectRatio: `${job.chapa_largura_mm} / ${job.chapa_altura_mm}`,
                  maxHeight: '70vh',
                  maxWidth: '100%',
                  width: 'auto',
                  display: 'block',
                }}
              >
                <rect x={0} y={0} width={job.chapa_largura_mm ?? 0} height={job.chapa_altura_mm ?? 0} fill="none" stroke="#475569" strokeWidth={job.chapa_largura_mm ? job.chapa_largura_mm / 300 : 1} />
                {chapa.pecas.map((p) => (
                  <rect
                    key={p.id + p.x + p.y}
                    x={p.x}
                    y={p.y}
                    width={p.largura}
                    height={p.altura}
                    fill="#EAB30833"
                    stroke="#EAB308"
                    strokeWidth={job.chapa_largura_mm ? job.chapa_largura_mm / 500 : 0.5}
                  />
                ))}
              </svg>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
