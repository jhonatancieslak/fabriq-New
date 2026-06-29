// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('fabriq_token')
    const role  = localStorage.getItem('fabriq_role')
    const isSuperAdmin = localStorage.getItem('fabriq_super_admin') === 'true'
    if (!token || !isSuperAdmin) router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen" style={{ background: '#07080A' }}>
      <header className="border-b" style={{ borderColor: '#111318' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black text-lg uppercase tracking-tight text-white">
              FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              SUPER ADMIN
            </span>
          </div>
          <a href="/dashboard" className="text-xs font-medium transition-colors" style={{ color: '#4B5563' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}>
            ← Voltar ao painel
          </a>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
