// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Share2, QrCode, Copy, CheckCircle2, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { api, type Operator } from '@/lib/api'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3190'

export default function OperatorAccessPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [copied, setCopied] = useState(false)
  const [tenant, setTenant] = useState('demo')

  const loginUrl = `${APP_URL}/op/login?empresa=${tenant}`

  useEffect(() => {
    setTenant(localStorage.getItem('fabriq_tenant') ?? 'demo')
    api.operators.get(id).then(setOperator).catch(() => null)
  }, [id])

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, loginUrl, {
      width: 240, margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  }, [loginUrl])

  function copyLink() {
    navigator.clipboard.writeText(loginUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Olá ${operator?.name ?? ''}! 👋\n\nO seu acesso à FABRIQ.IA está pronto.\n\n` +
      `📱 Aceda através do link:\n${loginUrl}\n\n` +
      `👤 Utilizador: *${operator?.username ?? ''}*\n\n` +
      `Guarde este link no ecrã do telemóvel para acesso rápido.`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ChevronLeft className="h-4 w-4" /> Operadores
      </button>

      <h1 className="text-xl font-bold text-slate-900 mb-1">Acesso PWA do Operador</h1>
      {operator && <p className="text-sm text-slate-500 mb-6">{operator.name} ({operator.username})</p>}

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <div className="font-semibold mb-1 flex items-center gap-2"><Smartphone className="h-4 w-4" /> Como funciona</div>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>O operador digitaliza o QR code ou abre o link</li>
          <li>Introduz as suas credenciais de operador</li>
          <li>Adiciona a página ao ecrã inicial do telemóvel</li>
          <li>Acesso rápido ao chão de fábrica, sempre disponível</li>
        </ol>
      </div>

      {/* QR Code */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
          <QrCode className="h-4 w-4" /> QR Code — PWA do Operador
        </div>
        <canvas ref={canvasRef} className="rounded-xl" />
        <p className="text-xs text-slate-400 mt-3 text-center">Digitalizar com o telemóvel para aceder à PWA</p>
      </div>

      {/* Link directo */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
        <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Ligação directa</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 truncate">
            {loginUrl}
          </div>
          <button onClick={copyLink}
            className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}>
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Enviar por WhatsApp */}
      <button onClick={shareWhatsApp}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-semibold text-white hover:bg-green-600 active:bg-green-700 transition-colors">
        <Share2 className="h-4 w-4" />
        Enviar por WhatsApp
      </button>

      {operator?.phone && (
        <button onClick={() => window.open(`https://wa.me/${operator.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${operator.name}! Segue o link do seu acesso FABRIQ.IA: ${loginUrl}`)}`, '_blank')}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-green-300 py-3 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors">
          Enviar directamente para {operator.phone}
        </button>
      )}
    </div>
  )
}
