// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Sliders, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/layout/logo'

const navItems = [
  { href: '/op/dashboard',   icon: LayoutDashboard, label: 'Início' },
  { href: '/op/ordens',      icon: ClipboardList,   label: 'Ordens' },
  { href: '/op/parametros',  icon: Sliders,         label: 'Parâm. IA' },
]

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fabriq_op_token')
    if (!token) { router.replace('/op/login'); return }
    setChecking(false)
  }, [router])

  function handleLogout() {
    localStorage.removeItem('fabriq_op_token')
    router.replace('/op/login')
  }

  if (checking) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-500 text-sm animate-pulse">A verificar acesso...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Topo */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <Logo size="sm" variant="light" />
        <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Barra de navegação inferior (PWA mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex safe-area-bottom">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-yellow-400' : 'text-slate-400 hover:text-slate-200'
              }`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
