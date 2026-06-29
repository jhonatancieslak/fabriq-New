// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

interface TrialInfo {
  isTrialPlan: boolean
  daysLeft: number | null
  expiresAt: string | null
}

export function TrialBanner() {
  const router = useRouter()
  const [trial, setTrial] = useState<TrialInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('fabriq_token')
    if (!token) return

    fetch(`${API_URL}/api/v1/billing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data?.trial?.isTrialPlan) {
          setTrial({
            isTrialPlan: true,
            daysLeft: data.trial.daysLeft,
            expiresAt: data.trial.expiresAt,
          })
        }
      })
      .catch(() => { /* non-critical */ })
  }, [])

  if (!trial || !trial.isTrialPlan || dismissed) return null
  if (trial.daysLeft === null || trial.daysLeft > 14) return null

  const urgent = trial.daysLeft <= 3

  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3 text-sm font-medium"
      style={{
        background: urgent ? '#fef2f2' : '#fefce8',
        borderBottom: `1px solid ${urgent ? '#fecaca' : '#fef08a'}`,
        color: urgent ? '#991b1b' : '#713f12',
      }}
    >
      <div className="flex items-center gap-2 flex-1">
        <span>{urgent ? '🚨' : '⚡'}</span>
        <span>
          {urgent
            ? `Apenas ${trial.daysLeft} dia${trial.daysLeft !== 1 ? 's' : ''} restante${trial.daysLeft !== 1 ? 's' : ''} no trial!`
            : `O teu período de teste termina em ${trial.daysLeft} dias.`
          }
          {' '}Activa um plano para manter o acesso.
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/billing')}
          className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
          style={{
            background: urgent ? '#dc2626' : '#EAB308',
            color: urgent ? '#fff' : '#07080A',
          }}
        >
          Ver planos →
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
