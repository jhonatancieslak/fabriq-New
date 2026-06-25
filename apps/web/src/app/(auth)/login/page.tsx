// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router  = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await api.auth.login(email, password)
      localStorage.setItem('fabriq_token', data.accessToken)
      localStorage.setItem('fabriq_tenant', 'demo')
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen gradient-hero flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white">
        <div className="font-display text-4xl font-black uppercase tracking-tight">
          FABRIQ<span className="text-brand-yellow">.IA</span>
        </div>
        <div className="space-y-8">
          <h1 className="text-5xl font-bold leading-tight">
            Chão de fábrica<br /><span className="text-brand-yellow">sob controlo.</span>
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed max-w-md">
            Do corte laser à fatura, tudo num só lugar. Ordens digitais, rastreabilidade total, notificações em tempo real.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm max-w-xs">
            {['Ordens digitais','PWA operador','Folha de corte PDF','WhatsApp automático'].map(f => (
              <div key={f} className="flex items-center gap-2 text-blue-200">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-yellow flex-shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300/50 text-xs">© 2026 FABRIQ.IA</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10 text-center">
            <div className="font-display text-3xl font-black uppercase tracking-tight text-slate-900">
              FABRIQ<span className="text-brand-yellow">.IA</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-card-lg p-8 border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Bem-vindo</h2>
            <p className="text-slate-500 text-sm mb-8">Inicie sessão para aceder ao painel</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="admin@empresa.pt" className="input" />
              </div>
              <div>
                <label className="label">Palavra-passe</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••" className="input pr-11" />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'A entrar...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 mb-1">É operador de máquina?</p>
              <a href="/op/login" className="text-sm font-semibold text-brand-blue hover:underline">
                Acesso à PWA do operador →
              </a>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            <strong>Demo:</strong> admin@demo.fabriq.pt / admin123
          </div>
        </div>
      </div>
    </div>
  )
}
