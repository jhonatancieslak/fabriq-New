// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { RefreshCw, FileText, Download, Search } from 'lucide-react'
import { T, Toast, Badge, Pagination } from '@/components/ui/admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

interface MediaFile {
  id: string
  originalName: string
  fileType: string | null
  sizeBytes: number
  previewUrl: string | null
  areaM2: number | null
  bboxWidthMm: number | null
  bboxHeightMm: number | null
  perimeterMm: number | null
  createdAt: string
  item: {
    description: string
    quantityPlanned: number
    thicknessMm: number
    material?: { name: string }
    project?: { id: string; code: string; name: string; client?: { name: string } }
  }
}

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('fabriq_token')
    const tenant = localStorage.getItem('fabriq_tenant') || 'demo'
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    if (search) params.set('search', search)
    try {
      const r = await fetch(`${API_URL}/api/v1/media?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant },
      })
      const data = await r.json()
      setFiles(data.files ?? [])
      setTotal(data.total ?? 0)
    } catch {
      showToast('Erro ao carregar biblioteca', 'err')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: toast.type === 'ok' ? '#22C55E' : '#EF4444', color: 'white' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: T.text }}>Biblioteca de Ficheiros</h1>
          <p className="text-sm mt-0.5" style={{ color: T.subtle }}>
            {total} ficheiros DXF/DWG processados
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: T.faint }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Pesquisar por nome..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
          />
        </div>
        <button type="submit"
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: T.yellow, color: T.bg }}>
          Pesquisar
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.subtle }}>
            Limpar
          </button>
        )}
      </form>

      {/* Grid de ficheiros */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.yellow }} />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16" style={{ color: T.faint }}>
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum ficheiro DXF/DWG processado encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {files.map(f => (
            <div key={f.id} className="rounded-xl overflow-hidden group cursor-pointer"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>

              {/* Preview */}
              <div className="aspect-square relative overflow-hidden"
                style={{ background: '#07080A', borderBottom: `1px solid ${T.divider}` }}>
                {f.previewUrl ? (
                  <img src={`${API_URL}${f.previewUrl}`} alt={f.originalName}
                    className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-8 w-8" style={{ color: T.faint }} />
                  </div>
                )}
                {/* Overlay com ações */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <a href={`${API_URL}/uploads/${f.id}`} download={f.originalName} title="Download">
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: T.yellow, color: T.bg }}>
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </a>
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <p className="text-xs font-semibold truncate" style={{ color: T.text }} title={f.originalName}>
                  {f.originalName}
                </p>
                <div className="flex items-center justify-between">
                  <Badge label={f.fileType?.toUpperCase() ?? 'FILE'} color="#64748B" />
                  <span className="text-xs" style={{ color: T.faint }}>{(f.sizeBytes / 1024).toFixed(0)} KB</span>
                </div>
                {f.item?.description && (
                  <p className="text-xs truncate" style={{ color: T.subtle }} title={f.item.description}>
                    {f.item.description}
                  </p>
                )}
                {f.item?.project && (
                  <Link href={`/projects/${f.item.project.id}`}
                    className="text-xs truncate block hover:underline"
                    style={{ color: T.yellow }}
                    title={`${f.item.project.code} — ${f.item.project.name}`}>
                    {f.item.project.code} — {f.item.project.name}
                  </Link>
                )}
                {f.item?.project?.client && (
                  <p className="text-xs truncate" style={{ color: T.faint }}>
                    {f.item.project.client.name}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {f.areaM2 && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `#60A5FA18`, color: '#60A5FA' }}>
                      {Number(f.areaM2).toFixed(4)} m²
                    </span>
                  )}
                  {f.bboxWidthMm && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: T.bg, color: T.subtle }}>
                      {Number(f.bboxWidthMm).toFixed(0)}×{Number(f.bboxHeightMm ?? 0).toFixed(0)}
                    </span>
                  )}
                  {f.item?.thicknessMm && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: T.bg, color: T.subtle }}>
                      {f.item.thicknessMm}mm
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: T.faint }}>{fmtDate(f.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > 30 && (
        <Pagination
          page={page}
          pages={Math.ceil(total / 30)}
          total={total}
          onPage={setPage}
        />
      )}
    </div>
  )
}
