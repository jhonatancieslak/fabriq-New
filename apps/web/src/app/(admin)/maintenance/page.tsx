// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Wrench, Plus, Play, ChevronDown, ChevronUp, X, Zap } from 'lucide-react'
import { T, PageHeader } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') : 'demo'
  return { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant ?? 'demo', 'Content-Type': 'application/json' }
}

const STATUS_CONFIG = {
  overdue:   { label: 'Atrasada',  bg: 'rgba(239,68,68,0.12)',   text: '#EF4444', border: '#7f1d1d' },
  urgent:    { label: 'Urgente',   bg: 'rgba(249,115,22,0.12)',  text: '#F97316', border: '#7c2d12' },
  soon:      { label: 'Próxima',   bg: 'rgba(234,179,8,0.12)',   text: '#EAB308', border: '#713f12' },
  ok:        { label: 'Em dia',    bg: 'rgba(34,197,94,0.08)',   text: '#22C55E', border: '#14532d' },
}

const CATEGORY_LABELS: Record<string, string> = {
  optics: 'Óptica', cutting_head: 'Cabeça de Corte', cooling: 'Refrigeração',
  laser_source: 'Fonte Laser', mechanics: 'Mecânica', electrical: 'Elétrica',
  cleaning: 'Limpeza', other: 'Outro',
}
const PERIOD_LABELS: Record<string, string> = {
  hours: 'h de uso', days: 'dias', weeks: 'semanas', months: 'meses', orders: 'ordens',
}
const COMPONENT_LABELS: Record<string, string> = {
  laser_source: 'Fonte Laser', cutting_head: 'Cabeça de Corte', axis_xy: 'Eixos XY',
  axis_z: 'Eixo Z', cooling: 'Refrigeração', pneumatics: 'Pneumática',
  electrical: 'Elétrica', software: 'Software/CNC', other: 'Outro',
}
const SEVERITY_CONFIG = {
  low:      { label: 'Baixa',    color: '#22C55E' },
  medium:   { label: 'Média',    color: '#EAB308' },
  high:     { label: 'Alta',     color: '#F97316' },
  critical: { label: 'Crítica',  color: '#EF4444' },
}
const BREAKDOWN_STATUS = {
  open:        { label: 'Aberta',        color: '#EF4444' },
  in_progress: { label: 'Em resolução',  color: '#F97316' },
  resolved:    { label: 'Resolvida',     color: '#22C55E' },
}

interface Task {
  id: string; title: string; category: string; periodicity: string; interval: number
  description?: string; status: 'overdue' | 'urgent' | 'soon' | 'ok'
  nextDue: string | number | null; progressPct: number | null
  machineHours: number; machineOrders: number
  machine: { id: string; name: string }
  lastRecord?: { executedAt: string; notes?: string } | null
}
interface Breakdown {
  id: string; title: string; component: string; severity: string; status: string
  description?: string; solution?: string; downtimeMinutes?: number
  reportedAt: string; resolvedAt?: string
  machine: { id: string; name: string }
  operator?: { name: string } | null
}
interface Machine { id: string; name: string }

export default function MaintenancePage() {
  const [tasks, setTasks]             = useState<Task[]>([])
  const [breakdowns, setBreakdowns]   = useState<Breakdown[]>([])
  const [machines, setMachines]       = useState<Machine[]>([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState<'tasks' | 'breakdowns'>('tasks')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // Modal criar tarefa
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm]           = useState({ machineId: '', title: '', category: 'other', description: '', periodicity: 'days', interval: 30 })
  const [savingTask, setSavingTask]       = useState(false)

  // Modal executar tarefa
  const [execTaskId, setExecTaskId]   = useState<string | null>(null)
  const [execNotes, setExecNotes]     = useState('')
  const [executing, setExecuting]     = useState(false)

  // Modal avaria
  const [showBdModal, setShowBdModal] = useState(false)
  const [bdForm, setBdForm]           = useState({ machineId: '', title: '', component: 'other', severity: 'medium', description: '' })
  const [savingBd, setSavingBd]       = useState(false)

  // Modal resolver avaria
  const [resolveId, setResolveId]     = useState<string | null>(null)
  const [resolveSolution, setResolveSolution] = useState('')
  const [resolveDowntime, setResolveDowntime] = useState('')
  const [resolving, setResolving]     = useState(false)

  async function load() {
    const h = authHeaders()
    const [tRes, bRes, mRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/maintenance`, { headers: h }),
      fetch(`${API_URL}/api/v1/breakdowns`, { headers: h }),
      fetch(`${API_URL}/api/v1/machines`, { headers: h }),
    ])
    if (tRes.ok) setTasks(await tRes.json())
    if (bRes.ok) setBreakdowns(await bRes.json())
    if (mRes.ok) setMachines(await mRes.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleCreateTask() {
    setSavingTask(true)
    const r = await fetch(`${API_URL}/api/v1/maintenance`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(taskForm),
    })
    if (r.ok) { setShowTaskModal(false); load() }
    setSavingTask(false)
  }

  async function handleExecute() {
    if (!execTaskId) return
    setExecuting(true)
    await fetch(`${API_URL}/api/v1/maintenance/${execTaskId}/execute`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ notes: execNotes }),
    })
    setExecTaskId(null); setExecNotes(''); load()
    setExecuting(false)
  }

  async function handleCreateBreakdown() {
    setSavingBd(true)
    const r = await fetch(`${API_URL}/api/v1/breakdowns`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(bdForm),
    })
    if (r.ok) { setShowBdModal(false); load() }
    setSavingBd(false)
  }

  async function handleResolve() {
    if (!resolveId) return
    setResolving(true)
    await fetch(`${API_URL}/api/v1/breakdowns/${resolveId}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({
        status: 'resolved',
        solution: resolveSolution || null,
        downtimeMinutes: resolveDowntime ? parseInt(resolveDowntime) : null,
      }),
    })
    setResolveId(null); setResolveSolution(''); setResolveDowntime(''); load()
    setResolving(false)
  }

  async function patchBreakdown(id: string, data: object) {
    await fetch(`${API_URL}/api/v1/breakdowns/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data),
    })
    load()
  }

  // KPIs
  const overdueCount  = tasks.filter(t => t.status === 'overdue').length
  const urgentCount   = tasks.filter(t => t.status === 'urgent').length
  const openBds       = breakdowns.filter(b => b.status !== 'resolved').length

  function formatNextDue(task: Task) {
    if (task.nextDue === null) return '—'
    if (task.periodicity === 'hours') return `às ${task.nextDue}h de uso`
    if (task.periodicity === 'orders') return `na ordem #${task.nextDue}`
    return new Date(task.nextDue as string).toLocaleDateString('pt-PT')
  }

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Manutenção" sub="Preventiva e avarias" />
      <div className="text-sm text-slate-500 mt-8 animate-pulse">A carregar...</div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Manutenção" sub="Preventiva e avarias da máquina" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Atrasadas',      value: overdueCount, color: '#EF4444' },
          { label: 'Urgentes',       value: urgentCount,  color: '#F97316' },
          { label: 'Total tarefas',  value: tasks.length, color: '#6B7280' },
          { label: 'Avarias abertas',value: openBds,      color: '#EAB308' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-3xl font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: T.subtle }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        {(['tasks', 'breakdowns'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
            style={tab === t ? { background: '#EAB308', color: '#0A0B0D' } : { color: T.subtle }}>
            {t === 'tasks' ? `Preventiva (${tasks.length})` : `Avarias (${breakdowns.length})`}
          </button>
        ))}
      </div>

      {/* ─── TAREFAS ─────────────────────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: '#EAB308', color: '#0A0B0D' }}>
              <Plus className="h-4 w-4" /> Nova tarefa
            </button>
          </div>

          {tasks.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <Wrench className="h-10 w-10 mx-auto mb-3" style={{ color: T.muted }} />
              <p className="text-sm" style={{ color: T.subtle }}>Sem tarefas de manutenção. Cria a primeira!</p>
            </div>
          )}

          {tasks.map(task => {
            const sc = STATUS_CONFIG[task.status]
            const expanded = expandedTask === task.id
            return (
              <div key={task.id} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${sc.border}`, background: sc.bg }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: T.border, color: T.subtle }}>
                          {CATEGORY_LABELS[task.category] ?? task.category}
                        </span>
                        <span className="text-xs" style={{ color: T.subtle }}>{task.machine.name}</span>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{task.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.subtle }}>
                        A cada {task.interval} {PERIOD_LABELS[task.periodicity]} · próxima: {formatNextDue(task)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setExecTaskId(task.id); setExecNotes('') }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={{ background: '#22C55E', color: '#fff' }}>
                        <Play className="h-3 w-3" /> Executar
                      </button>
                      <button onClick={() => setExpandedTask(expanded ? null : task.id)}
                        style={{ color: T.subtle }}>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  {task.progressPct !== null && (
                    <div className="mt-3 h-1.5 rounded-full" style={{ background: T.border }}>
                      <div className="h-1.5 rounded-full transition-all" style={{
                        width: `${task.progressPct}%`,
                        background: task.status === 'overdue' ? '#EF4444' : task.status === 'urgent' ? '#F97316' : '#22C55E',
                      }} />
                    </div>
                  )}
                </div>

                {/* Detalhe expandido */}
                {expanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-2" style={{ borderColor: sc.border }}>
                    {task.description && <p className="text-xs" style={{ color: T.subtle }}>{task.description}</p>}
                    <div className="text-xs" style={{ color: T.muted }}>
                      Horas máquina: {task.machineHours}h · Ordens: {task.machineOrders}
                    </div>
                    {task.lastRecord && (
                      <div className="text-xs" style={{ color: T.muted }}>
                        Última execução: {new Date(task.lastRecord.executedAt).toLocaleDateString('pt-PT')}
                        {task.lastRecord.notes && ` — ${task.lastRecord.notes}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── AVARIAS ─────────────────────────────────────────────────────────── */}
      {tab === 'breakdowns' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowBdModal(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: '#EF4444', color: '#fff' }}>
              <AlertTriangle className="h-4 w-4" /> Reportar avaria
            </button>
          </div>

          {breakdowns.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p className="text-sm" style={{ color: T.subtle }}>Sem avarias registadas.</p>
            </div>
          )}

          {breakdowns.map(b => {
            const sev = SEVERITY_CONFIG[b.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium
            const st  = BREAKDOWN_STATUS[b.status as keyof typeof BREAKDOWN_STATUS] ?? BREAKDOWN_STATUS.open
            return (
              <div key={b.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: sev.color }}>● {sev.label}</span>
                      <span className="text-xs" style={{ color: st.color }}>{st.label}</span>
                      <span className="text-xs" style={{ color: T.subtle }}>{b.machine.name}</span>
                      <span className="text-xs" style={{ color: T.muted }}>{COMPONENT_LABELS[b.component] ?? b.component}</span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: T.text }}>{b.title}</p>
                    {b.description && <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{b.description}</p>}
                    {b.solution && (
                      <p className="text-xs mt-1 italic" style={{ color: '#22C55E' }}>Solução: {b.solution}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: T.muted }}>
                      {new Date(b.reportedAt).toLocaleDateString('pt-PT')}
                      {b.operator && ` · reportado por ${b.operator.name}`}
                      {b.downtimeMinutes && ` · paragem: ${b.downtimeMinutes} min`}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 flex-col items-end">
                    {b.status === 'open' && (
                      <button onClick={() => patchBreakdown(b.id, { status: 'in_progress' })}
                        className="rounded-lg px-2 py-1 text-xs font-semibold"
                        style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316' }}>
                        Em resolução
                      </button>
                    )}
                    {b.status !== 'resolved' && (
                      <button onClick={() => { setResolveId(b.id); setResolveSolution(b.solution ?? ''); setResolveDowntime('') }}
                        className="rounded-lg px-2 py-1 text-xs font-semibold"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modal: Nova tarefa ────────────────────────────────────────────────── */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#111318', border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: T.text }}>Nova tarefa preventiva</h2>
              <button onClick={() => setShowTaskModal(false)}><X className="h-4 w-4" style={{ color: T.muted }} /></button>
            </div>
            {[
              { label: 'Máquina', el: <select value={taskForm.machineId} onChange={e => setTaskForm(p => ({ ...p, machineId: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                <option value="">— seleccionar —</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select> },
              { label: 'Título', el: <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} /> },
              { label: 'Categoria', el: <select value={taskForm.category} onChange={e => setTaskForm(p => ({ ...p, category: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select> },
              { label: 'Periodicidade', el: (
                <div className="flex gap-2">
                  <input type="number" min={1} value={taskForm.interval} onChange={e => setTaskForm(p => ({ ...p, interval: parseInt(e.target.value) || 1 }))} className="w-20 rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} />
                  <select value={taskForm.periodicity} onChange={e => setTaskForm(p => ({ ...p, periodicity: e.target.value }))} className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                    {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>a cada {v}</option>)}
                  </select>
                </div>
              ) },
              { label: 'Descrição', el: <textarea rows={2} value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} /> },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs mb-1" style={{ color: T.subtle }}>{f.label}</label>
                {f.el}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowTaskModal(false)} className="flex-1 rounded-xl py-2.5 text-sm" style={{ background: T.border, color: T.text }}>Cancelar</button>
              <button onClick={handleCreateTask} disabled={savingTask || !taskForm.title || !taskForm.machineId}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: '#EAB308', color: '#0A0B0D' }}>
                {savingTask ? 'A guardar...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Executar tarefa ─────────────────────────────────────────────── */}
      {execTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: '#111318', border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: T.text }}>Registar execução</h2>
              <button onClick={() => setExecTaskId(null)}><X className="h-4 w-4" style={{ color: T.muted }} /></button>
            </div>
            <p className="text-sm" style={{ color: T.subtle }}>{tasks.find(t => t.id === execTaskId)?.title}</p>
            <div>
              <label className="block text-xs mb-1" style={{ color: T.subtle }}>Observações (opcional)</label>
              <textarea rows={2} value={execNotes} onChange={e => setExecNotes(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setExecTaskId(null)} className="flex-1 rounded-xl py-2.5 text-sm" style={{ background: T.border, color: T.text }}>Cancelar</button>
              <button onClick={handleExecute} disabled={executing}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#22C55E', color: '#fff' }}>
                <CheckCircle2 className="h-4 w-4" /> {executing ? 'A registar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Reportar avaria ─────────────────────────────────────────────── */}
      {showBdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#111318', border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: T.text }}>Reportar avaria</h2>
              <button onClick={() => setShowBdModal(false)}><X className="h-4 w-4" style={{ color: T.muted }} /></button>
            </div>
            {[
              { label: 'Máquina', el: <select value={bdForm.machineId} onChange={e => setBdForm(p => ({ ...p, machineId: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                <option value="">— seleccionar —</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select> },
              { label: 'Título da avaria', el: <input value={bdForm.title} onChange={e => setBdForm(p => ({ ...p, title: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} /> },
              { label: 'Componente', el: <select value={bdForm.component} onChange={e => setBdForm(p => ({ ...p, component: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                {Object.entries(COMPONENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select> },
              { label: 'Gravidade', el: <select value={bdForm.severity} onChange={e => setBdForm(p => ({ ...p, severity: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}>
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select> },
              { label: 'Descrição', el: <textarea rows={2} value={bdForm.description} onChange={e => setBdForm(p => ({ ...p, description: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} /> },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs mb-1" style={{ color: T.subtle }}>{f.label}</label>
                {f.el}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowBdModal(false)} className="flex-1 rounded-xl py-2.5 text-sm" style={{ background: T.border, color: T.text }}>Cancelar</button>
              <button onClick={handleCreateBreakdown} disabled={savingBd || !bdForm.title || !bdForm.machineId}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: '#EF4444', color: '#fff' }}>
                {savingBd ? 'A guardar...' : 'Reportar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Resolver avaria ──────────────────────────────────────────────── */}
      {resolveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: '#111318', border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: T.text }}>Resolver avaria</h2>
              <button onClick={() => setResolveId(null)}><X className="h-4 w-4" style={{ color: T.muted }} /></button>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: T.subtle }}>Solução aplicada</label>
              <textarea rows={3} value={resolveSolution} onChange={e => setResolveSolution(e.target.value)} placeholder="Descreve o que foi feito..." className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: T.subtle }}>Tempo de paragem (minutos)</label>
              <input type="number" min={0} value={resolveDowntime} onChange={e => setResolveDowntime(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResolveId(null)} className="flex-1 rounded-xl py-2.5 text-sm" style={{ background: T.border, color: T.text }}>Cancelar</button>
              <button onClick={handleResolve} disabled={resolving}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#22C55E', color: '#fff' }}>
                <CheckCircle2 className="h-4 w-4" /> {resolving ? 'A resolver...' : 'Marcar resolvida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
