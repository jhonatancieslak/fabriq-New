import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function isSubscriptionActive(status: string | undefined, trialEndsAt: string | null | undefined) {
  if (status === 'active') return true
  if (status === 'trial') {
    if (!trialEndsAt) return true
    return new Date(trialEndsAt).getTime() > Date.now()
  }
  return false
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, appUser, subscription, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        A carregar…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (!appUser) return <Navigate to="/login" replace />

  if (!isSubscriptionActive(subscription?.status, subscription?.trial_ends_at)) {
    return <Navigate to="/bloqueado" replace />
  }

  return <>{children}</>
}
