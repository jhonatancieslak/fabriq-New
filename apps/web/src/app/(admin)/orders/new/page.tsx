// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Plus, Trash2, Upload, FileText, X, Layers, Zap,
  Scissors, AlignLeft, Flame, Wrench, Package, User, FolderOpen, Clock,
} from 'lucide-react'
import { api, type Client, type Project, type Machine, type Material, type Operator, type Requester } from '@/lib/api'
import { T, Field, Input, Select, Textarea, ErrorMsg, Btn, Combobox, Toast } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

function authHdrs(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token  = localStorage.getItem('fabriq_token') ?? ''
  const tenant = localStorage.getItem('fabriq_tenant') ?? ''
  return {
    ...(token  ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenant ? { 'X-Tenant-Slug': tenant } : {}),
  }
}

// ─── Processos disponíveis ────────────────────────────────────────────────────
const PROCESSES = [
  { id: 'guillotine', label: 'Guilhotina', icon: Scissors, stageType: 'guillotine' },
  { id: 'laser_cut',  label: 'Corte',      icon: Zap,      stageType: 'laser_cnc' },
  { id: 'bending',    label: 'Quinagem',   icon: AlignLeft, stageType: 'bending' },
  { id: 'welding',    label: 'Soldadura',  icon: Flame,    stageType: 'welding' },
  { id: 'assembly',   label: 'Montagem',   icon: Wrench,   stageType: 'other' },
] as const

const SHEET_ORIGINS = [
  { id: 'ours',    label: 'Nossa chapa',    sub: 'cobra material', color: '#CA8A04' },
  { id: 'offcut',  label: 'Retalho',        sub: 'cobra material', color: '#7C3AED' },
  { id: 'client',  label: 'Chapa cliente',  sub: 'não cobra material', color: '#6B7280' },
] as const

// ─── Parse de nome de ficheiro ─────────────────────────────────────────────────
// Formato: 85_PC83.2_Ch6_1Unid  →  { obraCode:'85', description:'PC83.2', thicknessMm:6, qty:1 }
function parseFilename(name: string): { obraCode: string; description: string; thicknessMm: number; qty: number } {
  const base = name.replace(/\.(dxf|dwg)$/i, '')
  const parts = base.split('_')
  let obraCode    = ''
  let thicknessMm = 3
  let qty         = 1
  const keep: string[] = []

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    const ch  = p.match(/^Ch(\d+(?:[.,]\d+)?)$/i)
    const un  = p.match(/^(\d+)Unid$/i)
    if (ch)  { thicknessMm = parseFloat(ch[1].replace(',', '.')); continue }
    if (un)  { qty = parseInt(un[1]); continue }
    if (i === 0 && /^\d+$/.test(p)) { obraCode = p; continue }
    keep.push(p)
  }

  return { obraCode, description: keep.join(' ') || base, thicknessMm, qty }
}

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface Sheet {
  origin: 'ours' | 'offcut' | 'client'
  materialId: string
  widthMm: string
  lengthMm: string
  thicknessMm: string // chave da colada — 1 espessura distinta = 1 colada
  batchLabel: string  // etiqueta da colada (ex: "Colada A", "Mesa 2")
}

interface Item {
  id: string // local key
  description: string
  materialId: string
  thicknessMm: string
  quantityPlanned: string
  widthMm: string
  heightMm: string
  notes: string
  projectId: string
  clientFreeText: string
  file: File | null
  // inline "nova obra" por peça
  showNewProject: boolean
  newProjCode: string
  newProjName: string
}

function newItem(overrides: Partial<Item> = {}): Item {
  return {
    id: crypto.randomUUID(),
    description: '', materialId: '', thicknessMm: '3', quantityPlanned: '1',
    widthMm: '', heightMm: '', notes: '', projectId: '', clientFreeText: '',
    file: null, showNewProject: false, newProjCode: '', newProjName: '',
    ...overrides,
  }
}

// ─── Componente DXF picker compacto ──────────────────────────────────────────
function DxfPicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  if (file) return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ background: T.bg, border: `1px solid ${T.border}` }}>
      <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#EAB308' }} />
      <span className="text-xs flex-1 truncate" style={{ color: T.text }}>{file.name}</span>
      <button onClick={() => onChange(null)} style={{ color: T.subtle }}>
        <X className="h-3 w-3" />
      </button>
    </div>
  )
  return (
    <>
      <button onClick={() => ref.current?.click()}
        className="flex items-center gap-2 rounded-xl px-3 py-2 w-full text-xs transition-all"
        style={{ background: T.bg, border: `1px dashed ${T.border}`, color: T.subtle }}>
        <Upload className="h-3.5 w-3.5" /> DXF / DWG
      </button>
      <input ref={ref} type="file" accept=".dxf,.dwg" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; onChange(f ?? null); e.target.value = '' }} />
    </>
  )
}

// ─── Card de Peça ─────────────────────────────────────────────────────────────
function ItemCard({
  item, index, materials, projects, clients,
  onChange, onRemove, onProjectCreated,
}: {
  item: Item; index: number; materials: Material[]; projects: Project[]; clients: Client[]
  onChange: (patch: Partial<Item>) => void
  onRemove: () => void
  onProjectCreated: (p: Project) => void
}) {
  const [projLoading, setProjLoading] = useState(false)
  const [projError,   setProjError]   = useState('')

  const projectOptions = projects.map(p => ({
    id: p.id, label: p.name, sub: `${p.code} · ${p.client?.name ?? ''}`,
  }))

  async function createProject() {
    if (!item.newProjCode.trim() || !item.newProjName.trim()) { setProjError('Código e nome obrigatórios'); return }
    // precisamos de um clientId — usar o da obra selecionada noutras peças ou criar
    setProjLoading(true); setProjError('')
    try {
      const p = await api.projects.create({ code: item.newProjCode.trim(), name: item.newProjName.trim(), clientId: clients[0]?.id ?? '' })
      onProjectCreated(p)
      onChange({ projectId: p.id, showNewProject: false, newProjCode: '', newProjName: '' })
    } catch (e) { setProjError(e instanceof Error ? e.message : 'Erro') }
    finally { setProjLoading(false) }
  }

  const selectedProject = projects.find(p => p.id === item.projectId)

  return (
    <div className="rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ borderBottom: `1px solid ${T.divider}` }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Peça #{index + 1}</span>
        <button onClick={onRemove} className="p-1 rounded-lg" style={{ color: T.faint }}
          title="Remover peça">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Nome + Qtd + Esp */}
        <div className="grid grid-cols-6 gap-2">
          <div className="col-span-4">
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Nome da Peça *</label>
            <input value={item.description} onChange={e => onChange({ description: e.target.value })}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              placeholder="Ex: Suporte lateral" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Qtd</label>
            <input value={item.quantityPlanned} onChange={e => onChange({ quantityPlanned: e.target.value })}
              type="number" min="1"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none text-center"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Esp. (mm)</label>
            <input value={item.thicknessMm} onChange={e => onChange({ thicknessMm: e.target.value })}
              type="number" min="0"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none text-center"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              placeholder="ex: 6" />
          </div>
        </div>

        {/* Material + Larg + Comp */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Material *</label>
            <select value={item.materialId} onChange={e => onChange({ materialId: e.target.value })}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: item.materialId ? T.text : T.subtle }}>
              <option value="">Seleccionar…</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Largura (mm)</label>
            <input value={item.widthMm} onChange={e => onChange({ widthMm: e.target.value })}
              type="number" min="0"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              placeholder="auto DXF" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Compr. (mm)</label>
            <input value={item.heightMm} onChange={e => onChange({ heightMm: e.target.value })}
              type="number" min="0"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              placeholder="auto DXF" />
          </div>
        </div>

        {/* DXF */}
        <DxfPicker file={item.file} onChange={f => onChange({ file: f })} />

        {/* Obra / Cliente avulso */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Obra</label>
            {!item.showNewProject && (
              <Combobox
                options={projectOptions}
                value={item.projectId}
                onChange={v => onChange({ projectId: v, clientFreeText: '' })}
                onCreate={name => onChange({ showNewProject: true, newProjCode: name, clientFreeText: '' })}
                placeholder="Pesquisar obra…"
                label={selectedProject?.name}
              />
            )}
            {item.showNewProject && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: T.yellowBg, border: `1px solid ${T.yellowBorder}` }}>
                <p className="text-xs font-semibold" style={{ color: T.yellow }}>Nova obra</p>
                <input value={item.newProjCode} onChange={e => onChange({ newProjCode: e.target.value })}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
                  placeholder="Código (ex: OB-001)" />
                <input value={item.newProjName} onChange={e => onChange({ newProjName: e.target.value })}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
                  placeholder="Nome da obra" />
                {projError && <p className="text-xs" style={{ color: T.danger }}>{projError}</p>}
                <div className="flex gap-1.5">
                  <button onClick={() => onChange({ showNewProject: false, newProjCode: '', newProjName: '' })}
                    className="flex-1 text-xs rounded-lg px-2 py-1.5 font-medium"
                    style={{ background: T.bg, color: T.muted }}>Cancelar</button>
                  <button onClick={createProject} disabled={projLoading}
                    className="flex-1 text-xs rounded-lg px-2 py-1.5 font-semibold"
                    style={{ background: T.yellow, color: '#07080A' }}>
                    {projLoading ? '…' : 'Criar'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Cliente (avulso)</label>
            <input value={item.clientFreeText} onChange={e => onChange({ clientFreeText: e.target.value, projectId: '' })}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              placeholder="Nome do cliente sem obra" />
          </div>
        </div>

        {/* Observação */}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Obs. da peça</label>
          <input value={item.notes} onChange={e => onChange({ notes: e.target.value })}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
            placeholder="Observação específica desta peça" />
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NewOrderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [toast,  setToast]  = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }, [])

  // ─── Dados de API
  const [clients,      setClients]      = useState<Client[]>([])
  const [projects,     setProjects]     = useState<Project[]>([])
  const [materials,    setMaterials]    = useState<Material[]>([])
  const [operators,    setOperators]    = useState<Operator[]>([])
  const [requesters,   setRequesters]   = useState<Requester[]>([])
  const [machineTypes, setMachineTypes] = useState<Set<string>>(new Set(['laser_cnc']))
  const [orderPreview, setOrderPreview] = useState<string>('OS-2026-????')

  useEffect(() => {
    Promise.all([
      api.clients.list(),
      api.projects.list(),
      api.materials.list(),
      api.operators.list(),
      api.requesters.list(),
      api.machines.list({ includeInactive: false }),
    ]).then(([c, p, mat, op, req, mRes]) => {
      setClients(c)
      setProjects(p)
      setMaterials(Array.isArray(mat) ? mat : (mat as { materials: Material[] }).materials ?? [])
      setOperators(op)
      setRequesters(req)
      const mList = (mRes as { machines: Machine[] }).machines ?? (mRes as unknown as Machine[])
      setMachineTypes(new Set(mList.map(m => m.type)))
    }).catch(() => showToast('Erro ao carregar dados', 'err'))

    // Preview do próximo número
    fetch(`${API_URL}/api/v1/settings/order-numbering`, { headers: authHdrs() })
      .then(r => r.json())
      .then(d => d.preview && setOrderPreview(d.preview))
      .catch(() => {})
  }, [showToast])

  // ─── Estado do formulário
  const today = new Date().toISOString().split('T')[0]

  // Cabeçalho
  const [requestedAt,  setRequestedAt]  = useState(today)
  const [scheduledAt,  setScheduledAt]  = useState('')
  const [isUrgent,     setIsUrgent]     = useState(false)

  // Chapa — 1 colada por espessura distinta entre as peças
  const [sheets, setSheets] = useState<Sheet[]>([
    { origin: 'ours', materialId: '', widthMm: '', lengthMm: '', thicknessMm: '', batchLabel: '' },
  ])

  // Processos
  const [processes, setProcesses] = useState<string[]>(['laser_cut'])
  function toggleProcess(id: string) {
    setProcesses(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  // Peças
  const [items, setItems] = useState<Item[]>([newItem()])
  function updateItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }
  function removeItem(id: string) {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev)
  }

  // Sincroniza coladas com as espessuras distintas presentes nas peças —
  // cada espessura diferente é sempre uma colada separada, podendo ou não existir.
  useEffect(() => {
    const distinctThicknesses = Array.from(
      new Set(items.map(it => it.thicknessMm.trim()).filter(Boolean))
    )
    if (!distinctThicknesses.length) return
    setSheets(prev => {
      const byThickness = new Map(prev.map(s => [s.thicknessMm, s]))
      const next = distinctThicknesses.map(th =>
        byThickness.get(th) ?? { origin: 'ours' as const, materialId: '', widthMm: '', lengthMm: '', thicknessMm: th, batchLabel: '' }
      )
      const same = next.length === prev.length && next.every((s, i) => s === prev[i])
      return same ? prev : next
    })
  }, [items])

  // Execução
  const [operatorId,    setOperatorId]    = useState('')
  const [requesterId,   setRequesterId]   = useState('')
  const [drawingTime,    setDrawingTime]    = useState('')
  const [estimatedTime,  setEstimatedTime]  = useState('')  // tempo estimado CypeCut HH:MM:SS
  const [cuttingTime,    setCuttingTime]    = useState('')
  const [sheetBatch,     setSheetBatch]     = useState('')
  const [sheetClientOwned, setSheetClientOwned] = useState(false)
  const [status,        setStatus]        = useState('pending')
  const [orderNotes,    setOrderNotes]    = useState('')

  // Nesting simulation
  const [nestW, setNestW] = useState('')
  const [nestH, setNestH] = useState('')
  const [nestQ, setNestQ] = useState('1')
  const [nestGap, setNestGap] = useState('5')
  const [nestResult, setNestResult] = useState<{ pcs: number; util: number } | null>(null)

  const sheetW = parseFloat(sheets[0]?.widthMm ?? '')
  const sheetH = parseFloat(sheets[0]?.lengthMm ?? '')

  function simulateNesting() {
    const pw = parseFloat(nestW); const ph = parseFloat(nestH)
    const qty = parseInt(nestQ); const gap = parseInt(nestGap)
    if (!pw || !ph || !sheetW || !sheetH) return
    const cols = Math.floor(sheetW / (pw + gap))
    const rows = Math.floor(sheetH / (ph + gap))
    const pcs  = cols * rows
    const util = Math.min(100, (pcs * pw * ph) / (sheetW * sheetH) * 100)
    setNestResult({ pcs, util: Math.round(util * 10) / 10 })
    // how many sheets needed
    void qty
  }

  // ─── Drop-zone multi-DXF
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(dxf|dwg)$/i.test(f.name))
    if (!files.length) return
    const newItems = files.map(f => {
      const parsed = parseFilename(f.name)
      const proj   = projects.find(p => p.code === parsed.obraCode)
      return newItem({
        description:    parsed.description,
        thicknessMm:    String(parsed.thicknessMm),
        quantityPlanned: String(parsed.qty),
        projectId:      proj?.id ?? '',
        file:           f,
      })
    })
    // Se só tiver 1 peça vazia, substituir; caso contrário acrescentar
    setItems(prev => {
      const isEmpty = prev.length === 1 && !prev[0].description && !prev[0].file
      return isEmpty ? newItems : [...prev, ...newItems]
    })
  }

  // ─── Submit
  async function handleSubmit() {
    // Validações básicas
    const invalidItems = items.filter(it => !it.description.trim() || !it.materialId || !parseFloat(it.thicknessMm))
    if (invalidItems.length) { setError('Preencha nome, material e espessura em todas as peças'); return }
    if (!processes.length) { setError('Seleccione pelo menos um processo'); return }

    setSaving(true); setError('')
    try {
      // Construir stages a partir dos processos selecionados (em ordem)
      const stages = PROCESSES
        .filter(p => processes.includes(p.id))
        .map(p => ({ type: p.stageType as string, operatorId: operatorId || undefined }))

      // Derivar projectId e clientId da primeira peça com esses dados
      const firstWithProject = items.find(it => it.projectId)
      const firstProject = firstWithProject ? projects.find(p => p.id === firstWithProject.projectId) : undefined

      function parseTime(t: string): number | undefined {
        if (!t) return undefined
        const parts = t.split(':').map(Number)
        if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2])
        return undefined
      }

      const payload = {
        projectId:    firstProject?.id,
        clientId:     firstProject?.clientId,
        requesterId:  requesterId || undefined,
        requestedAt:  requestedAt ? new Date(requestedAt).toISOString() : undefined,
        scheduledAt:  scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        isUrgent,
        notes:             orderNotes || undefined,
        sheetBatch:        sheetBatch || sheets.map(s => s.batchLabel).filter(Boolean).join(' / ') || undefined,
        sheetClientOwned:  sheetClientOwned || undefined,
        estimatedTimeSecs: estimatedTime ? parseTime(estimatedTime) : undefined,
        processes,
        sheets: (() => {
          const filled = sheets
            .filter(s => s.materialId || s.widthMm || s.lengthMm)
            .map(s => ({
              origin:      s.origin,
              materialId:  s.materialId || undefined,
              widthMm:     s.widthMm ? parseFloat(s.widthMm) : undefined,
              lengthMm:    s.lengthMm ? parseFloat(s.lengthMm) : undefined,
              thicknessMm: s.thicknessMm ? parseFloat(s.thicknessMm) : undefined,
              batchNumber: s.batchLabel || undefined,
            }))
          return filled.length ? filled : undefined
        })(),
        stages,
        items: items.map(it => ({
          description:    it.description.trim(),
          filename:       it.file?.name ?? '',
          materialId:     it.materialId,
          thicknessMm:    parseFloat(it.thicknessMm) || 3,
          quantityPlanned: parseInt(it.quantityPlanned) || 1,
          widthMm:        it.widthMm ? parseFloat(it.widthMm) : undefined,
          heightMm:       it.heightMm ? parseFloat(it.heightMm) : undefined,
          notes:          it.notes || undefined,
          projectId:      it.projectId || undefined,
          clientFreeText: it.clientFreeText || undefined,
        })),
      }

      const order = await api.orders.create(payload as Parameters<typeof api.orders.create>[0])
      const orderItems: { id: string }[] = ((order as unknown as Record<string, unknown>).items as { id: string }[]) ?? []

      // Upload DXF por peça
      await Promise.all(
        items.map(async (item, i) => {
          if (!item.file || !orderItems[i]?.id) return
          const fd = new FormData()
          fd.append('file', item.file)
          await fetch(`${API_URL}/api/v1/orders/${order.id}/items/${orderItems[i].id}/files`, {
            method: 'POST', headers: authHdrs(), body: fd,
          })
        })
      )

      // Atualizar tempo de desenho se preenchido
      const drawingSecs = parseTime(drawingTime)
      if (drawingSecs) {
        await fetch(`${API_URL}/api/v1/orders/${order.id}`, {
          method: 'PATCH', headers: { ...authHdrs(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ drawingTimeSecs: drawingSecs }),
        })
      }

      router.push(`/orders/${order.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar ordem')
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const requesterOptions = requesters.map(r => ({ id: r.id, label: r.name, sub: r.phone ?? undefined }))

  function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4" style={{ color: T.yellow }} />
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.text }}>{label}</h2>
        <div className="flex-1 h-px" style={{ background: T.border }} />
      </div>
    )
  }

  function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
      <div className={`rounded-2xl p-5 ${className}`} style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        {children}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Back + título */}
      <div>
        <button onClick={() => router.push('/orders')}
          className="flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: T.subtle }}
          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
          onMouseLeave={e => (e.currentTarget.style.color = T.subtle)}>
          <ChevronLeft className="h-4 w-4" /> Ordens
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>Nova Ordem</h1>
            <p className="text-sm mt-0.5 font-mono font-semibold" style={{ color: T.yellow }}>{orderPreview}</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isUrgent ? 'bg-red-500' : ''}`}
              style={!isUrgent ? { background: T.border } : {}}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isUrgent ? 'translate-x-5' : ''}`} />
            </div>
            <input type="checkbox" className="hidden" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} />
            <span className="text-sm font-semibold" style={{ color: isUrgent ? '#EF4444' : T.muted }}>Urgente</span>
          </label>
        </div>
      </div>

      {/* ── Cabeçalho da ordem ─────────────────────────── */}
      <Card>
        <SectionTitle icon={Layers} label="Identificação" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data de Solicitação">
            <Input type="date" value={requestedAt} onChange={setRequestedAt} />
          </Field>
          <Field label="Data de Corte" hint="— prevista">
            <Input type="date" value={scheduledAt} onChange={setScheduledAt} />
          </Field>
        </div>
        <Field label="Observações gerais" hint="— opcional">
          <Textarea value={orderNotes} onChange={setOrderNotes} rows={2} placeholder="Instruções gerais para esta ordem…" />
        </Field>
      </Card>

      {/* ── Chapa / Coladas ───────────────────────────── */}
      <Card>
        <SectionTitle icon={Layers} label={sheets.length > 1 ? `Chapa — ${sheets.length} coladas` : 'Chapa'} />

        {sheets.length > 1 && (
          <div className="rounded-xl px-3 py-2 mb-4 text-xs font-semibold"
            style={{ background: T.yellowBg, border: `1px solid ${T.yellowBorder}`, color: T.yellow }}>
            Esta ordem tem peças com {sheets.length} espessuras diferentes — cada espessura é sempre uma colada separada.
          </div>
        )}

        <div className="space-y-4">
          {sheets.map((s, idx) => (
            <div key={s.thicknessMm || idx} className={sheets.length > 1 ? 'rounded-xl p-3' : ''}
              style={sheets.length > 1 ? { background: T.bg, border: `1px solid ${T.border}` } : undefined}>
              {sheets.length > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold" style={{ color: T.text }}>
                    Colada {idx + 1} — {s.thicknessMm || '?'}mm
                  </p>
                  <input value={s.batchLabel}
                    onChange={e => setSheets(prev => prev.map((sh, i) => i === idx ? { ...sh, batchLabel: e.target.value } : sh))}
                    className="flex-1 rounded-lg px-2 py-1 text-xs outline-none"
                    style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
                    placeholder="Etiqueta desta colada (ex: Mesa 2)" />
                </div>
              )}

              {/* Tipo de origem */}
              <div className="flex gap-2 mb-4">
                {SHEET_ORIGINS.map(o => (
                  <button key={o.id}
                    onClick={() => setSheets(prev => prev.map((sh, i) => i === idx ? { ...sh, origin: o.id } : sh))}
                    className="flex-1 rounded-xl p-3 text-left transition-all"
                    style={s.origin === o.id
                      ? { background: `${o.color}15`, border: `2px solid ${o.color}` }
                      : { background: T.bg, border: `1px solid ${T.border}` }}>
                    <p className="text-xs font-bold" style={{ color: s.origin === o.id ? o.color : T.text }}>{o.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{o.sub}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3">
                <Field label="Largura (mm)">
                  <Input value={s.widthMm} onChange={v => setSheets(prev => prev.map((sh, i) => i === idx ? { ...sh, widthMm: v } : sh))} type="number" placeholder="ex: 1500" />
                </Field>
                <Field label="Comprimento (mm)">
                  <Input value={s.lengthMm} onChange={v => setSheets(prev => prev.map((sh, i) => i === idx ? { ...sh, lengthMm: v } : sh))} type="number" placeholder="ex: 3000" />
                </Field>
                <Field label="Espessura (mm)" hint={sheets.length > 1 ? '— definida pelas peças' : undefined}>
                  <Input value={s.thicknessMm}
                    onChange={v => setSheets(prev => prev.map((sh, i) => i === idx ? { ...sh, thicknessMm: v } : sh))}
                    type="number" placeholder="ex: 6" disabled={sheets.length > 1} />
                </Field>
                <Field label="Material">
                  <Select value={s.materialId} onChange={v => setSheets(prev => prev.map((sh, i) => i === idx ? { ...sh, materialId: v } : sh))}>
                    <option value="">—</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Processos ─────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Zap} label="Processos desta Ordem" />
        <div className="flex flex-wrap gap-2">
          {PROCESSES.filter(p => machineTypes.has(p.stageType) || p.id === 'laser_cut').map(({ id, label, icon: Icon }) => {
            const active = processes.includes(id)
            return (
              <button key={id} onClick={() => toggleProcess(id)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                style={active
                  ? { background: T.yellowBg, border: `2px solid ${T.yellow}`, color: T.yellow }
                  : { background: T.bg, border: `1px solid ${T.border}`, color: T.muted }}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>
        {!processes.length && (
          <p className="text-xs mt-3" style={{ color: T.danger }}>Seleccione pelo menos um processo</p>
        )}
      </Card>

      {/* ── Peças ─────────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Package} label="Peças" />

        {/* Drop-zone multi-ficheiro */}
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="rounded-2xl flex flex-col items-center justify-center py-6 mb-4 transition-all"
          style={{
            background: dragging ? T.yellowBg : T.bg,
            border: `2px dashed ${dragging ? T.yellow : T.border}`,
          }}>
          <Upload className="h-6 w-6 mb-2" style={{ color: dragging ? T.yellow : T.subtle }} />
          <p className="text-sm font-semibold" style={{ color: dragging ? T.yellow : T.muted }}>
            Arrasta vários ficheiros DXF/DWG aqui
          </p>
          <p className="text-xs mt-1" style={{ color: T.faint }}>
            Cria as peças automaticamente pelo nome — ex.: <span className="font-mono">85_PC83.2_Ch6_1Unid</span>
          </p>
          <p className="text-xs" style={{ color: T.faint }}>(obra · peça · espessura · quantidade)</p>
        </div>

        {/* Lista de peças */}
        <div className="space-y-4">
          {items.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              index={i}
              materials={materials}
              projects={projects}
              clients={clients}
              onChange={patch => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
              onProjectCreated={p => {
                setProjects(prev => [...prev, p])
              }}
            />
          ))}
        </div>

        <button
          onClick={() => setItems(prev => [...prev, newItem()])}
          className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium w-full justify-center mt-4 transition-all"
          style={{ background: T.bg, border: `1px dashed ${T.border}`, color: T.subtle }}>
          <Plus className="h-4 w-4" /> Adicionar peça
        </button>

        <p className="text-xs mt-2 text-center" style={{ color: T.faint }}>
          Cada linha representa uma peça — pode ter clientes, obras e espessuras distintos.
        </p>
      </Card>

      {/* ── Execução ──────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Clock} label="Execução" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Operador" hint="— opcional">
            <Select value={operatorId} onChange={setOperatorId}>
              <option value="">— Nenhum —</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </Select>
          </Field>
          <Field label="Colada da Chapa" hint={sheets.length > 1 ? '— definida por colada, acima' : '— opcional'}>
            <Input value={sheetBatch} onChange={setSheetBatch} placeholder="ex: Colada A, Mesa 2…" disabled={sheets.length > 1} />
          </Field>
          <Field label="Tempo Estimado (CypeCut)" hint="HH:MM:SS — do software de nesting">
            <input value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              placeholder="00:00:00" />
          </Field>
          <Field label="Tempo de Desenho/Programação" hint="HH:MM:SS">
            <input value={drawingTime} onChange={e => setDrawingTime(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              placeholder="00:00:00" />
          </Field>
          <div className="col-span-2 flex items-center gap-3 p-3 rounded-xl border border-zinc-700 bg-zinc-900/50">
            <input type="checkbox" id="sheetClientOwned" checked={sheetClientOwned}
              onChange={e => setSheetClientOwned(e.target.checked)}
              className="w-4 h-4 accent-yellow-500" />
            <label htmlFor="sheetClientOwned" className="text-sm cursor-pointer" style={{ color: T.text }}>
              Chapa fornecida pelo cliente (sem custo de material na faturação)
            </label>
          </div>
          <Field label="Tempo Real de Corte" hint="— preencher após conclusão">
            <Input value={cuttingTime} onChange={setCuttingTime} placeholder="00:00:00" disabled />
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={setStatus}>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em execução</option>
            </Select>
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold" style={{ color: T.muted }}>Solicitado por *</label>
              <a href="/requesters" className="text-xs font-semibold underline" style={{ color: T.yellow }}>Gerir solicitadores</a>
            </div>
            <Combobox
              options={requesterOptions}
              value={requesterId}
              onChange={setRequesterId}
              onCreate={async name => {
                try {
                  const r = await api.requesters.create({ name })
                  setRequesters(prev => [...prev, r])
                  setRequesterId(r.id)
                } catch { showToast('Erro ao criar solicitador', 'err') }
              }}
              placeholder="Pesquisar solicitador…"
              label={requesters.find(r => r.id === requesterId)?.name}
            />
          </div>
        </div>
      </Card>

      {/* ── Simulação de Nesting ──────────────────────── */}
      <Card>
        <SectionTitle icon={Layers} label="Simulação de Nesting" />
        <div className="grid grid-cols-4 gap-3">
          <Field label="Larg. Peça (mm)">
            <Input value={nestW} onChange={setNestW} type="number" placeholder="ex: 200" />
          </Field>
          <Field label="Comp. Peça (mm)">
            <Input value={nestH} onChange={setNestH} type="number" placeholder="ex: 150" />
          </Field>
          <Field label="Quantidade">
            <Input value={nestQ} onChange={setNestQ} type="number" placeholder="1" />
          </Field>
          <Field label="Gap (mm)">
            <Input value={nestGap} onChange={setNestGap} type="number" placeholder="5" />
          </Field>
        </div>
        {(!sheets[0]?.widthMm || !sheets[0]?.lengthMm) && (
          <p className="text-xs mt-2" style={{ color: T.subtle }}>
            Preencha as dimensões da chapa acima para simular o nesting.
          </p>
        )}
        {sheets[0]?.widthMm && sheets[0]?.lengthMm && (
          <button onClick={simulateNesting}
            className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{ background: T.yellowBg, border: `1px solid ${T.yellowBorder}`, color: T.yellow }}>
            <Zap className="h-4 w-4" /> Calcular
          </button>
        )}
        {nestResult && (
          <div className="mt-3 flex items-center gap-6 rounded-xl px-4 py-3"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}>
            <div>
              <p className="text-xs" style={{ color: T.subtle }}>Peças por chapa</p>
              <p className="text-2xl font-black" style={{ color: T.text }}>{nestResult.pcs}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: T.subtle }}>Aproveitamento</p>
              <p className="text-2xl font-black" style={{ color: nestResult.util >= 70 ? '#22C55E' : nestResult.util >= 50 ? '#EAB308' : '#EF4444' }}>
                {nestResult.util}%
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: T.subtle }}>Chapas necessárias</p>
              <p className="text-2xl font-black" style={{ color: T.text }}>
                {Math.ceil(parseInt(nestQ) / nestResult.pcs)}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Erro + botão */}
      {error && <ErrorMsg msg={error} />}

      <div className="flex justify-end gap-3 pb-6">
        <Btn variant="ghost" onClick={() => router.push('/orders')} disabled={saving}>
          Cancelar
        </Btn>
        <Btn onClick={handleSubmit} disabled={saving || !processes.length}>
          {saving ? 'A criar ordem…' : 'Criar Ordem'}
        </Btn>
      </div>
    </div>
  )
}
