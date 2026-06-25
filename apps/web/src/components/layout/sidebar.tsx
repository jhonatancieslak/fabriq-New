// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, FolderOpen, ClipboardList, HardHat,
  Settings, LogOut, BarChart3, FileText, ChevronRight,
} from 'lucide-react'

const nav = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/orders',     label: 'Ordens',        icon: ClipboardList },
  { href: '/clients',    label: 'Clientes',      icon: Users },
  { href: '/projects',   label: 'Obras',         icon: FolderOpen },
  { href: '/operators',  label: 'Operadores',    icon: HardHat },
  { href: '/reports',    label: 'Relatórios',    icon: BarChart3 },
  { href: '/invoicing',  label: 'Faturação',     icon: FileText },
  { href: '/settings',   label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  function logout() {
    localStorage.removeItem('fabriq_token')
    router.replace('/login')
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-100 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-slate-100">
        <div className="font-display text-xl font-black uppercase tracking-tight text-slate-900">
          FABRIQ<span className="text-brand-yellow">.IA</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map(item => {
          const Icon   = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${
                active
                  ? 'bg-blue-50 text-brand-blue'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-brand-blue' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 text-brand-blue/50" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-3">
        <button onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut className="h-4 w-4" />
          Terminar sessão
        </button>
      </div>
    </aside>
  )
}
