// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Plus, Trash2, Check } from 'lucide-react'
import { api, type Client, type Project, type Machine, type Material, type Operator } from '@/lib/api'
import { T, Field, Input, Select, Textarea, ErrorMsg, Btn } from '@/components/ui/admin-ui'
import { MACHINE_TYPE_LABELS } from './machine-types'

// re-export so page file doesn't export non-page exports
type StageType = string
interface Stage { type: StageType; machineId?: string; operatorId?: string }
interface Item {
  description: string; materialId: string
  thicknessMm: number; quantityPlanned: number; widthMm?: number; heightMm?: number
}

const STEPS = ['Cliente & Obra', 'Etapas', 'Peças', 'Confirmar']

export default function NewOrderPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // API data
  const [clients, setClients]     = useState<Client[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [machines, setMachines]   = useState<Machine[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [operators, setOperators] = useState<Operator[]>([])

  // form state
  const [clientId,   setClientId]   = useState('')
  const [projectId,  setProjectId]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [stages,     setStages]     = useState<Stage[]>([{ type: 'laser_cnc' }])
  const [items,      setItems]      = useState<Item[]>([{ description: '', materialId: '', thicknessMm: 3, quantityPlanned: 1 }])

  useEffect(() => {
    Promise.all([
      api.clients.list(),
      api.machines.list(),
      api.materials.list(),
      api.operators.list(),
    ]).then(([c, mRes, mat, op]) => {
      setClients(c)
      setMachines((mRes as { machines: Machine[] }).machines ?? (mRes as unknown as Machine[]))
      setMaterials(Array.isArray(mat) ? mat : (mat as { materials: Material[] }).materials)
      setOperators(op)
    })
  }, [])

  useEffect(() => {
    if (clientId) {
      api.projects.list(clientId).then(setProjects)
      setProjectId('')
    } else {
      setProjects([])
    }
  }, [clientId])

  const canNext = () => {
    if (step === 0) return clientId && projectId
    if (step === 1) return stages.length > 0
    if (step === 2) return items.every(i => i.description && i.materialId && i.quantityPlanned > 0)
    return true
  }

  async function handleSubmit() {
    setSaving(true); setError('')
    try {
      const order = await api.orders.create({ projectId, clientId, notes, stages, items })
      router.push(`/orders/${order.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar ordem')
      setSaving(false)
    }
  }

  // ── Card wrapper used in steps ─────────────────────────────────────────────
  function Card({ children }: { children: React.ReactNode }) {
    return (
      <div className="rounded-2xl p-5 space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        {children}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Back + title */}
      <div>
        <button onClick={() => router.push('/orders')}
          className="flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: T.subtle }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
          <ChevronLeft className="h-4 w-4" /> Ordens
        </button>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>Nova Ordem de Serviço</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={i < step
                  ? { background: T.yellow, color: '#07080A' }
                  : i === step
                    ? { background: T.yellowBg, border: `2px solid ${T.yellow}`, color: T.yellow }
                    : { background: T.surface, border: `1px solid ${T.border}`, color: T.faint }}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ color: i <= step ? T.text : T.faint }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-px w-6" style={{ background: i < step ? T.yellow : T.border }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Cliente & Obra */}
      {step === 0 && (
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Cliente & Obra</h2>
          <Field label="Cliente *">
            <Select value={clientId} onChange={setClientId}>
              <option value="">Seleccionar cliente…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Obra *">
            <Select value={projectId} onChange={setProjectId} disabled={!clientId}>
              <option value="">Seleccionar obra…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </Select>
          </Field>
          <Field label="Observações" hint="— opcional">
            <Textarea value={notes} onChange={setNotes} placeholder="Instruções adicionais para o operador…" rows={2} />
          </Field>
        </Card>
      )}

      {/* Step 1 — Etapas */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: T.subtle }}>
            As etapas são executadas em sequência. Adicione tantas quantas necessárias.
          </p>
          {stages.map((stage, i) => (
            <div key={i} className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Etapa {i + 1}</span>
                {stages.length > 1 && (
                  <button onClick={() => setStages(s => s.filter((_, idx) => idx !== i))}
                    className="p-1.5 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: T.faint }} />
                  </button>
                )}
              </div>

              {/* Machine type grid */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {Object.entries(MACHINE_TYPE_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setStages(s => s.map((st, idx) => idx === i ? { ...st, type: val } : st))}
                    className="rounded-xl p-2.5 text-center text-xs font-medium transition-all"
                    style={stage.type === val
                      ? { background: T.yellowBg, border: `1px solid ${T.yellow}`, color: T.yellow }
                      : { background: T.bg, border: `1px solid ${T.border}`, color: T.subtle }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Máquina" hint="— opcional">
                  <Select value={stage.machineId ?? ''} onChange={v => setStages(s => s.map((st, idx) => idx === i ? { ...st, machineId: v || undefined } : st))}>
                    <option value="">Atribuir depois</option>
                    {machines.filter(m => m.type === stage.type).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                </Field>
                <Field label="Operador" hint="— opcional">
                  <Select value={stage.operatorId ?? ''} onChange={v => setStages(s => s.map((st, idx) => idx === i ? { ...st, operatorId: v || undefined } : st))}>
                    <option value="">Atribuir depois</option>
                    {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          ))}

          <button onClick={() => setStages(s => [...s, { type: 'laser_cnc' }])}
            className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium w-full justify-center transition-all"
            style={{ background: T.bg, border: `1px dashed ${T.border}`, color: T.subtle }}>
            <Plus className="h-4 w-4" /> Adicionar etapa
          </button>
        </div>
      )}

      {/* Step 2 — Peças */}
      {step === 2 && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Peça {i + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => setItems(it => it.filter((_, idx) => idx !== i))}
                    className="p-1.5 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: T.faint }} />
                  </button>
                )}
              </div>
              <Field label="Descrição *">
                <Input value={item.description} onChange={v => setItems(it => it.map((x, idx) => idx === i ? { ...x, description: v } : x))}
                  placeholder="Ex: Suporte lateral direito" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Material *">
                  <Select value={item.materialId} onChange={v => setItems(it => it.map((x, idx) => idx === i ? { ...x, materialId: v } : x))}>
                    <option value="">Seleccionar…</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                </Field>
                <Field label="Espessura (mm) *">
                  <Input value={String(item.thicknessMm)} onChange={v => setItems(it => it.map((x, idx) => idx === i ? { ...x, thicknessMm: parseFloat(v) || 0 } : x))} type="number" />
                </Field>
                <Field label="Largura (mm)" hint="— opcional">
                  <Input value={item.widthMm != null ? String(item.widthMm) : ''} onChange={v => setItems(it => it.map((x, idx) => idx === i ? { ...x, widthMm: v ? parseFloat(v) : undefined } : x))} type="number" placeholder="opcional" />
                </Field>
                <Field label="Altura (mm)" hint="— opcional">
                  <Input value={item.heightMm != null ? String(item.heightMm) : ''} onChange={v => setItems(it => it.map((x, idx) => idx === i ? { ...x, heightMm: v ? parseFloat(v) : undefined } : x))} type="number" placeholder="opcional" />
                </Field>
                <Field label="Quantidade *">
                  <Input value={String(item.quantityPlanned)} onChange={v => setItems(it => it.map((x, idx) => idx === i ? { ...x, quantityPlanned: parseInt(v) || 1 } : x))} type="number" />
                </Field>
              </div>
            </div>
          ))}

          <button onClick={() => setItems(it => [...it, { description: '', materialId: '', thicknessMm: 3, quantityPlanned: 1 }])}
            className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium w-full justify-center transition-all"
            style={{ background: T.bg, border: `1px dashed ${T.border}`, color: T.subtle }}>
            <Plus className="h-4 w-4" /> Adicionar peça
          </button>
        </div>
      )}

      {/* Step 3 — Confirmar */}
      {step === 3 && (
        <div className="rounded-2xl p-5 space-y-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Resumo da Ordem</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: T.faint }}>Cliente</p>
              <p className="text-sm font-medium" style={{ color: T.text }}>{clients.find(c => c.id === clientId)?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: T.faint }}>Obra</p>
              <p className="text-sm font-medium" style={{ color: T.text }}>{projects.find(p => p.id === projectId)?.name ?? '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: T.faint }}>Etapas ({stages.length})</p>
            <div className="space-y-1">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: T.muted }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: T.yellowBg, color: T.yellow }}>{i + 1}</span>
                  {MACHINE_TYPE_LABELS[s.type] ?? s.type}
                  {s.machineId && machines.find(m => m.id === s.machineId) && (
                    <span style={{ color: T.faint }}>· {machines.find(m => m.id === s.machineId)?.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: T.faint }}>Peças ({items.length})</p>
            <div className="space-y-1">
              {items.map((it, i) => (
                <div key={i} className="text-sm" style={{ color: T.muted }}>
                  {i + 1}. {it.description} — {it.quantityPlanned} un. · {it.thicknessMm}mm
                </div>
              ))}
            </div>
          </div>

          {notes && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: T.faint }}>Observações</p>
              <p className="text-sm" style={{ color: T.muted }}>{notes}</p>
            </div>
          )}

          {error && <ErrorMsg msg={error} />}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Btn variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Btn>
        {step < STEPS.length - 1 ? (
          <Btn onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            Seguinte <ChevronRight className="h-4 w-4" />
          </Btn>
        ) : (
          <Btn onClick={handleSubmit} disabled={saving}>
            <Check className="h-4 w-4" />
            {saving ? 'A criar…' : 'Criar Ordem'}
          </Btn>
        )}
      </div>
    </div>
  )
}
