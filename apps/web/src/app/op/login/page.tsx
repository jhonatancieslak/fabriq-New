// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Building2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function OperadorLoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [tenantSlug, setTenantSlug] = useState('')
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // Preenche o slug a partir do URL (?empresa=pipesolutions) ou do localStorage
  useEffect(() => {
    const fromUrl   = searchParams.get('empresa')
    const fromStore = localStorage.getItem('fabriq_tenant')
    setTenantSlug(fromUrl ?? fromStore ?? '')
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantSlug.trim()) { setError('Empresa não identificada. Use o link gerado pelo admin.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/operator/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenantSlug },
        body: JSON.stringify({ username, password, tenantSlug }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? 'Credenciais inválidas')
        return
      }
      const data = await res.json()
      localStorage.setItem('fabriq_op_token', data.tokens?.accessToken ?? data.accessToken)
      localStorage.setItem('fabriq_tenant', tenantSlug)
      router.replace('/op/dashboard')
    } catch { setError('Sem ligação ao servidor') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: '#07080A' }}>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="font-black text-3xl uppercase tracking-tight text-white mb-1">
          FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
        </div>
        <p className="text-slate-500 text-sm">Portal do Operador</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-7" style={{ background: '#111318', border: '1px solid #1a1f2e' }}>

          {/* Empresa identificada */}
          {tenantSlug ? (
            <div className="flex items-center gap-2.5 mb-6 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.15)' }}>
              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: '#EAB308' }} />
              <div>
                <div className="text-xs text-slate-500">Empresa</div>
                <div className="text-sm font-semibold text-white">{tenantSlug}</div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                Empresa
              </label>
              <input
                type="text" value={tenantSlug}
                onChange={e => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="pipesolutions"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none"
                style={{ background: '#0D1117', border: '1px solid #1E2A3A' }}
              />
              <p className="text-xs text-slate-600 mt-1.5">Use o link enviado pelo seu gestor</p>
            </div>
          )}

          <h1 className="text-lg font-bold text-white mb-5">Entrar como operador</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                Utilizador
              </label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                required placeholder="joao.silva" autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all"
                style={{ background: '#0D1117', border: '1px solid #1E2A3A' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#EAB308' }}
                onBlur={e  => { e.currentTarget.style.borderColor = '#1E2A3A' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                Palavra-passe
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all"
                style={{ background: '#0D1117', border: '1px solid #1E2A3A' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#EAB308' }}
                onBlur={e  => { e.currentTarget.style.borderColor = '#1E2A3A' }}
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-2"
              style={{ background: '#EAB308', color: '#07080A' }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#374151' }}>
          Painel de gestão?{' '}
          <a href="/login" className="text-slate-500 hover:text-white transition-colors">Acesso admin</a>
        </p>
      </div>
    </div>
  )
}

export default function OperadorLoginPage() {
  return (
    <Suspense>
      <OperadorLoginForm />
    </Suspense>
  )
}
