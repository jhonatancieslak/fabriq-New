// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

const materialLabels: Record<string, string> = {
  steel: 'Aço Carbono', stainless: 'Inox', aluminum: 'Alumínio',
  copper: 'Cobre', brass: 'Latão', galvanized: 'Galvanizado',
}
const gasLabels: Record<string, string> = { nitrogen: 'N₂', oxygen: 'O₂', air: 'Ar', co2: 'CO₂' }

interface Param {
  id: string; materialType: string; thicknessMm: number; machineType: string
  speedMmMin: number; powerPercent: number; gasPressureBar: number; gasType: string
  confidence: number; notes?: string
}

export default function ParametrosPage() {
  const [material, setMaterial] = useState('steel')
  const [thickness, setThickness] = useState('3')
  const [result, setResult] = useState<{ param: Param; interpolated: boolean; note?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search() {
    setLoading(true); setError(''); setResult(null)
    const token = localStorage.getItem('fabriq_op_token')
    const slug  = localStorage.getItem('fabriq_tenant') ?? 'demo'
    try {
      const r = await fetch(
        `${API_URL}/api/v1/cutting-params?material=${material}&thickness=${thickness}&machineType=laser_cnc`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug } }
      )
      if (!r.ok) { setError('Sem parâmetros para esta combinação'); return }
      setResult(await r.json())
    } catch { setError('Erro de ligação') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-5">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Parâmetros IA</h1>
        <p className="text-sm text-slate-400 mt-0.5">Consultar parâmetros de corte recomendados</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Material</label>
          <select value={material} onChange={e => setMaterial(e.target.value)}
            className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-white focus:border-yellow-400 focus:outline-none">
            {Object.entries(materialLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Espessura (mm)</label>
          <input type="number" min={0.5} step={0.5} value={thickness} onChange={e => setThickness(e.target.value)}
            className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-white focus:border-yellow-400 focus:outline-none" />
        </div>
        <button onClick={search} disabled={loading}
          className="w-full rounded-lg bg-yellow-400 py-2.5 text-sm font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors">
          {loading ? 'A consultar...' : 'Consultar Parâmetros'}
        </button>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</div>}

      {result && (
        <div className="bg-slate-800 border border-yellow-400/30 rounded-xl p-4 space-y-3">
          {result.interpolated && (
            <div className="text-xs text-yellow-400 bg-yellow-400/10 rounded-lg px-3 py-1.5">
              {result.note ?? 'Valores interpolados'}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Velocidade', value: `${result.param.speedMmMin} mm/min`, icon: '⚡' },
              { label: 'Potência',   value: `${result.param.powerPercent}%`,      icon: '💡' },
              { label: 'Pressão Gás', value: `${result.param.gasPressureBar} bar`, icon: '💨' },
              { label: 'Gás',        value: gasLabels[result.param.gasType] ?? result.param.gasType, icon: '🔵' },
            ].map(item => (
              <div key={item.label} className="bg-slate-700 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">{item.icon} {item.label}</div>
                <div className="text-base font-bold text-white">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            Confiança: {Math.round(Number(result.param.confidence) * 100)}%
            {result.param.notes && <span> · {result.param.notes}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
