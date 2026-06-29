// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { T, Toast, Btn, Field, Input, PageHeader } from '@/components/ui/admin-ui'

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

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    fetch(`${API_URL}/api/v1/settings/whatsapp`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setForm({ apiUrl: d.apiUrl ?? '', apiKey: d.apiKey ?? '', instance: d.instance ?? '' })
        setConfigured(d.configured)
      })
      .finally(() => setLoading(false))
  }, [])

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
          title="WhatsApp — Evolution API"
          sub="Configure a integração WhatsApp para notificações automáticas aos clientes"
        />
      </div>

      {/* Status */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{
        background: configured ? 'rgba(34,197,94,0.06)' : 'rgba(234,179,8,0.06)',
        border: `1px solid ${configured ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}`,
      }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: configured ? '#22C55E' : '#EAB308' }} />
        <p className="text-sm font-medium" style={{ color: configured ? '#22C55E' : '#EAB308' }}>
          {configured ? 'Evolution API configurada e activa' : 'WhatsApp não configurado'}
        </p>
      </div>

      {/* Como obter instância */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Como configurar</p>
        <ol className="space-y-2 text-sm" style={{ color: T.muted }}>
          <li><span className="font-semibold" style={{ color: T.text }}>1.</span> Aceda à sua instância Evolution API e crie uma nova instância para este tenant</li>
          <li><span className="font-semibold" style={{ color: T.text }}>2.</span> Copie o URL base da API (ex: <code className="text-xs px-1 py-0.5 rounded" style={{ background: T.divider }}>https://evolution.meuservidor.com</code>)</li>
          <li><span className="font-semibold" style={{ color: T.text }}>3.</span> Copie a API Key global ou da instância</li>
          <li><span className="font-semibold" style={{ color: T.text }}>4.</span> Copie o nome da instância criada</li>
          <li><span className="font-semibold" style={{ color: T.text }}>5.</span> Faça scan do QR Code na interface da Evolution API para ligar o número WhatsApp</li>
        </ol>
      </div>

      {/* Formulário */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
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
        <Btn onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> A guardar…</> : 'Guardar configuração'}
        </Btn>
      </div>

      {/* Teste */}
      {configured && (
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
