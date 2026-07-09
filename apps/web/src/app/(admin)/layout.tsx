// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { FeedbackWidget } from '@/components/ui/feedback-widget'
import { TrialBanner } from '@/components/ui/trial-banner'
import { Tour } from '@/components/ui/tour'
import { useBillingLock, BillingLockScreen } from '@/components/ui/billing-lock'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const billingLock = useBillingLock()

  useEffect(() => {
    const token = localStorage.getItem('fabriq_token')
    if (!token) { router.replace('/login'); return }
    setReady(true)
    // Mostrar tour apenas na primeira visita
    if (!localStorage.getItem('fabriq_tour_done')) setShowTour(true)
  }, [router])

  function closeTour() {
    setShowTour(false)
    localStorage.setItem('fabriq_tour_done', '1')
  }

  if (!ready) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-yellow-400 animate-spin" />
        <span className="text-sm">A carregar...</span>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <TrialBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
        <FeedbackWidget />
      </div>
      {showTour && <Tour onClose={closeTour} />}
      {billingLock && pathname !== '/billing' && <BillingLockScreen status={billingLock} />}
    </div>
  )
}
