// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [slug, setSlug]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slug.trim()) { setError('Indique o identificador da empresa'); return }
    setLoading(true); setError('')
    try {
      const data = await api.auth.login(email, password, slug.trim().toLowerCase())
      localStorage.setItem('fabriq_token', data.tokens.accessToken)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LADO ESQUERDO — preto + ilustração industrial ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden" style={{ background: '#07080A' }}>

        {/* grid de fundo */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* gradiente de vinheta nas bordas */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, #07080A 100%)' }} />

        {/* ── ILUSTRAÇÃO SVG — Laser CNC + Quinagem + Ordens ── */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <svg viewBox="0 0 520 460" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-lg opacity-90">

            {/* ── Mesa de corte laser ── */}
            {/* Base da mesa */}
            <rect x="40" y="280" width="300" height="12" rx="3" fill="#1a1a2e" stroke="#2d2d5e" strokeWidth="1.5"/>
            {/* Pernas */}
            <rect x="55"  y="292" width="8" height="50" rx="2" fill="#1a1a2e" stroke="#2d2d5e" strokeWidth="1"/>
            <rect x="317" y="292" width="8" height="50" rx="2" fill="#1a1a2e" stroke="#2d2d5e" strokeWidth="1"/>
            {/* Superfície de corte (grade) */}
            <rect x="40" y="240" width="300" height="40" rx="2" fill="#0d0d1a" stroke="#1e1e3f" strokeWidth="1.5"/>
            {[60,80,100,120,140,160,180,200,220,240,260,280,300,320].map((x,i) => (
              <line key={i} x1={x} y1="240" x2={x} y2="280" stroke="#1e2040" strokeWidth="0.8"/>
            ))}
            {[248,256,264,272].map((y,i) => (
              <line key={i} x1="40" y1={y} x2="340" y2={y} stroke="#1e2040" strokeWidth="0.8"/>
            ))}

            {/* Trilho da ponte (X) */}
            <rect x="30" y="200" width="320" height="14" rx="4" fill="#0f1124" stroke="#3a3a7a" strokeWidth="1.5"/>
            {/* Corrediça (Y) no trilho */}
            <rect x="155" y="195" width="70" height="24" rx="4" fill="#12133a" stroke="#4a4a9a" strokeWidth="1.5"/>

            {/* Cabeçote laser descendo */}
            <rect x="180" y="195" width="20" height="50" rx="3" fill="#0e0f2a" stroke="#5555cc" strokeWidth="1.5"/>
            {/* Bico do laser */}
            <polygon points="185,245 195,245 191,260 189,260" fill="#7070ff" opacity="0.9"/>
            {/* Feixe laser (raio) */}
            <line x1="190" y1="260" x2="190" y2="280" stroke="#60a5fa" strokeWidth="2" strokeDasharray="2 2" opacity="0.8"/>
            {/* Ponto de corte com brilho */}
            <circle cx="190" cy="261" r="3" fill="#93c5fd" opacity="0.9"/>
            <circle cx="190" cy="261" r="6" fill="#3b82f6" opacity="0.3"/>
            <circle cx="190" cy="261" r="10" fill="#2563eb" opacity="0.15"/>
            {/* Faíscas */}
            <line x1="190" y1="262" x2="183" y2="270" stroke="#fbbf24" strokeWidth="1" opacity="0.8"/>
            <line x1="190" y1="262" x2="197" y2="271" stroke="#fbbf24" strokeWidth="1" opacity="0.8"/>
            <line x1="190" y1="262" x2="186" y2="273" stroke="#f59e0b" strokeWidth="0.8" opacity="0.6"/>
            <line x1="190" y1="262" x2="194" y2="268" stroke="#fcd34d" strokeWidth="0.8" opacity="0.6"/>
            {/* Glow do bico */}
            <ellipse cx="190" cy="261" rx="14" ry="4" fill="#3b82f6" opacity="0.12"/>

            {/* Peça sendo cortada na mesa */}
            <rect x="100" y="244" width="240" height="32" rx="1" fill="#111827" stroke="#374151" strokeWidth="1"/>
            {/* Linha de corte já feita */}
            <line x1="100" y1="260" x2="190" y2="260" stroke="#1d4ed8" strokeWidth="1.5" opacity="0.7" strokeDasharray="3 2"/>
            {/* Peças cortadas com offset */}
            <rect x="100" y="244" width="88" height="32" fill="#0f172a" stroke="#1e3a8a" strokeWidth="1" opacity="0.8"/>

            {/* ── Quinadeira (lado direito) ── */}
            {/* Corpo da quinadeira */}
            <rect x="370" y="180" width="120" height="160" rx="4" fill="#0d1117" stroke="#1f2937" strokeWidth="2"/>
            {/* Painel frontal */}
            <rect x="378" y="195" width="104" height="130" rx="2" fill="#111827" stroke="#1f2937" strokeWidth="1"/>
            {/* Viga superior (punção) */}
            <rect x="370" y="175" width="120" height="16" rx="3" fill="#1a1a2e" stroke="#374151" strokeWidth="1.5"/>
            {/* Punção descendo */}
            <rect x="415" y="191" width="30" height="40" rx="1" fill="#1e2540" stroke="#4b5563" strokeWidth="1.2"/>
            {/* Ponta do punção */}
            <polygon points="415,231 445,231 432,245 428,245" fill="#374151"/>
            {/* Chapa sendo dobrada */}
            <path d="M 370 255 L 430 255 L 480 235" stroke="#9ca3af" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            {/* Mesa da quinadeira */}
            <rect x="370" y="255" width="120" height="8" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="1"/>
            {/* Régua */}
            {[375,385,395,405,415,425,435,445,455,465,475,485].map((x,i) => (
              <line key={i} x1={x} y1="263" x2={x} y2={i%2===0 ? "268" : "266"} stroke="#4b5563" strokeWidth="0.8"/>
            ))}
            {/* Cilindros hidráulicos */}
            <rect x="378" y="148" width="14" height="30" rx="3" fill="#1a1a2e" stroke="#374151" strokeWidth="1"/>
            <rect x="458" y="148" width="14" height="30" rx="3" fill="#1a1a2e" stroke="#374151" strokeWidth="1"/>
            {/* Painel de controlo */}
            <rect x="388" y="210" width="50" height="38" rx="3" fill="#0f172a" stroke="#1e3a8a" strokeWidth="1.2"/>
            <circle cx="398" cy="222" r="5" fill="#1d4ed8" opacity="0.8"/>
            <circle cx="413" cy="222" r="5" fill="#15803d" opacity="0.8"/>
            <circle cx="428" cy="222" r="5" fill="#b91c1c" opacity="0.6"/>
            <rect x="393" y="232" width="34" height="4" rx="1" fill="#1e3a8a" opacity="0.6"/>
            <rect x="393" y="238" width="22" height="4" rx="1" fill="#1e3a8a" opacity="0.4"/>

            {/* ── Ordens de fabrico (documentos flutuantes) ── */}
            {/* Ordem 1 */}
            <g transform="rotate(-8, 60, 160)">
              <rect x="30" y="120" width="90" height="115" rx="4" fill="#0f172a" stroke="#1e3a8a" strokeWidth="1.5"/>
              <rect x="38" y="130" width="74" height="8"  rx="1" fill="#1e3a8a" opacity="0.8"/>
              <rect x="38" y="143" width="55" height="3"  rx="1" fill="#374151"/>
              <rect x="38" y="150" width="64" height="3"  rx="1" fill="#374151"/>
              <rect x="38" y="157" width="48" height="3"  rx="1" fill="#374151"/>
              <rect x="38" y="167" width="74" height="20" rx="2" fill="#0d1117" stroke="#1e3a8a" strokeWidth="0.8"/>
              <rect x="42" y="171" width="30" height="2"  rx="1" fill="#1e3a8a" opacity="0.6"/>
              <rect x="42" y="175" width="40" height="2"  rx="1" fill="#374151"/>
              <rect x="42" y="179" width="25" height="2"  rx="1" fill="#374151"/>
              <rect x="38" y="192" width="74" height="20" rx="2" fill="#0d1117" stroke="#1e3a8a" strokeWidth="0.8"/>
              <rect x="42" y="196" width="20" height="2"  rx="1" fill="#1d4ed8" opacity="0.7"/>
              <rect x="42" y="200" width="38" height="2"  rx="1" fill="#374151"/>
              <rect x="42" y="204" width="28" height="2"  rx="1" fill="#374151"/>
              {/* badge estado */}
              <rect x="38" y="215" width="42" height="12" rx="6" fill="#14532d" opacity="0.8"/>
              <text x="59" y="224" textAnchor="middle" fontSize="6" fill="#4ade80" fontFamily="monospace">CONCLUÍDA</text>
            </g>

            {/* Ordem 2 (à frente) */}
            <g transform="rotate(5, 95, 155)">
              <rect x="65" y="105" width="90" height="115" rx="4" fill="#111827" stroke="#2563eb" strokeWidth="1.8"/>
              <rect x="73" y="115" width="74" height="8"  rx="1" fill="#1d4ed8" opacity="0.9"/>
              <rect x="73" y="128" width="55" height="3"  rx="1" fill="#374151"/>
              <rect x="73" y="135" width="64" height="3"  rx="1" fill="#374151"/>
              <rect x="73" y="142" width="48" height="3"  rx="1" fill="#374151"/>
              <rect x="73" y="152" width="74" height="20" rx="2" fill="#0d1117" stroke="#2563eb" strokeWidth="0.8"/>
              <rect x="77" y="156" width="30" height="2"  rx="1" fill="#2563eb" opacity="0.7"/>
              <rect x="77" y="160" width="40" height="2"  rx="1" fill="#374151"/>
              <rect x="77" y="164" width="25" height="2"  rx="1" fill="#374151"/>
              <rect x="73" y="177" width="74" height="20" rx="2" fill="#0d1117" stroke="#2563eb" strokeWidth="0.8"/>
              <rect x="77" y="181" width="20" height="2"  rx="1" fill="#3b82f6" opacity="0.8"/>
              <rect x="77" y="185" width="38" height="2"  rx="1" fill="#374151"/>
              <rect x="77" y="189" width="28" height="2"  rx="1" fill="#374151"/>
              {/* badge estado */}
              <rect x="73" y="200" width="48" height="12" rx="6" fill="#1e3a8a" opacity="0.9"/>
              <text x="97" y="209" textAnchor="middle" fontSize="6" fill="#93c5fd" fontFamily="monospace">EM EXECUÇÃO</text>
            </g>

            {/* ── Etiqueta QR code ── */}
            <rect x="300" y="115" width="55" height="55" rx="4" fill="#0f172a" stroke="#2563eb" strokeWidth="1.5"/>
            {/* QR simulado */}
            {[0,1,2,3,4,5,6].map(row =>
              [0,1,2,3,4,5,6].map(col => {
                const on = (row<3&&col<3)||(row<3&&col>3)||(row>3&&col<3)||
                           (row===3&&col===3)||(row===1&&col===4)||
                           (row===4&&col===1)||(row===5&&col===5)||(row===2&&col===5)||
                           (row===4&&col===4)||(row===6&&col===2)||(row===5&&col===3)
                return on ? <rect key={`${row}-${col}`} x={307+col*6} y={122+row*6} width="5" height="5" rx="0.5" fill="#3b82f6" opacity="0.9"/> : null
              })
            )}
            {/* Cantos QR */}
            <rect x="307" y="122" width="17" height="17" rx="2" fill="none" stroke="#3b82f6" strokeWidth="1.5"/>
            <rect x="331" y="122" width="17" height="17" rx="2" fill="none" stroke="#3b82f6" strokeWidth="1.5"/>
            <rect x="307" y="146" width="17" height="17" rx="2" fill="none" stroke="#3b82f6" strokeWidth="1.5"/>
            <text x="327" y="178" textAnchor="middle" fontSize="6" fill="#6b7280" fontFamily="monospace">ORD-2024</text>

            {/* ── Linha conectora laser → ordem ── */}
            <path d="M 190 240 Q 200 200 190 180 Q 180 160 140 155" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" fill="none"/>

            {/* ── Indicadores de progresso no topo ── */}
            {[
              { x: 40,  label: 'CORTE',    pct: 78, color: '#3b82f6' },
              { x: 150, label: 'QUINAGEM', pct: 45, color: '#8b5cf6' },
              { x: 260, label: 'MONTAGEM', pct: 20, color: '#f59e0b' },
            ].map(({ x, label, pct, color }) => (
              <g key={label}>
                <text x={x+25} y="28" textAnchor="middle" fontSize="7" fill="#6b7280" fontFamily="monospace">{label}</text>
                <rect x={x} y="34" width="50" height="5" rx="2.5" fill="#1f2937"/>
                <rect x={x} y="34" width={50*pct/100} height="5" rx="2.5" fill={color} opacity="0.85"/>
                <text x={x+25} y="50" textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace" fontWeight="bold">{pct}%</text>
              </g>
            ))}
            <line x1="30" y1="58" x2="360" y2="58" stroke="#1f2937" strokeWidth="0.8"/>

          </svg>
        </div>

        {/* Logo + texto em cima */}
        <div className="relative z-10 p-10">
          <div className="text-white font-black text-3xl uppercase tracking-tight" style={{ fontFamily: 'system-ui' }}>
            FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
          </div>
        </div>

        {/* Tagline em baixo */}
        <div className="relative z-10 p-10">
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            Do corte laser à fatura — rastreabilidade total do chão de fábrica.
          </p>
          <p className="text-slate-700 text-xs mt-4">© 2026 FABRIQ.IA</p>
        </div>
      </div>

      {/* ── LADO DIREITO — branco, formulário limpo ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 lg:p-16">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden mb-10 text-center text-3xl font-black uppercase tracking-tight text-slate-900">
            FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-1">Entrar</h1>
          <p className="text-slate-400 text-sm mb-8">Aceda ao painel de gestão</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Empresa
              </label>
              <div className="relative">
                <input
                  type="text" value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required placeholder="pipesolutions"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-28 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 select-none pointer-events-none">.fabriq.pt</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="admin@empresa.pt"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Palavra-passe
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 mt-2"
              style={{ background: '#07080A', color: '#ffffff' }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-1">É operador de máquina?</p>
            <a href="/op/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
              Acesso à PWA do operador →
            </a>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
            <strong className="text-slate-700">Demo:</strong> empresa <code className="font-mono bg-slate-100 px-1 rounded">demo</code> · admin@demo.fabriq.pt / admin123
          </div>
        </div>
      </div>
    </div>
  )
}
