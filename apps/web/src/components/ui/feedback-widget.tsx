// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import { MessageSquare, X, Send, Star, ThumbsUp } from 'lucide-react'
import { T } from './admin-ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  const token  = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') ?? 'demo' : 'demo'
  return { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenant, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

export function FeedbackWidget() {
  const [open, setOpen]       = useState(false)
  const [message, setMessage] = useState('')
  const [rating, setRating]   = useState(0)
  const [hover, setHover]     = useState(0)
  const [sent, setSent]       = useState(false)
  const [sending, setSending] = useState(false)

  async function send() {
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch(`${API_URL}/api/v1/superadmin/feedback`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          message: message.trim(),
          rating: rating || undefined,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false); setMessage(''); setRating(0) }, 2500)
    } catch {
      // fail silently
    } finally { setSending(false) }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">

      {/* Painel de feedback */}
      {open && (
        <div className="rounded-2xl shadow-2xl w-80 overflow-hidden"
          style={{ background: '#fff', border: `1px solid ${T.border}` }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" style={{ color: '#EAB308' }} />
              <span className="text-sm font-bold" style={{ color: T.text }}>Partilhe a sua opinião</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: T.subtle }}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {sent ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <ThumbsUp className="h-6 w-6" style={{ color: '#22C55E' }} />
                </div>
                <p className="text-sm font-semibold text-center" style={{ color: T.text }}>Obrigado pelo feedback!</p>
                <p className="text-xs text-center" style={{ color: T.subtle }}>A sua opinião ajuda-nos a melhorar o FABRIQ.IA</p>
              </div>
            ) : (
              <>
                <p className="text-xs" style={{ color: T.subtle }}>
                  Estamos a começar e queremos muito saber o que acha. O que está a funcionar bem? O que podemos melhorar?
                </p>

                {/* Estrelas */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: T.muted }}>Como avalia a experiência?</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s}
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(s)}>
                        <Star className="h-6 w-6 transition-colors"
                          style={{ color: s <= (hover || rating) ? '#EAB308' : '#D1D5DB', fill: s <= (hover || rating) ? '#EAB308' : 'none' }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mensagem */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: T.muted }}>Mensagem *</p>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Conte-nos o que está a pensar… O que faltou? O que adorou? Que funcionalidade gostaria de ter?"
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                    style={{ background: '#F9FAFB', border: `1px solid ${T.border}`, color: T.text }}
                  />
                </div>

                <button
                  onClick={send}
                  disabled={!message.trim() || sending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: '#EAB308', color: '#000' }}>
                  {sending ? 'A enviar…' : <><Send className="h-4 w-4" /> Enviar feedback</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full px-4 py-3 shadow-lg font-semibold text-sm transition-all hover:scale-105"
        style={{ background: '#EAB308', color: '#000' }}>
        <MessageSquare className="h-4 w-4" />
        {!open && <span>Feedback</span>}
      </button>
    </div>
  )
}
