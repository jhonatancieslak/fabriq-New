// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Loader2, QrCode } from 'lucide-react'
import { T, Toast, Btn, Field, Input, PageHeader, Badge } from '@/components/ui/admin-ui'
import { api } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

function authHeaders() {
  const token = localStorage.getItem('fabriq_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function WhatsappSettingsPage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [configured, setConfigured] = useState(false)

  const [form, setForm] = useState({ apiUrl: '', apiKey: '', instance: '' })
  const [testPhone, setTestPhone] = useState('')
  const [showManual, setShowManual] = useState(false)

  // Ligação automática (QR code)
  const [connecting, setConnecting] = useState(false)
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function refreshState() {
    try {
      const state = await api.whatsapp.state()
      setConnected(state.connected)
      if (state.connected) {
        setQrcode(null)
        setPairingCode(null)
        stopPolling()
      }
    } catch {
      // ignora erros de polling
    }
  }

  useEffect(() => {
    fetch(`${API_URL}/api/v1/settings/whatsapp`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setForm({ apiUrl: d.apiUrl ?? '', apiKey: d.apiKey ?? '', instance: d.instance ?? '' })
        setConfigured(d.configured)
      })
      .finally(() => setLoading(false))
    refreshState()
    return () => stopPolling()
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await api.whatsapp.connect()
      if (res.state === 'open') {
        setConnected(true)
        setQrcode(null)
        setPairingCode(null)
        showToast('WhatsApp já está ligado')
      } else {
        setQrcode(res.qrcode)
        setPairingCode(res.pairingCode)
        setConnected(false)
        stopPolling()
        pollRef.current = setInterval(refreshState, 3500)
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao gerar QR code', 'err')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await api.whatsapp.disconnect()
      setConnected(false)
      setQrcode(null)
      setPairingCode(null)
      stopPolling()
      showToast('WhatsApp desligado')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao desligar', 'err')
    } finally {
      setDisconnecting(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/settings/whatsapp`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro')
      setConfigured(!!(form.apiUrl && form.apiKey && form.instance))
      showToast('Configuração guardada com sucesso')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao guardar', 'err')
    } finally { setSaving(false) }
  }

  async function test() {
    if (!testPhone) { showToast('Introduza um número de telefone', 'err'); return }
    setTesting(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/settings/whatsapp/test`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phone: testPhone }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro')
      showToast('Mensagem de teste enviada!')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro no envio', 'err')
    } finally { setTesting(false) }
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-3" style={{ color: T.subtle }}>
      <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div>
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: T.subtle }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
          <ChevronLeft className="h-4 w-4" /> Configurações
        </button>
        <PageHeader
          title="WhatsApp"
          sub="Ligue o WhatsApp da sua empresa para enviar notificações automáticas aos clientes"
        />
      </div>

      {/* Conectar WhatsApp */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Conectar WhatsApp</p>
          <Badge label={connected ? 'Ligado' : 'Não ligado'} color={connected ? '#22C55E' : T.subtle} />
        </div>

        {connected ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: T.muted }}>O WhatsApp desta empresa está ligado e a enviar notificações.</p>
            <Btn onClick={handleDisconnect} disabled={disconnecting} variant="danger">
              {disconnecting ? <><Loader2 className="h-4 w-4 animate-spin" /> A desligar…</> : 'Desligar'}
            </Btn>
          </div>
        ) : qrcode ? (
          <div className="space-y-3">
            <div className="flex justify-center p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrcode} alt="QR Code WhatsApp" className="w-56 h-56" />
            </div>
            <p className="text-sm text-center" style={{ color: T.muted }}>
              Abre o WhatsApp no telemóvel → Aparelhos ligados → Ligar aparelho → digitaliza o código
            </p>
            {pairingCode && (
              <p className="text-xs text-center" style={{ color: T.subtle }}>
                Código alternativo: <span className="font-mono font-semibold">{pairingCode}</span>
              </p>
            )}
            <Btn onClick={handleConnect} disabled={connecting} variant="ghost" className="w-full">
              {connecting ? <><Loader2 className="h-4 w-4 animate-spin" /> A gerar…</> : 'Gerar novo QR Code'}
            </Btn>
          </div>
        ) : (
          <Btn onClick={handleConnect} disabled={connecting} className="w-full">
            {connecting ? <><Loader2 className="h-4 w-4 animate-spin" /> A gerar QR Code…</> : <><QrCode className="h-4 w-4" /> Gerar QR Code</>}
          </Btn>
        )}
      </div>

      {/* Teste */}
      {connected && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Testar envio</p>
          <Field label="Número de telefone (com código país)">
            <Input
              value={testPhone}
              onChange={setTestPhone}
              placeholder="351912345678"
            />
          </Field>
          <Btn onClick={test} disabled={testing} variant="ghost">
            {testing ? <><Loader2 className="h-4 w-4 animate-spin" /> A enviar…</> : 'Enviar mensagem de teste'}
          </Btn>
        </div>
      )}

      {/* Configuração manual avançada */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <button
          onClick={() => setShowManual(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Configuração manual (avançado)</p>
          <ChevronDown className="h-4 w-4 transition-transform" style={{ color: T.subtle, transform: showManual ? 'rotate(180deg)' : undefined }} />
        </button>
        {showManual && (
          <div className="px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${T.divider}` }}>
            <p className="text-sm pt-4" style={{ color: T.muted }}>
              Use esta secção apenas se tiver uma instância Evolution API própria, fora deste servidor.
            </p>
            <Field label="URL da Evolution API">
              <Input
                value={form.apiUrl}
                onChange={v => setForm(f => ({ ...f, apiUrl: v }))}
                placeholder="https://evolution.meuservidor.com"
              />
            </Field>
            <Field label="API Key">
              <Input
                value={form.apiKey}
                onChange={v => setForm(f => ({ ...f, apiKey: v }))}
                placeholder="Chave de autenticação da API"
              />
            </Field>
            <Field label="Nome da Instância">
              <Input
                value={form.instance}
                onChange={v => setForm(f => ({ ...f, instance: v }))}
                placeholder="Ex: fabriq-empresa"
              />
            </Field>
            <Btn onClick={save} disabled={saving} variant="ghost">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> A guardar…</> : 'Guardar configuração manual'}
            </Btn>
          </div>
        )}
      </div>

      {/* Eventos */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Eventos com notificação WhatsApp</p>
        <div className="space-y-2">
          {[
            'Ordem criada — notifica o solicitador',
            'Etapa iniciada — notifica o cliente',
            'Etapa concluída — notifica o cliente',
            'Ordem concluída — notifica o cliente com link de verificação',
            'Ordem cancelada — notifica o solicitador',
          ].map(ev => (
            <div key={ev} className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#22C55E' }}>✓</span>
              <span className="text-sm" style={{ color: T.muted }}>{ev}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
