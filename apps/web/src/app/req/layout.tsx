// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function ReqLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Permite acesso à página de login sem verificar token
    if (pathname === '/req/login') return

    const token = localStorage.getItem('fabriq_token')
    const role  = localStorage.getItem('fabriq_role')

    if (!token) {
      router.replace('/req/login')
      return
    }
    // Admins que tentem aceder ao portal do solicitador → dashboard
    if (role && role !== 'requester') {
      router.replace('/dashboard')
    }
  }, [pathname, router])

  return (
    <div className="min-h-screen" style={{ background: '#07080A' }}>
      {/* Topbar */}
      <header className="border-b" style={{ borderColor: '#111318', background: '#07080A' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-black text-lg uppercase tracking-tight text-white">
            FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
          </span>
          <button
            onClick={() => {
              localStorage.removeItem('fabriq_token')
              localStorage.removeItem('fabriq_tenant')
              localStorage.removeItem('fabriq_role')
              router.replace('/req/login')
            }}
            className="text-xs font-medium transition-colors"
            style={{ color: '#4B5563' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
