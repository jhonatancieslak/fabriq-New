// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Loader2, Ruler, AlertCircle } from 'lucide-react'
import { T } from './admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

function authHeaders(): Record<string, string> {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') ?? '' : ''
  return {
    ...(token  ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenant ? { 'X-Tenant-Slug': tenant } : {}),
  }
}

export interface DxfFile {
  id:           string
  originalName: string
  storagePath:  string
  previewPath:  string | null
  previewUrl:   string | null
  fileType:     string | null
  sizeBytes:    number
  processed:    boolean
  areaM2:       number | null
  bboxWidthMm:  number | null
  bboxHeightMm: number | null
  perimeterMm:  number | null
}

interface Props {
  orderId:  string
  itemId:   string
  files:    DxfFile[]
  onChange: (files: DxfFile[]) => void
  disabled?: boolean
}

const ACCEPTED = '.dxf,.dwg,.pdf,.png,.jpg,.jpeg'

export function DxfUpload({ orderId, itemId, files, onChange, disabled }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [dragging, setDragging]   = useState(false)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch(
        `${API_URL}/api/v1/orders/${orderId}/items/${itemId}/files`,
        { method: 'POST', headers: authHeaders(), body: fd }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro no upload')
      }
      const uploaded: DxfFile = await res.json()
      onChange([...files, uploaded])

      // poll para o preview (processamento em background)
      if (uploaded.fileType === 'dxf' || uploaded.fileType === 'dwg') {
        pollPreview(uploaded.id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  function pollPreview(fileId: string, attempts = 0) {
    if (attempts > 20) return
    setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/v1/orders/${orderId}/items/${itemId}/files`,
          { headers: authHeaders() }
        )
        if (!res.ok) return
        const updated: DxfFile[] = await res.json()
        const f = updated.find(x => x.id === fileId)
        if (f?.processed) {
          onChange(updated)
        } else {
          pollPreview(fileId, attempts + 1)
        }
      } catch { }
    }, 2000)
  }

  async function remove(fileId: string) {
    try {
      await fetch(
        `${API_URL}/api/v1/orders/${orderId}/items/${itemId}/files/${fileId}`,
        { method: 'DELETE', headers: authHeaders() }
      )
      onChange(files.filter(f => f.id !== fileId))
    } catch {
      setError('Erro ao remover ficheiro')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) upload(dropped)
  }, [files, orderId, itemId])

  function fmtSize(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-2">
      {/* Ficheiros existentes */}
      {files.map(f => (
        <div key={f.id}
          className="rounded-xl overflow-hidden"
          style={{ background: T.border, border: `1px solid ${T.divider}` }}>
          <div className="flex items-start gap-3 p-3">
            {/* Preview */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: '#07080A' }}>
              {f.previewUrl ? (
                <img src={`${API_URL}/uploads/${f.previewPath}`}
                  alt={f.originalName}
                  className="w-full h-full object-contain" />
              ) : f.processed ? (
                <FileText className="h-6 w-6" style={{ color: T.subtle }} />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.subtle }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
                {f.originalName}
              </p>
              <p className="text-xs" style={{ color: T.subtle }}>
                {fmtSize(f.sizeBytes)}
                {f.fileType && ` · ${f.fileType.toUpperCase()}`}
              </p>
              {/* Dimensões */}
              {f.bboxWidthMm && f.bboxHeightMm && (
                <div className="flex items-center gap-1 mt-1">
                  <Ruler className="h-3 w-3 flex-shrink-0" style={{ color: '#EAB308' }} />
                  <p className="text-xs font-mono" style={{ color: T.muted }}>
                    {f.bboxWidthMm.toFixed(1)} × {f.bboxHeightMm.toFixed(1)} mm
                    {f.areaM2 && ` · ${f.areaM2.toFixed(4)} m²`}
                    {f.perimeterMm && ` · ⌀ ${(f.perimeterMm / 1000).toFixed(2)} m`}
                  </p>
                </div>
              )}
              {!f.processed && (
                <p className="text-xs mt-1" style={{ color: T.subtle }}>
                  A processar…
                </p>
              )}
            </div>

            {/* Remover */}
            {!disabled && (
              <button onClick={() => remove(f.id)}
                className="flex-shrink-0 rounded-lg p-1.5 transition-colors"
                style={{ color: T.subtle }}
                onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Drop zone */}
      {!disabled && (
        <div
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-5 px-4 cursor-pointer transition-all"
          style={{
            borderColor: dragging ? '#EAB308' : T.border,
            background:  dragging ? 'rgba(234,179,8,0.04)' : 'transparent',
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}>
          {uploading ? (
            <><Loader2 className="h-5 w-5 animate-spin" style={{ color: '#EAB308' }} />
              <p className="text-xs" style={{ color: T.subtle }}>A carregar…</p></>
          ) : (
            <><Upload className="h-5 w-5" style={{ color: T.faint }} />
              <p className="text-xs text-center" style={{ color: T.subtle }}>
                Arraste DXF, DWG, PDF ou imagem
                <span className="block" style={{ color: T.faint }}>ou clique para seleccionar</span>
              </p></>
          )}
          <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
