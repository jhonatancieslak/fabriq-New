// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

// ── Toast simples ─────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error'
interface Toast { id: number; type: ToastType; message: string }

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-medium animate-fade-in"
          style={t.type === 'success'
            ? { background: '#07080A', color: '#fff', border: '1px solid #1f2937', minWidth: 280 }
            : { background: '#fff', color: '#dc2626', border: '1px solid #fecaca', minWidth: 280 }
          }
        >
          {t.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#EAB308' }} />
            : <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          }
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-40 hover:opacity-100 transition-opacity text-lg leading-none">×</button>
        </div>
      ))}
    </div>
  )
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

// ── Formulário (usa useSearchParams — precisa de Suspense) ────────────────────
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') // para redirect pós-registo

  const [companyName, setCompanyName]     = useState('')
  const [slug, setSlug]                   = useState('')
  const [slugManual, setSlugManual]       = useState(false)
  const [adminName, setAdminName]         = useState('')
  const [adminEmail, setAdminEmail]       = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [phone, setPhone]                 = useState('')
  const [showPw, setShowPw]               = useState(false)
  const [loading, setLoading]             = useState(false)
  const [toasts, setToasts]               = useState<Toast[]>([])

  // Auto-gerar slug do nome da empresa
  useEffect(() => {
    if (!slugManual && companyName) {
      setSlug(generateSlug(companyName))
    }
  }, [companyName, slugManual])

  function addToast(type: ToastType, message: string) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  function removeToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, slug, adminName, adminEmail, adminPassword, phone: phone || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.error?.message ?? data.error ?? 'Erro no registo.'
        addToast('error', typeof msg === 'string' ? msg : JSON.stringify(msg))
        return
      }

      // Guardar sessão (igual ao login)
      localStorage.setItem('fabriq_token', data.tokens.accessToken)
      localStorage.setItem('fabriq_tenant', data.tenant.slug)
      localStorage.setItem('fabriq_role', data.user.role)
      localStorage.setItem('fabriq_super_admin', 'false')
      localStorage.setItem('fabriq_user_name', data.user.name)
      localStorage.setItem('fabriq_user_id', data.user.id)
      localStorage.setItem('fabriq_tenant_name', data.tenant.name)

      addToast('success', `Conta criada! Bem-vindo, ${data.user.name.split(' ')[0]}!`)

      // Se veio de ?plan=X na landing → redirecionar para checkout
      if (planParam && ['starter', 'pro', 'factory'].includes(planParam)) {
        setTimeout(async () => {
          try {
            const checkoutRes = await fetch(`${API_URL}/api/v1/billing/checkout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.tokens.accessToken}`,
              },
              body: JSON.stringify({ plan: planParam }),
            })
            const checkoutData = await checkoutRes.json()
            if (checkoutData.url) {
              window.location.href = checkoutData.url
            } else {
              router.replace('/dashboard')
            }
          } catch {
            router.replace('/dashboard')
          }
        }, 800)
      } else {
        setTimeout(() => router.replace('/dashboard'), 900)
      }
    } catch {
      addToast('error', 'Erro de ligação. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="min-h-screen flex">

        {/* ── LADO ESQUERDO ── */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden" style={{ background: '#07080A' }}>
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, #07080A 100%)' }} />

          <div className="relative z-10 p-10">
            <div className="font-black text-3xl uppercase tracking-tight text-white" style={{ fontFamily: 'system-ui' }}>
              FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
            </div>
          </div>

          <div className="relative z-10 px-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8" style={{ background: '#EAB308' }}>
              <span className="text-4xl">⚡</span>
            </div>
            <p className="text-2xl font-black leading-tight uppercase tracking-tight text-white mb-3">
              14 dias grátis.<br />Sem cartão.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Começa agora e digitaliza a tua<br />produção industrial hoje.
            </p>
          </div>

          <div className="relative z-10 p-10">
            <div style={{ borderTop: '1px solid #111318' }} className="pt-4">
              <p className="text-xs" style={{ color: '#374151' }}>
                © 2026 FABRIQ.IA · Desenvolvido por{' '}
                <span style={{ color: '#4B5563' }}>Jhonatan Cieslak</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── LADO DIREITO — formulário ── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 lg:p-12 overflow-y-auto">
          <div className="w-full max-w-sm">

            <div className="lg:hidden mb-8 text-center text-3xl font-black uppercase tracking-tight text-slate-900">
              FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-1">Criar conta</h1>
            <p className="text-slate-400 text-sm mb-8">14 dias grátis · Sem cartão de crédito</p>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nome da empresa */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome da empresa</label>
                <input
                  type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  required maxLength={100} placeholder="MetalPro Lda"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Identificador único (slug)
                </label>
                <input
                  type="text" value={slug}
                  onChange={e => { setSlugManual(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)) }}
                  required maxLength={30} placeholder="metalpro"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5 font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Apenas letras, números e hífens. Não pode ser alterado.</p>
              </div>

              {/* Nome do admin */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">O teu nome</label>
                <input
                  type="text" value={adminName} onChange={e => setAdminName(e.target.value)}
                  required maxLength={80} placeholder="João Silva"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                  required placeholder="joao@empresa.pt"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Palavra-passe</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    required minLength={8} placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Telefone (opcional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Telefone <span className="normal-case font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+351 910 000 000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: '#EAB308', color: '#07080A' }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'A criar conta...' : 'Criar conta grátis →'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Já tens conta?{' '}
              <a href="/login" className="font-semibold text-slate-900 hover:underline">Entrar</a>
            </p>

            <p className="text-xs text-slate-300 text-center mt-6">
              Desenvolvido por Jhonatan Cieslak
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Export default com Suspense boundary ──────────────────────────────────────
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-yellow-400 animate-spin" />
          <span className="text-sm">A carregar...</span>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
