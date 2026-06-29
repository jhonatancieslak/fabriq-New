// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function ReqLoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api.auth.login(email, password)

      if (data.user.role !== 'requester') {
        setError('Este portal é exclusivo para solicitadores. Use o painel de gestão.')
        return
      }

      localStorage.setItem('fabriq_token', data.tokens.accessToken)
      localStorage.setItem('fabriq_tenant', data.tenant.slug)
      localStorage.setItem('fabriq_role', data.user.role)
      router.replace('/req/ordens')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: '#07080A' }}>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="font-black text-3xl uppercase tracking-tight text-white mb-1">
          FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
        </div>
        <p className="text-sm" style={{ color: '#4B5563' }}>Portal do Solicitador</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-7" style={{ background: '#111318', border: '1px solid #1a1f2e' }}>

          <h1 className="text-lg font-bold text-white mb-1">Entrar</h1>
          <p className="text-xs mb-6" style={{ color: '#4B5563' }}>Acompanhe as suas ordens de serviço</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="nome@empresa.pt" autoComplete="email"
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
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: '#0D1117', border: '1px solid #1E2A3A' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#EAB308' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = '#1E2A3A' }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#4B5563' }}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
          <a href="/login" className="transition-colors" style={{ color: '#4B5563' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}>
            Acesso admin →
          </a>
        </p>
      </div>
    </div>
  )
}
