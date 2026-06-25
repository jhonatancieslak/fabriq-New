// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/layout/logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

export default function OperadorLoginPage() {
  const router = useRouter()
  const [tenantSlug, setTenantSlug] = useState('demo')
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

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
    } catch {
      setError('Sem ligação ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" variant="light" />
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h1 className="text-lg font-semibold text-white mb-1">Acesso Operador</h1>
          <p className="text-sm text-slate-400 mb-6">Introduza as suas credenciais de operador</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Empresa (slug)</label>
              <input
                type="text" value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} required
                placeholder="demo"
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Utilizador</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)} required
                placeholder="joao.silva"
                autoComplete="username"
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Palavra-passe</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete="current-password"
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-yellow-400 py-2.5 text-sm font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-60 transition-colors mt-2">
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Para acesso ao painel administrativo, aceda ao <a href="/login" className="text-slate-400 underline">portal admin</a>
        </p>
      </div>
    </div>
  )
}
