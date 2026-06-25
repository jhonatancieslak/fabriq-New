// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'

type StageType = 'laser_cnc' | 'bending' | 'guillotine'

interface Stage { type: StageType; machineId?: string; operatorId?: string }
interface Item {
  description: string; filename: string; materialId: string
  thicknessMm: number; quantityPlanned: number; widthMm?: number; heightMm?: number
}

const STEPS = ['Obra & Cliente', 'Etapas', 'Peças', 'Confirmar']

const stageTypeOptions: { value: StageType; label: string; icon: string }[] = [
  { value: 'laser_cnc',  label: 'Corte CNC Laser', icon: '⚡' },
  { value: 'bending',    label: 'Quinagem',         icon: '🔧' },
  { value: 'guillotine', label: 'Guilhotina',        icon: '✂️' },
]

export default function NewOrderPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Dados do formulário
  const [projectId, setProjectId]   = useState('')
  const [clientId,  setClientId]    = useState('')
  const [requesterId, setRequesterId] = useState('')
  const [notes, setNotes]           = useState('')
  const [stages, setStages]         = useState<Stage[]>([{ type: 'laser_cnc' }])
  const [items,  setItems]          = useState<Item[]>([{
    description: '', filename: 'peça-01.dxf', materialId: '', thicknessMm: 3, quantityPlanned: 1,
  }])

  // Dados para dropdowns (simplificado — em produção usar TanStack Query)
  const [clients]   = useState([{ id: 'seed-client-001',   name: 'Construções Ribeiro Lda' }])
  const [projects]  = useState([{ id: 'seed-project-001',  name: 'OB-2026-001 — Armazém Braga' }])
  const [materials] = useState([
    { id: 'seed-mat-001', name: 'Aço Carbono S235' },
    { id: 'seed-mat-002', name: 'Inox 304' },
    { id: 'seed-mat-003', name: 'Alumínio 5052' },
  ])
  const [operators] = useState([{ id: 'seed-operator-001', name: 'João Silva' }])

  function addStage() { setStages(s => [...s, { type: 'laser_cnc' }]) }
  function removeStage(i: number) { setStages(s => s.filter((_, idx) => idx !== i)) }
  function updateStage(i: number, data: Partial<Stage>) {
    setStages(s => s.map((st, idx) => idx === i ? { ...st, ...data } : st))
  }

  function addItem() {
    setItems(it => [...it, {
      description: '', filename: `peça-0${it.length + 1}.dxf`, materialId: '', thicknessMm: 3, quantityPlanned: 1,
    }])
  }
  function removeItem(i: number) { setItems(it => it.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, data: Partial<Item>) {
    setItems(it => it.map((item, idx) => idx === i ? { ...item, ...data } : item))
  }

  async function handleSubmit() {
    setSaving(true)
    setError('')
    try {
      const order = await api.orders.create({ projectId, clientId, requesterId: requesterId || undefined, notes, stages, items })
      router.push(`/orders/${order.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar ordem')
    } finally {
      setSaving(false)
    }
  }

  const canNext = () => {
    if (step === 0) return projectId && clientId
    if (step === 1) return stages.length > 0
    if (step === 2) return items.every(i => i.description && i.materialId && i.quantityPlanned > 0)
    return true
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-2 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Ordens
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nova Ordem de Serviço</h1>
      </div>

      {/* Indicador de passos */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${i <= step ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                i < step ? 'bg-blue-600 border-blue-600 text-white' :
                i === step ? 'border-blue-600 text-blue-600' : 'border-slate-200 text-slate-400'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className="text-sm font-medium hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Passo 0 — Obra & Cliente */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Seleccionar cliente e obra</h2>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Cliente *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Obra *</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">Seleccionar obra...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Solicitador</label>
            <select value={requesterId} onChange={e => setRequesterId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">Seleccionar solicitador...</option>
              <option value="seed-requester-001">Carlos Ferreira</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Instruções adicionais para o operador..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none" />
          </div>
        </div>
      )}

      {/* Passo 1 — Etapas */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Definir etapas de produção</h2>
          <p className="text-sm text-slate-500">As etapas são executadas em sequência. O operador só pode avançar para a próxima após concluir a anterior.</p>

          <div className="space-y-3">
            {stages.map((stage, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Etapa {i + 1}</span>
                  {stages.length > 1 && (
                    <button onClick={() => removeStage(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {stageTypeOptions.map(opt => (
                    <button key={opt.value} onClick={() => updateStage(i, { type: opt.value })}
                      className={`rounded-lg border-2 p-3 text-center text-xs font-medium transition-colors ${
                        stage.type === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <div className="text-xl mb-1">{opt.icon}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Operador</label>
                    <select value={stage.operatorId ?? ''} onChange={e => updateStage(i, { operatorId: e.target.value || undefined })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                      <option value="">Atribuir depois</option>
                      {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addStage}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center transition-colors">
            <Plus className="h-4 w-4" /> Adicionar etapa
          </button>
        </div>
      )}

      {/* Passo 2 — Peças */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Itens / Peças</h2>

          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Peça {i + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descrição da peça *</label>
                    <input type="text" value={item.description} onChange={e => updateItem(i, { description: e.target.value })}
                      placeholder="Ex: Suporte lateral direito"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Material *</label>
                    <select value={item.materialId} onChange={e => updateItem(i, { materialId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                      <option value="">Seleccionar...</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Espessura (mm) *</label>
                    <input type="number" min={0.5} step={0.5} value={item.thicknessMm}
                      onChange={e => updateItem(i, { thicknessMm: parseFloat(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Largura (mm)</label>
                    <input type="number" min={1} value={item.widthMm ?? ''} onChange={e => updateItem(i, { widthMm: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="opcional"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Altura (mm)</label>
                    <input type="number" min={1} value={item.heightMm ?? ''} onChange={e => updateItem(i, { heightMm: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="opcional"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade *</label>
                    <input type="number" min={1} value={item.quantityPlanned}
                      onChange={e => updateItem(i, { quantityPlanned: parseInt(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addItem}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center transition-colors">
            <Plus className="h-4 w-4" /> Adicionar peça
          </button>
        </div>
      )}

      {/* Passo 3 — Confirmar */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-slate-900">Confirmar e gerar ordem</h2>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Obra & Cliente</div>
              <div className="text-sm">{projects.find(p => p.id === projectId)?.name ?? projectId}</div>
              <div className="text-sm text-slate-500">{clients.find(c => c.id === clientId)?.name ?? clientId}</div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Etapas ({stages.length})</div>
              {stages.map((s, i) => (
                <div key={i} className="text-sm">{i + 1}. {stageTypeOptions.find(o => o.value === s.type)?.label}</div>
              ))}
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Peças ({items.length})</div>
              {items.map((item, i) => (
                <div key={i} className="text-sm">{i + 1}. {item.description} — {item.quantityPlanned} un.</div>
              ))}
            </div>

            {notes && (
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Observações</div>
                <div className="text-sm text-slate-600">{notes}</div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>
      )}

      {/* Navegação */}
      <div className="flex justify-between mt-8 pt-5 border-t border-slate-200">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Seguinte <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
            {saving ? 'A criar...' : '✓ Criar Ordem'}
          </button>
        )}
      </div>
    </div>
  )
}
