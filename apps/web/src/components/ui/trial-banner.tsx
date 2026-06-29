// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div className={`flex items-center justify-between gap-4 px-5 py-2.5 text-sm font-medium border-b ${
      urgent
        ? 'bg-[#07080A] border-red-800 text-white'
        : 'bg-[#07080A] border-[#EAB308]/30 text-white/80'
    }`}>
      <span className="flex-1">
        {urgent
          ? `Trial a terminar — apenas ${trial.daysLeft} dia${trial.daysLeft !== 1 ? 's' : ''} restante${trial.daysLeft !== 1 ? 's' : ''}.`
          : `Período de teste: ${trial.daysLeft} dias restantes.`
        }
        {' '}
        <button
          onClick={() => router.push('/billing')}
          className="underline underline-offset-2 font-bold text-[#EAB308] hover:text-[#CA8A04] transition-colors"
        >
          Activar plano →
        </button>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
        aria-label="Fechar"
      >
        ×
      </button>
    </div>
  )
}
