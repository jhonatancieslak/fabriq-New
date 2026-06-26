// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, ShieldOff, AlertTriangle, CheckCircle2, Ban, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import {
  T, Toast, Modal, Btn, Field, Input, PageHeader,
  Table, Tr, Td, Badge, Empty,
} from '@/components/ui/admin-ui'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': (typeof window !== 'undefined' ? localStorage.getItem('fabriq_tenant') : null) ?? 'demo',
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : ''}`,
  }
}

interface SecurityStats {
  last24h: { total: number; failures: number }
  last7d:  { total: number; failures: number }
  topFailedIps: { ip: string; count: number }[]
  blockedCount: number
}
interface LoginAttempt {
  id: string; email: string; success: boolean; ipAddress?: string
  failureReason?: string; createdAt: string; user?: { name: string }
}
interface BlockedIp { id: string; ipAddress: string; reason?: string; isAutoBlock: boolean; createdAt: string }

function fmtTime(d: string) {
  return new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, sub, icon: Icon, warn }: {
  label: string; value: string | number; sub?: string
  icon: typeof ShieldAlert; warn?: boolean
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.subtle }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: warn ? 'rgba(239,68,68,0.1)' : T.border }}>
          <Icon className="h-4 w-4" style={{ color: warn ? '#EF4444' : T.muted }} />
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums leading-none"
        style={{ color: warn ? '#EF4444' : T.text }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: T.subtle }}>{sub}</p>}
    </div>
  )
}

function BlockIpModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!ip.trim()) { setError('IP obrigatório'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch(`${BASE}/api/v1/security/block-ip`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ ipAddress: ip, reason }),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
      onDone()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(false) }
  }

  return (
    <Modal title="Bloquear IP" sub="Bloqueia acesso imediato deste endereço" onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose} className="flex-1">Cancelar</Btn><Btn variant="danger" onClick={submit} disabled={loading} className="flex-1">{loading ? 'A bloquear…' : 'Bloquear IP'}</Btn></>}>
      <Field label="Endereço IP *">
        <Input value={ip} onChange={setIp} placeholder="Ex: 192.168.1.100" />
      </Field>
      <Field label="Motivo" hint="— opcional">
        <Input value={reason} onChange={setReason} placeholder="Ex: Brute-force detectado" />
      </Field>
      {error && <p className="text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{error}</p>}
    </Modal>
  )
}

type Tab = 'attempts' | 'blocked'

export default function SecurityPage() {
  const [stats, setStats]       = useState<SecurityStats | null>(null)
  const [attempts, setAttempts] = useState<LoginAttempt[]>([])
  const [blocked, setBlocked]   = useState<BlockedIp[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('attempts')
  const [filter, setFilter]     = useState<'all' | 'fail'>('all')
  const [blockModal, setBlockModal] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, att, blk] = await Promise.all([
        fetch(`${BASE}/api/v1/security/stats`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/v1/security/login-attempts?limit=100`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${BASE}/api/v1/security/blocked-ips`, { headers: authHeaders() }).then(r => r.json()),
      ])
      setStats(s)
      setAttempts(att.attempts ?? [])
      setBlocked(Array.isArray(blk) ? blk : [])
    } catch { showToast('Erro ao carregar dados de segurança', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function unblock(ip: string) {
    if (!confirm(`Desbloquear ${ip}?`)) return
    try {
      await fetch(`${BASE}/api/v1/security/block-ip/${ip}`, { method: 'DELETE', headers: authHeaders() })
      showToast('IP desbloqueado'); load()
    } catch { showToast('Erro ao desbloquear', 'err') }
  }

  const visibleAttempts = filter === 'fail' ? attempts.filter(a => !a.success) : attempts

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <PageHeader title="Segurança" sub="Tentativas de login e IPs bloqueados"
        action={<Btn variant="danger" onClick={() => setBlockModal(true)}><Ban className="h-4 w-4" />Bloquear IP</Btn>} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? [1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: T.surface }} />
        )) : stats && (<>
          <StatCard label="Acessos 24h" value={stats.last24h.total} sub="tentativas de login" icon={CheckCircle2} />
          <StatCard label="Falhas 24h" value={stats.last24h.failures}
            warn={stats.last24h.failures > 10}
            sub={`${stats.last24h.total > 0 ? ((stats.last24h.failures / stats.last24h.total) * 100).toFixed(0) : 0}% taxa de falha`}
            icon={AlertTriangle} />
          <StatCard label="Falhas 7 dias" value={stats.last7d.failures} sub="últ. 7 dias" icon={ShieldAlert} />
          <StatCard label="IPs Bloqueados" value={stats.blockedCount} warn={stats.blockedCount > 0} sub="activos agora" icon={ShieldOff} />
        </>)}
      </div>

      {/* Top IPs com falhas */}
      {stats && stats.topFailedIps.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.subtle }}>
            IPs com mais falhas (24h)
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topFailedIps.map(({ ip, count }) => (
              <div key={ip} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: T.bg, border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="text-sm font-mono" style={{ color: '#EF4444' }}>{ip}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                  {count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        {([['attempts', 'Tentativas de login'], ['blocked', 'IPs bloqueados']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab === t ? { background: T.yellow, color: T.bg } : { color: T.subtle }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'attempts' && (
        <>
          <div className="flex gap-2">
            {([['all', 'Todas'], ['fail', 'Só falhas']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={filter === v
                  ? { background: T.border, color: T.text }
                  : { color: T.faint }}>
                {l}
              </button>
            ))}
          </div>
          <Table headers={['Email', 'IP', 'Resultado', 'Motivo', 'Data']} loading={loading}>
            {visibleAttempts.length === 0 && !loading ? (
              <tr><td colSpan={5}>
                <Empty icon={ShieldAlert} title="Sem tentativas registadas" sub="Nenhum acesso encontrado" />
              </td></tr>
            ) : visibleAttempts.map((a, i) => (
              <Tr key={a.id} last={i === visibleAttempts.length - 1}>
                <Td>
                  <div>
                    <p className="text-sm font-medium" style={{ color: T.text }}>{a.email}</p>
                    {a.user && <p className="text-xs" style={{ color: T.subtle }}>{a.user.name}</p>}
                  </div>
                </Td>
                <Td><span className="text-sm font-mono" style={{ color: T.muted }}>{a.ipAddress ?? '—'}</span></Td>
                <Td>
                  <Badge label={a.success ? 'Sucesso' : 'Falha'}
                    color={a.success ? '#22C55E' : '#EF4444'} />
                </Td>
                <Td>
                  <span className="text-xs" style={{ color: T.faint }}>
                    {a.failureReason ?? (a.success ? '—' : 'Credenciais inválidas')}
                  </span>
                </Td>
                <Td><span className="text-xs tabular-nums" style={{ color: T.faint }}>{fmtTime(a.createdAt)}</span></Td>
              </Tr>
            ))}
          </Table>
        </>
      )}

      {tab === 'blocked' && (
        <Table headers={['Endereço IP', 'Motivo', 'Tipo', 'Bloqueado em', 'Ações']} loading={loading}>
          {blocked.length === 0 && !loading ? (
            <tr><td colSpan={5}>
              <Empty icon={ShieldOff} title="Nenhum IP bloqueado" sub="Sem restrições activas" />
            </td></tr>
          ) : blocked.map((b, i) => (
            <Tr key={b.id} last={i === blocked.length - 1}>
              <Td><span className="text-sm font-mono font-bold" style={{ color: '#EF4444' }}>{b.ipAddress}</span></Td>
              <Td><span className="text-xs" style={{ color: T.muted }}>{b.reason ?? '—'}</span></Td>
              <Td><Badge label={b.isAutoBlock ? 'Auto' : 'Manual'} color={b.isAutoBlock ? T.subtle : '#EAB308'} /></Td>
              <Td><span className="text-xs tabular-nums" style={{ color: T.faint }}>{fmtTime(b.createdAt)}</span></Td>
              <Td>
                <button onClick={() => unblock(b.ipAddress)} className="p-2 rounded-lg hover:bg-green-500/10" title="Desbloquear">
                  <Trash2 className="h-3.5 w-3.5" style={{ color: T.faint }} />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      {blockModal && <BlockIpModal onClose={() => setBlockModal(false)} onDone={() => { setBlockModal(false); showToast('IP bloqueado'); load() }} />}
    </div>
  )
}
