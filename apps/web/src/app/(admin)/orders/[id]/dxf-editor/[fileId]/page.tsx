// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Trash2, RotateCcw, Save, ZoomIn, ZoomOut, Move, MousePointer } from 'lucide-react'
import { T, Btn } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

function authHeaders(): Record<string, string> {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') ?? '' : ''
  return {
    'Content-Type': 'application/json',
    ...(token  ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenant ? { 'X-Tenant-Slug': tenant } : {}),
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

interface BBox { minX: number; minY: number; maxX: number; maxY: number }

interface Entity {
  handle:   string
  type:     string
  layer:    string
  color:    number
  geometry: Record<string, unknown>
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  LINE: 'Linha', CIRCLE: 'Círculo', ARC: 'Arco',
  LWPOLYLINE: 'Polilinha', POLYLINE: 'Polilinha',
  SPLINE: 'Spline', ELLIPSE: 'Elipse',
  TEXT: 'Texto', MTEXT: 'Texto (M)', DIMENSION: 'Cota',
  INSERT: 'Bloco', HATCH: 'Hachura', SOLID: 'Sólido',
}

const ENTITY_TYPE_COLOR: Record<string, string> = {
  LINE: '#60A5FA', CIRCLE: '#34D399', ARC: '#34D399',
  LWPOLYLINE: '#A78BFA', POLYLINE: '#A78BFA',
  SPLINE: '#F472B6', ELLIPSE: '#FBBF24',
  TEXT: '#FB923C', MTEXT: '#FB923C', DIMENSION: '#F87171',
  INSERT: '#94A3B8', HATCH: '#64748B', SOLID: '#64748B',
}

// ── SVG renderer ─────────────────────────────────────────────────────────────

function entityToPath(ent: Entity, bbox: BBox, scale: number, ox: number, oy: number): string | null {
  const tx = (x: number) => (x - bbox.minX) * scale + ox
  const ty = (y: number) => (bbox.maxY - y) * scale + oy  // flip Y
  const g = ent.geometry

  try {
    if (ent.type === 'LINE') {
      const { x1, y1, x2, y2 } = g as any
      return `M ${tx(x1)} ${ty(y1)} L ${tx(x2)} ${ty(y2)}`
    }
    if (ent.type === 'CIRCLE') {
      const { cx, cy, r } = g as any
      const rx = r * scale, rcx = tx(cx), rcy = ty(cy)
      return `M ${rcx - rx} ${rcy} a ${rx} ${rx} 0 1 0 ${rx * 2} 0 a ${rx} ${rx} 0 1 0 ${-rx * 2} 0`
    }
    if (ent.type === 'ARC') {
      const { cx, cy, r, startAngle, endAngle } = g as any
      const toRad = (d: number) => (d * Math.PI) / 180
      let sa = startAngle, ea = endAngle
      if (ea < sa) ea += 360
      const x1 = tx(cx + r * Math.cos(toRad(sa)))
      const y1 = ty(cy + r * Math.sin(toRad(sa)))
      const x2 = tx(cx + r * Math.cos(toRad(ea)))
      const y2 = ty(cy + r * Math.sin(toRad(ea)))
      const large = (ea - sa) > 180 ? 1 : 0
      const rx = r * scale
      return `M ${x1} ${y1} A ${rx} ${rx} 0 ${large} 1 ${x2} ${y2}`
    }
    if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE' || ent.type === 'SPLINE') {
      const { points, closed } = g as any
      if (!points?.length) return null
      const pts = points.map((p: any) => `${tx(p.x)} ${ty(p.y)}`)
      return `M ${pts[0]} L ${pts.slice(1).join(' L ')}` + (closed ? ' Z' : '')
    }
    if (ent.type === 'ELLIPSE') {
      const { cx, cy, rMaj, ratio } = g as any
      const rx = rMaj * scale, ry = rMaj * ratio * scale
      return `M ${tx(cx) - rx} ${ty(cy)} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`
    }
    if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
      // render as small cross marker
      const { x, y } = g as any
      const px = tx(x), py = ty(y)
      return `M ${px - 5} ${py} L ${px + 5} ${py} M ${px} ${py - 5} L ${px} ${py + 5}`
    }
    if (ent.type === 'DIMENSION') {
      const { x, y } = g as any
      if (x == null) return null
      const px = tx(x), py = ty(y)
      return `M ${px - 6} ${py} L ${px + 6} ${py} M ${px} ${py - 6} L ${px} ${py + 6}`
    }
    if (ent.type === 'SOLID') {
      const { points } = g as any
      if (!points?.length) return null
      const pts = points.map((p: any) => `${tx(p.x)} ${ty(p.y)}`)
      return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`
    }
  } catch {}
  return null
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DxfEditorPage() {
  const { id: orderId, fileId } = useParams<{ id: string; fileId: string }>()
  const router = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  const [entities,  setEntities]  = useState<Entity[]>([])
  const [bbox,      setBbox]      = useState<BBox>({ minX: 0, minY: 0, maxX: 200, maxY: 200 })
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [deleted,   setDeleted]   = useState<Set<string>>(new Set())  // handles removidos da vista

  // pan + zoom
  const [zoom,    setZoom]    = useState(1)
  const [pan,     setPan]     = useState({ x: 0, y: 0 })
  const [tool,    setTool]    = useState<'select' | 'pan'>('select')
  const [panning, setPanning] = useState(false)
  const panStart     = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const svgRef       = useRef<SVGSVGElement>(null)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 })

  // layer visibility
  const [layers, setLayers] = useState<Record<string, boolean>>({})

  // cleanup redirect timer on unmount
  useEffect(() => () => { if (redirectTimer.current) clearTimeout(redirectTimer.current) }, [])

  useEffect(() => {
    fetch(`${API_URL}/api/v1/files/${fileId}/entities`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) { setError(d.error); return }
        setEntities(d.entities)
        setBbox(d.bbox)
        // init layers all visible
        const ls: Record<string, boolean> = {}
        d.entities.forEach((e: Entity) => { ls[e.layer] = true })
        setLayers(ls)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [fileId])

  // fit to viewport on load
  useEffect(() => {
    if (!entities.length) return
    const pad  = 40
    const w    = svgSize.w - pad * 2
    const h    = svgSize.h - pad * 2
    const bw   = bbox.maxX - bbox.minX || 1
    const bh   = bbox.maxY - bbox.minY || 1
    const sc   = Math.min(w / bw, h / bh) * 0.9
    setZoom(sc)
    setPan({ x: pad, y: pad })
  }, [entities, bbox, svgSize])

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect
      if (r) setSvgSize({ w: r.width, h: r.height })
    })
    if (svgRef.current?.parentElement) obs.observe(svgRef.current.parentElement)
    return () => obs.disconnect()
  }, [])

  // Delete key listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        setDeleted(prev => new Set([...prev, ...selected]))
        setSelected(new Set())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  function toggleSelect(handle: string) {
    if (tool !== 'select') return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(handle) ? next.delete(handle) : next.add(handle)
      return next
    })
  }

  function removeSelected() {
    setDeleted(prev => new Set([...prev, ...selected]))
    setSelected(new Set())
  }

  function undo() {
    // restore last deleted batch — simple: clear deleted
    setDeleted(new Set())
  }

  async function saveClean() {
    const handlesToRemove = [...deleted]
    if (!handlesToRemove.length) { setSuccess('Nenhuma entidade removida.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/v1/files/${fileId}/clean`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ handles: handlesToRemove }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Erro ao guardar')
      setSuccess(`DXF limpo guardado — ${data.removed} entidade(s) removida(s), ${data.remaining} restantes.`)
      redirectTimer.current = setTimeout(() => router.push(`/orders/${orderId}`), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const visibleEntities = entities.filter(e => !deleted.has(e.handle) && (layers[e.layer] !== false))
  const uniqueLayers    = [...new Set(entities.map(e => e.layer))]
  const typeGroups      = visibleEntities.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1; return acc
  }, {} as Record<string, number>)

  function onMouseDown(ev: React.MouseEvent<SVGSVGElement>) {
    if (tool === 'pan') {
      setPanning(true)
      panStart.current = { x: ev.clientX, y: ev.clientY, px: pan.x, py: pan.y }
    }
  }
  function onMouseMove(ev: React.MouseEvent<SVGSVGElement>) {
    if (panning) {
      setPan({
        x: panStart.current.px + (ev.clientX - panStart.current.x),
        y: panStart.current.py + (ev.clientY - panStart.current.y),
      })
    }
  }
  function onMouseUp() { setPanning(false) }
  function onWheel(ev: React.WheelEvent<SVGSVGElement>) {
    ev.preventDefault()
    setZoom(z => Math.max(0.05, Math.min(50, z * (ev.deltaY > 0 ? 0.9 : 1.1))))
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: T.bg }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0 border-b"
        style={{ background: T.surface, borderColor: T.border }}>
        <button onClick={() => router.push(`/orders/${orderId}`)}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: T.subtle }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
          <ChevronLeft className="h-4 w-4" /> Voltar à Ordem
        </button>

        <div className="w-px h-5" style={{ background: T.border }} />
        <span className="text-sm font-semibold" style={{ color: T.text }}>Editor DXF</span>

        <div className="flex-1" />

        {/* Ferramentas */}
        {[
          { id: 'select', Icon: MousePointer, label: 'Seleccionar' },
          { id: 'pan',    Icon: Move,         label: 'Mover' },
        ].map(({ id, Icon, label }) => (
          <button key={id} title={label}
            onClick={() => setTool(id as 'select' | 'pan')}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: tool === id ? T.yellowBg : 'transparent',
              color:      tool === id ? T.yellow   : T.subtle,
              border: tool === id ? `1px solid ${T.yellow}` : `1px solid transparent`,
            }}>
            <Icon className="h-4 w-4" />
          </button>
        ))}

        <div className="w-px h-5" style={{ background: T.border }} />

        <button onClick={() => setZoom(z => Math.min(50, z * 1.25))} title="Zoom +"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: T.subtle, border: `1px solid ${T.border}` }}>
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.05, z * 0.8))} title="Zoom -"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: T.subtle, border: `1px solid ${T.border}` }}>
          <ZoomOut className="h-4 w-4" />
        </button>

        <div className="w-px h-5" style={{ background: T.border }} />

        {selected.size > 0 && (
          <button onClick={removeSelected}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Trash2 className="h-3.5 w-3.5" /> Remover {selected.size}
          </button>
        )}
        {deleted.size > 0 && (
          <button onClick={undo}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
            style={{ color: T.subtle, border: `1px solid ${T.border}` }}>
            <RotateCcw className="h-3.5 w-3.5" /> Desfazer ({deleted.size})
          </button>
        )}

        <Btn onClick={saveClean} disabled={saving || !deleted.size}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />A guardar…</> : <><Save className="h-4 w-4" />Guardar DXF limpo</>}
        </Btn>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="px-4 py-2 text-sm font-medium"
          style={{ background: error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                   color: error ? '#EF4444' : '#22C55E' }}>
          {error ?? success}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 overflow-y-auto border-r flex flex-col"
          style={{ background: T.surface, borderColor: T.border }}>

          {/* Stats */}
          <div className="p-3 border-b space-y-1" style={{ borderColor: T.border }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.subtle }}>Entidades</p>
            {Object.entries(typeGroups).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ENTITY_TYPE_COLOR[type] ?? '#94A3B8' }} />
                  <span style={{ color: T.muted }}>{ENTITY_TYPE_LABELS[type] ?? type}</span>
                </div>
                <span className="font-mono font-semibold" style={{ color: T.text }}>{count}</span>
              </div>
            ))}
            {deleted.size > 0 && (
              <p className="text-xs mt-2 pt-2 border-t" style={{ color: '#F87171', borderColor: T.border }}>
                {deleted.size} removida(s) (não guardado)
              </p>
            )}
          </div>

          {/* Layers */}
          {uniqueLayers.length > 1 && (
            <div className="p-3 border-b" style={{ borderColor: T.border }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.subtle }}>Camadas</p>
              {uniqueLayers.map(layer => (
                <label key={layer} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                  <input type="checkbox" checked={layers[layer] !== false}
                    onChange={e => setLayers(l => ({ ...l, [layer]: e.target.checked }))} />
                  <span style={{ color: T.muted }}>{layer || '(padrão)'}</span>
                </label>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="p-3 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.subtle }}>Como usar</p>
            <div className="space-y-1.5 text-xs" style={{ color: T.faint }}>
              <p>Clique para seleccionar entidades</p>
              <p>Shift+clique para múltiplas</p>
              <p>Remover → Guardar DXF limpo</p>
              <p>"Desfazer" restaura tudo antes de guardar</p>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden relative" style={{ background: '#07080A' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center gap-3"
              style={{ color: T.subtle }}>
              <Loader2 className="h-5 w-5 animate-spin" /> A carregar entidades…
            </div>
          )}

          <svg ref={svgRef} className="w-full h-full"
            style={{ cursor: tool === 'pan' ? (panning ? 'grabbing' : 'grab') : 'default' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {visibleEntities.map(ent => {
                const d = entityToPath(ent, bbox, 1, 0, 0)
                if (!d) return null
                const isSel   = selected.has(ent.handle)
                const isText  = ent.type === 'TEXT' || ent.type === 'MTEXT'
                const isDim   = ent.type === 'DIMENSION'
                const baseCol = isDim ? '#F87171' : isText ? '#FB923C' : '#EAB308'
                const selCol  = '#22C55E'
                const strokeW = (isSel ? 2 : 1) / zoom

                return (
                  <path key={ent.handle} d={d}
                    fill="none"
                    stroke={isSel ? selCol : baseCol}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isSel ? 1 : 0.85}
                    style={{ cursor: tool === 'select' ? 'pointer' : 'default' }}
                    onClick={e => {
                      if (tool !== 'select') return
                      if (e.shiftKey) {
                        toggleSelect(ent.handle)
                      } else {
                        setSelected(prev => {
                          const next = new Set<string>()
                          if (!prev.has(ent.handle)) next.add(ent.handle)
                          return next
                        })
                      }
                    }}>
                    <title>{ENTITY_TYPE_LABELS[ent.type] ?? ent.type} — Layer: {ent.layer} — Handle: {ent.handle}</title>
                  </path>
                )
              })}
            </g>
          </svg>

          {/* Zoom indicator */}
          <div className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded"
            style={{ background: 'rgba(0,0,0,0.6)', color: T.subtle }}>
            {(zoom * 100).toFixed(0)}%
          </div>

          {/* Selection info */}
          {selected.size > 0 && (
            <div className="absolute bottom-3 left-3 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.7)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
              {selected.size} seleccionada(s) — pressione "Remover" ou Delete
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
