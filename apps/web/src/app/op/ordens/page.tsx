// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Search } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeader() {
  const token = localStorage.getItem('fabriq_op_token')
  const slug  = localStorage.getItem('fabriq_tenant') ?? 'demo'
  return { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug }
}

export default function OperadorOrdensPage() {
  const router = useRouter()
  const [token, setToken]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      // Tentar pelo auth code (FBRQ-...) ou pelo access token QR
      const endpoint = token.startsWith('FBRQ-')
        ? `/api/v1/orders/auth/${token.trim()}`
        : `/api/v1/orders/verify/${token.trim()}`

      const r = await fetch(`${API_URL}${endpoint}`, { headers: authHeader() })
      if (!r.ok) { setError('Ordem não encontrada. Verifique o código.'); return }
      const order = await r.json()
      router.push(`/op/ordem/${order.id}`)
    } catch {
      setError('Erro de ligação ao servidor')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Pesquisar Ordem</h1>
        <p className="text-sm text-slate-400 mt-0.5">Introduza o código da ordem ou digitalize o QR</p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="OS-202506-XXXX ou FBRQ-..."
            autoFocus
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none transition-colors"
          />
        </div>

        {error && <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</div>}

        <button type="submit" disabled={loading || !token.trim()}
          className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors">
          {loading ? 'A pesquisar...' : 'Abrir Ordem'}
        </button>
      </form>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
        <QrCode className="h-10 w-10 text-slate-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-300">Digitalizar QR da folha de corte</p>
        <p className="text-xs text-slate-500 mt-1">
          Na versão PWA instalada, use a câmara para ler o QR automaticamente
        </p>
      </div>
    </div>
  )
}
