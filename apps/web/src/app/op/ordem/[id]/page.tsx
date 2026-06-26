// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Camera, CheckCircle2, Play, ChevronLeft, AlertCircle, Trash2, Loader2, ImageOff } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

const stageLabels: Record<string, string> = {
  laser_cnc: 'Corte CNC Laser', cnc_router: 'CNC Router', plasma: 'Plasma',
  waterjet: 'Corte a Água', bending: 'Quinagem', guillotine: 'Guilhotina',
  welding: 'Soldadura', turning: 'Torneamento', milling: 'Fresagem', other: 'Outro',
}

interface StagePhoto { id: string; url: string; takenAt: string }
interface Order {
  orderNumber: string; notes?: string
  project: { name: string; code: string }
  client: { name: string }
  stages: { id: string; stageNumber: number; type: string; status: string; machine?: { name: string } }[]
  items: { id: string; description: string; thicknessMm: number; quantityPlanned: number; material?: { name: string } }[]
}

function authHeader() {
  const token = localStorage.getItem('fabriq_op_token')
  const slug  = localStorage.getItem('fabriq_tenant') ?? 'demo'
  return { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug }
}

export default function OperadorOrdemPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder]         = useState<Order | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [acting, setActing]       = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [photos, setPhotos]       = useState<StagePhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox]   = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/v1/orders/${id}`, { headers: { ...authHeader(), 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then(setOrder)
      .catch(() => setError('Ordem não encontrada'))
      .finally(() => setLoading(false))
  }, [id])

  const activeStage = order?.stages.find(s => s.status === 'in_progress') ?? order?.stages.find(s => s.status === 'pending')

  const loadPhotos = useCallback(async (stageId: string) => {
    try {
      const r = await fetch(`${API_URL}/api/v1/orders/stages/${stageId}/photos`, { headers: { ...authHeader(), 'Content-Type': 'application/json' } })
      if (r.ok) setPhotos(await r.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (activeStage?.status === 'in_progress') loadPhotos(activeStage.id)
    else setPhotos([])
  }, [activeStage, loadPhotos])

  async function handleStart() {
    if (!activeStage) return
    setActing(true); setActionMsg(''); setError('')
    try {
      const r = await fetch(`${API_URL}/api/v1/orders/stages/${activeStage.id}/start`, {
        method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' },
      })
      if (!r.ok) { const e = await r.json(); setError(e.error ?? 'Erro ao iniciar'); return }
      const updated: Order = await fetch(`${API_URL}/api/v1/orders/${id}`, { headers: { ...authHeader(), 'Content-Type': 'application/json' } }).then(r => r.json())
      setOrder(updated); setActionMsg('Etapa iniciada!')
    } finally { setActing(false) }
  }

  async function handleComplete() {
    if (!activeStage) return
    if (!confirm('Confirma a conclusão desta etapa?')) return
    setActing(true); setActionMsg(''); setError('')
    try {
      const r = await fetch(`${API_URL}/api/v1/orders/stages/${activeStage.id}/complete`, {
        method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' },
      })
      if (!r.ok) { const e = await r.json(); setError(e.error ?? 'Erro ao concluir'); return }
      const updated: Order = await fetch(`${API_URL}/api/v1/orders/${id}`, { headers: { ...authHeader(), 'Content-Type': 'application/json' } }).then(r => r.json())
      setOrder(updated); setPhotos([]); setActionMsg('Etapa concluída!')
    } finally { setActing(false) }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeStage) return
    e.target.value = ''
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch(`${API_URL}/api/v1/orders/stages/${activeStage.id}/photos`, {
        method: 'POST', headers: authHeader(), body: form,
      })
      if (!r.ok) { const e = await r.json(); setError(e.error ?? 'Erro ao enviar foto'); return }
      const photo: StagePhoto = await r.json()
      setPhotos(prev => [...prev, photo])
    } catch { setError('Erro ao enviar foto') }
    finally { setUploading(false) }
  }

  async function deletePhoto(photoId: string) {
    if (!activeStage) return
    await fetch(`${API_URL}/api/v1/orders/stages/${activeStage.id}/photos/${photoId}`, {
      method: 'DELETE', headers: authHeader(),
    })
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    if (lightbox === photoId) setLightbox(null)
  }

  if (loading) return <div className="p-6 text-sm text-slate-500 animate-pulse">A carregar...</div>
  if (!order) return <div className="p-6 text-sm text-red-400">{error || 'Ordem não encontrada'}</div>

  return (
    <div className="p-4 space-y-4 pb-10">
      {/* Lightbox */}
      {lightbox && (() => {
        const p = photos.find(x => x.id === lightbox)
        if (!p) return null
        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setLightbox(null)}>
            <div className="flex justify-between items-center p-4">
              <span className="text-xs text-slate-400">{new Date(p.takenAt).toLocaleString('pt-PT')}</span>
              <button onClick={e => { e.stopPropagation(); deletePhoto(p.id) }}
                className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 active:bg-red-600/40">
                <Trash2 className="h-3.5 w-3.5" /> Apagar
              </button>
            </div>
            <img src={`${API_URL}${p.url}`} alt="Foto de prova" className="flex-1 w-full object-contain" />
          </div>
        )
      })()}

      {/* Voltar */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-400 text-sm">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      {/* Cabeçalho */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="text-xl font-bold text-white">{order.orderNumber}</div>
        <div className="text-sm text-slate-400 mt-0.5">{order.project.code} — {order.project.name}</div>
        <div className="text-xs text-slate-500 mt-0.5">{order.client.name}</div>
        {order.notes && <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 rounded-lg p-2">{order.notes}</div>}
      </div>

      {/* Etapa activa */}
      {activeStage && (
        <div className={`rounded-xl border p-4 ${
          activeStage.status === 'in_progress' ? 'bg-blue-900/30 border-blue-700' : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Etapa actual</div>
          <div className="text-base font-semibold text-white">{stageLabels[activeStage.type] ?? activeStage.type}</div>
          {activeStage.machine && <div className="text-xs text-slate-400 mt-0.5">Máquina: {activeStage.machine.name}</div>}

          {actionMsg && (
            <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" /> {actionMsg}
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {activeStage.status === 'pending' && (
              <button onClick={handleStart} disabled={acting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700 disabled:opacity-60 transition-colors">
                <Play className="h-4 w-4" /> {acting ? 'A iniciar...' : 'Iniciar Etapa'}
              </button>
            )}
            {activeStage.status === 'in_progress' && (
              <>
                <button onClick={() => fileInput.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 active:bg-slate-700 disabled:opacity-60 transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {uploading ? 'A enviar...' : 'Foto'}
                </button>
                <button onClick={handleComplete} disabled={acting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-green-700 disabled:opacity-60 transition-colors">
                  <CheckCircle2 className="h-4 w-4" /> {acting ? 'A concluir...' : 'Concluir Etapa'}
                </button>
              </>
            )}
          </div>

          <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />

          {/* Galeria de fotos */}
          {activeStage.status === 'in_progress' && (
            <div className="mt-4">
              {photos.length === 0 && !uploading ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-3 text-xs text-slate-500">
                  <ImageOff className="h-4 w-4 flex-shrink-0" />
                  Sem fotos. Tira uma foto como prova de execução.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(p => (
                    <button key={p.id} onClick={() => setLightbox(p.id)}
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-600 active:opacity-80">
                      <img src={`${API_URL}${p.url}`} alt="Foto"
                        className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {uploading && (
                    <div className="aspect-square rounded-lg border border-slate-600 flex items-center justify-center bg-slate-700/50">
                      <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>
              )}
              {photos.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">{photos.length} foto{photos.length !== 1 ? 's' : ''} · toca para ampliar</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Peças */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="text-xs font-semibold uppercase text-slate-400 mb-3">Peças ({order.items.length})</div>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-start text-sm">
              <div>
                <div className="text-white font-medium">{item.description}</div>
                <div className="text-xs text-slate-500">{item.material?.name} · {item.thicknessMm} mm</div>
              </div>
              <div className="text-yellow-400 font-bold ml-4 flex-shrink-0">{item.quantityPlanned} un.</div>
            </div>
          ))}
        </div>
      </div>

      {/* Todas as etapas */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="text-xs font-semibold uppercase text-slate-400 mb-3">Etapas</div>
        <div className="space-y-2">
          {order.stages.map(s => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                s.status === 'completed' ? 'bg-green-400' :
                s.status === 'in_progress' ? 'bg-blue-400' : 'bg-slate-600'
              }`} />
              <span className={s.status === 'pending' ? 'text-slate-500' : 'text-white'}>
                {s.stageNumber}. {stageLabels[s.type] ?? s.type}
              </span>
              {s.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 ml-auto" />}
              {s.status === 'in_progress' && <span className="text-xs text-blue-400 ml-auto">em curso</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
