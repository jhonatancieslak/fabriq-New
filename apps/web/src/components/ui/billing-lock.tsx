// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, CreditCard } from 'lucide-react'
import { api, type BillingStatus } from '@/lib/api'

export function useBillingLock() {
  const [locked, setLocked] = useState<BillingStatus | null | false>(null)

  useEffect(() => {
    api.billing.status()
      .then(s => setLocked(s.trial.expired || s.planExpired ? s : false))
      .catch(() => setLocked(false))
  }, [])

  return locked
}

export function BillingLockScreen({ status }: { status: BillingStatus }) {
  const router = useRouter()
  const reason = status.trial.isTrialPlan ? 'trial' : 'plano'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,24,39,0.92)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-8 text-center space-y-5"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(220,38,38,0.08)' }}>
          <Lock className="h-6 w-6" style={{ color: '#DC2626' }} />
        </div>
        <div>
          <h1 className="text-lg font-black" style={{ color: '#111827' }}>
            Acesso bloqueado por falta de pagamento
          </h1>
          <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
            {reason === 'trial'
              ? 'O seu período de teste terminou.'
              : 'A sua subscrição expirou.'}
            {' '}Ative um plano para voltar a usar o FABRIQ.IA.
          </p>
        </div>
        <button
          onClick={() => router.push('/billing')}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#CA8A04' }}>
          <CreditCard className="h-4 w-4" />
          Regularizar pagamento
        </button>
      </div>
    </div>
  )
}
