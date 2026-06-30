// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Mail, CheckCircle2, XCircle, Send, Loader2,
  ExternalLink, AlertTriangle,
} from 'lucide-react'
import { T, Toast, Btn, PageHeader } from '@/components/ui/admin-ui'

interface NotifStatus {
  email: { configured: boolean; from: string | null; provider: string }
  whatsapp: { configured: boolean; apiUrl: string | null; provider: string }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  const token  = localStorage.getItem('fabriq_token')
  const tenant = localStorage.getItem('fabriq_tenant') ?? 'demo'
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': tenant,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function SmtpSettingsPage() {
  const router = useRouter()
  const [status, setStatus]     = useState<NotifStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending]   = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    fetch(`${API_URL}/api/v1/notifications/status`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => showToast('Erro ao carregar estado', 'err'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault()
    if (!testEmail) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/test-email`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ to: testEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar')
      showToast(data.message)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao enviar email', 'err')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div>
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: T.subtle }}
          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
          onMouseLeave={e => (e.currentTarget.style.color = T.subtle)}
        >
          <ChevronLeft className="h-4 w-4" /> Configurações
        </button>
        <PageHeader title="Email — Resend SMTP" sub="Notificações automáticas para solicitadores" />
      </div>

      {/* Estado actual */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.subtle }}>
          Estado da configuração
        </h2>

        {loading ? (
          <div className="flex items-center gap-2" style={{ color: T.faint }}>
            <Loader2 className="h-4 w-4 animate-spin" /> A verificar…
          </div>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: status.email.configured ? '#22C55E' : '#6B7280' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  {status.email.configured ? 'Email configurado' : 'Email não configurado'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                  {status.email.provider}
                  {status.email.from && <span> · Remetente: {status.email.from}</span>}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Instruções de configuração */}
      {!loading && !status?.email.configured && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#EAB308' }} />
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: T.text }}>Como activar o email</p>
              <ol className="space-y-2 text-sm" style={{ color: T.muted }}>
                <li>
                  <span className="font-semibold text-white">1.</span> Crie uma conta em{' '}
                  <a href="https://resend.com" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 underline" style={{ color: '#EAB308' }}>
                    resend.com <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li><span className="font-semibold text-white">2.</span> Verifique o domínio <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: T.border, color: T.text }}>fabriq.pt</code> nas DNS settings</li>
                <li><span className="font-semibold text-white">3.</span> Gere uma API Key em <strong>API Keys → Create API Key</strong></li>
                <li>
                  <span className="font-semibold text-white">4.</span> Adicione ao ficheiro{' '}
                  <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: T.border, color: T.text }}>/var/www/fabriq/apps/api/.env</code>:
                  <div className="mt-2 rounded-lg px-3 py-2 font-mono text-xs" style={{ background: '#0D1117', color: '#22C55E', border: `1px solid ${T.border}` }}>
                    RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
                  </div>
                </li>
                <li><span className="font-semibold text-white">5.</span> Reinicie a API: <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: T.border, color: T.text }}>pm2 restart fabriq-api --update-env</code></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Teste de email */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.subtle }}>
          Enviar email de teste
        </h2>
        <p className="text-sm mb-4" style={{ color: T.muted }}>
          Confirme que o email está a funcionar antes de criar ordens reais.
          {!status?.email.configured && (
            <span style={{ color: '#EF4444' }}> (requer RESEND_API_KEY configurada)</span>
          )}
        </p>
        <form onSubmit={handleSendTest} className="flex gap-3">
          <input
            type="email" value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="email@exemplo.pt"
            required
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={{ background: '#0D1117', border: `1px solid ${T.border}`, color: T.text }}
            onFocus={e => (e.currentTarget.style.borderColor = '#EAB308')}
            onBlur={e  => (e.currentTarget.style.borderColor = T.border)}
          />
          <Btn type="submit" disabled={sending || !status?.email.configured}>
            {sending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> A enviar…</>
              : <><Send className="h-4 w-4" /> Testar</>
            }
          </Btn>
        </form>
      </div>

      {/* O que dispara notificações */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.subtle }}>
          Eventos que geram notificação
        </h2>
        <div className="space-y-2.5">
          {[
            { icon: '📋', label: 'Ordem criada', desc: 'Email ao solicitador quando a ordem é registada' },
            { icon: '▶️', label: 'Etapa iniciada', desc: 'Email ao solicitador quando o operador inicia uma etapa' },
            { icon: '✅', label: 'Etapa concluída', desc: 'Email ao solicitador quando uma etapa intermédia é concluída' },
            { icon: '🏁', label: 'Ordem concluída', desc: 'Email com link de verificação quando todas as etapas terminam' },
            { icon: '❌', label: 'Ordem cancelada', desc: 'Email ao solicitador quando a ordem é cancelada' },
          ].map(ev => (
            <div key={ev.label} className="flex items-start gap-3 py-2" style={{ borderBottom: `1px solid ${T.divider}` }}>
              <span className="text-base flex-shrink-0">{ev.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: T.text }}>{ev.label}</p>
                <p className="text-xs mt-0.5" style={{ color: T.faint }}>{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: T.faint }}>
          Nota: o solicitador recebe email apenas se tiver o campo email preenchido e a opção "Notificar por email" activada no seu perfil.
        </p>
      </div>
    </div>
  )
}
