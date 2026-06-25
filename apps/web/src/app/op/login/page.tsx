// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

export default function OperadorLoginPage() {
  const router = useRouter()
  const [tenantSlug, setTenantSlug] = useState('demo')
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/operator/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenantSlug },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? 'Credenciais inválidas')
        return
      }
      const data = await res.json()
      localStorage.setItem('fabriq_op_token', data.accessToken)
      localStorage.setItem('fabriq_tenant', tenantSlug)
      router.replace('/op/dashboard')
    } catch { setError('Sem ligação ao servidor') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-5">
      {/* Logo */}
      <div className="font-display text-3xl font-black uppercase tracking-tight text-white mb-2">
        FABRIQ<span className="text-brand-yellow">.IA</span>
      </div>
      <p className="text-slate-400 text-sm mb-10">Acesso do Operador</p>

      <div className="w-full max-w-sm">
        <div className="bg-slate-800 rounded-3xl p-7 border border-slate-700">
          <h1 className="text-lg font-bold text-white mb-1">Bem-vindo</h1>
          <p className="text-slate-400 text-sm mb-6">Introduza as suas credenciais</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Empresa (slug)
              </label>
              <input type="text" value={tenantSlug} onChange={e => setTenantSlug(e.target.value)}
                required placeholder="demo" className="dark-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Utilizador
              </label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                required placeholder="joao.silva" autoComplete="username" className="dark-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Palavra-passe
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" className="dark-input" />
            </div>

            {error && (
              <div className="rounded-xl bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-yellow w-full py-3 mt-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          Painel de gestão?{' '}
          <a href="/login" className="text-slate-400 hover:text-white transition-colors">Acesso admin</a>
        </p>
      </div>
    </div>
  )
}
