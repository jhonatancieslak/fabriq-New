// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Hash, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { T, Btn, Field, Input, Toast } from '@/components/ui/admin-ui'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

interface Config {
  prefix: string
  separator: string
  includeYear: boolean
  includeMonth: boolean
  padding: number
  resetYearly: boolean
  nextSeq: number
  lastResetYear: number
}

const DEFAULT: Config = {
  prefix: 'OS', separator: '-', includeYear: true,
  includeMonth: false, padding: 4, resetYearly: false,
  nextSeq: 1, lastResetYear: new Date().getFullYear(),
}

const SEPARATORS = [
  { value: '-', label: '   —   traço' },
  { value: '/', label: '   /   barra' },
  { value: '.', label: '   .   ponto' },
  { value: '_', label: '   _   sublinhado' },
  { value: '',  label: 'nenhum' },
]

function buildPreview(c: Config): string {
  const now   = new Date()
  const year  = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const seq   = String(c.nextSeq).padStart(c.padding, '0')
  const sep   = c.separator
  const parts: string[] = []
  if (c.prefix) parts.push(c.prefix)
  if (c.includeYear) {
    parts.push(year)
    if (c.includeMonth) parts.push(month)
  }
  parts.push(seq)
  return parts.join(sep)
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': typeof window !== 'undefined' ? (localStorage.getItem('fabriq_tenant') ?? 'demo') : 'demo',
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''}`,
  }
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors text-left"
      style={{ background: T.bg, border: `1px solid ${checked ? T.yellow : T.border}` }}>
      <div>
        <p className="text-sm font-medium" style={{ color: T.text }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{sub}</p>}
      </div>
      <div className="relative flex-shrink-0 ml-4">
        <div className="w-10 h-5 rounded-full transition-colors"
          style={{ background: checked ? '#EAB308' : T.border }}>
          <div className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white shadow"
            style={{ left: checked ? '22px' : '2px' }} />
        </div>
      </div>
    </button>
  )
}

export default function OrderNumberingPage() {
  const router = useRouter()
  const [config, setConfig]   = useState<Config>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const role = typeof window !== 'undefined' ? localStorage.getItem('fabriq_role') : ''
  const isAdmin = role === 'admin'

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/v1/settings/order-numbering`, { headers: headers() })
      if (!r.ok) throw new Error()
      const data = await r.json()
      setConfig(data.config)
    } catch { showToast('Erro ao carregar configuração', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/v1/settings/order-numbering`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify(config),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
      showToast('Configuração guardada')
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erro', 'err') }
    finally { setSaving(false) }
  }

  function set<K extends keyof Config>(k: K) {
    return (v: Config[K]) => setConfig(c => ({ ...c, [k]: v }))
  }

  const preview = buildPreview(config)
  const nextPreview = buildPreview({ ...config, nextSeq: config.nextSeq + 1 })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.yellow }} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Back */}
      <div>
        <button onClick={() => router.push('/settings')}
          className="flex items-center gap-1.5 text-sm mb-3"
          style={{ color: T.subtle }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = T.subtle}>
          <ChevronLeft className="h-4 w-4" /> Configurações
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: T.yellowBg }}>
            <Hash className="h-4 w-4" style={{ color: T.yellow }} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>Numeração de Ordens</h1>
            <p className="text-sm" style={{ color: T.subtle }}>Define o formato do número sequencial das ordens de serviço</p>
          </div>
        </div>
      </div>

      {/* Preview card */}
      <div className="rounded-2xl p-5" style={{ background: '#07080A', border: '1px solid #1f2937' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>
          Prévia da próxima ordem
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-black tracking-tight" style={{ color: '#EAB308', fontVariantNumeric: 'tabular-nums' }}>
            {preview}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs" style={{ color: '#4B5563' }}>Seguinte:</span>
          <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{nextPreview}</span>
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#EAB308' }} />
          <p className="text-sm" style={{ color: '#CA8A04' }}>Só administradores podem alterar esta configuração.</p>
        </div>
      )}

      {/* Config form */}
      <div className="rounded-2xl p-5 space-y-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>Formato do número</p>

        {/* Prefix */}
        <Field label="Prefixo" hint="— máx 10 caracteres, letras e números">
          <Input
            value={config.prefix}
            onChange={v => set('prefix')(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
            placeholder="OS, ORD, FAB, … (vazio para sem prefixo)"
            disabled={!isAdmin}
          />
        </Field>

        {/* Separator */}
        <Field label="Separador entre componentes">
          <div className="grid grid-cols-5 gap-2">
            {SEPARATORS.map(s => (
              <button key={s.value} type="button" onClick={() => isAdmin && set('separator')(s.value)}
                className="rounded-xl py-2.5 text-sm font-semibold transition-all"
                style={config.separator === s.value
                  ? { background: T.yellowBg, border: `1px solid ${T.yellow}`, color: T.yellow }
                  : { background: T.bg, border: `1px solid ${T.border}`, color: T.subtle }}>
                {s.value === '' ? 'nenhum' : s.value}
              </button>
            ))}
          </div>
        </Field>

        {/* Year + Month */}
        <div className="space-y-2">
          <Toggle checked={config.includeYear} onChange={v => { set('includeYear')(v); if (!v) set('includeMonth')(false) }}
            label="Incluir ano" sub="Ex: OS-2026-0001" />
          {config.includeYear && (
            <div className="pl-4">
              <Toggle checked={config.includeMonth} onChange={set('includeMonth')}
                label="Incluir mês" sub="Ex: OS-2026-06-0001" />
            </div>
          )}
        </div>

        {/* Padding */}
        <Field label="Dígitos do sequencial">
          <div className="grid grid-cols-3 gap-2">
            {[3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => isAdmin && set('padding')(n)}
                className="rounded-xl py-2.5 text-sm font-semibold transition-all"
                style={config.padding === n
                  ? { background: T.yellowBg, border: `1px solid ${T.yellow}`, color: T.yellow }
                  : { background: T.bg, border: `1px solid ${T.border}`, color: T.subtle }}>
                {n} dígitos
                <span className="block text-xs font-mono mt-0.5" style={{ opacity: 0.7 }}>
                  {'0'.repeat(n - 1)}1
                </span>
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Sequencial */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>Controlo do sequencial</p>

        <Toggle checked={config.resetYearly} onChange={set('resetYearly')}
          label="Reiniciar sequencial a 1 em cada ano"
          sub="A 1 de Janeiro, o contador volta ao número 1. Útil para numeração por ano-fiscal." />

        <Field label="Próximo número sequencial" hint="— override manual, útil em migrações">
          <Input
            type="number"
            value={String(config.nextSeq)}
            onChange={v => { const n = parseInt(v); if (!isNaN(n) && n >= 1) set('nextSeq')(n) }}
            disabled={!isAdmin}
          />
          <p className="text-xs mt-1.5" style={{ color: T.subtle }}>
            A próxima ordem criada usará este número. Alterações têm efeito imediato.
          </p>
        </Field>
      </div>

      {/* Exemplos */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>Exemplos de formatos</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Padrão',     example: 'OS-2026-0001' },
            { label: 'Com mês',    example: 'OS-2026-06-0001' },
            { label: 'Sem ano',    example: 'OS-0001' },
            { label: 'Simples',    example: '00001' },
            { label: 'Ano + barra', example: 'FAB/2026/00001' },
            { label: 'Empresa',    example: 'CORP-2026-001' },
          ].map(ex => (
            <div key={ex.label} className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <span className="text-xs" style={{ color: T.subtle }}>{ex.label}</span>
              <span className="text-xs font-mono font-bold" style={{ color: T.text }}>{ex.example}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#3B82F6' }} />
        <p className="text-xs" style={{ color: '#1D4ED8' }}>
          Alterações aplicam-se apenas a novas ordens. Ordens já criadas mantêm o número original.
          O sequencial é atómico — não há risco de duplicados mesmo com criação simultânea.
        </p>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Btn onClick={save} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar configuração'}
          </Btn>
        </div>
      )}
    </div>
  )
}
