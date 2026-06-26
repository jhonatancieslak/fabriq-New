// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, FolderOpen, ClipboardList, HardHat,
  Settings, LogOut, BarChart3, FileText, Zap, Cpu, UserCog, Package,
} from 'lucide-react'

const nav = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/orders',       label: 'Ordens',         icon: ClipboardList },
  { href: '/clients',      label: 'Clientes',       icon: Users },
  { href: '/projects',     label: 'Obras',          icon: FolderOpen },
  { href: '/machines',     label: 'Máquinas',       icon: Cpu },
  { href: '/materials',    label: 'Materiais',      icon: Package },
  { href: '/operators',    label: 'Operadores',     icon: HardHat },
  { href: '/invoicing',    label: 'Faturação',      icon: FileText },
  { href: '/reports',      label: 'Relatórios',     icon: BarChart3 },
  { href: '/utilizadores', label: 'Utilizadores',   icon: UserCog },
  { href: '/settings',     label: 'Configurações',  icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  function logout() {
    localStorage.removeItem('fabriq_token')
    router.replace('/login')
  }

  return (
    <aside className="flex h-screen w-56 flex-col" style={{ background: '#07080A', borderRight: '1px solid #111318' }}>

      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5" style={{ borderBottom: '1px solid #111318' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#EAB308' }}>
          <Zap className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
        </div>
        <span className="font-black text-lg uppercase tracking-tight text-white">
          FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map(item => {
          const Icon   = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group"
              style={active ? {
                background: 'rgba(234,179,8,0.12)',
                color: '#EAB308',
              } : {
                color: '#6B7280',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#D1D5DB' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280' } }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" style={{ color: active ? '#EAB308' : 'inherit' }} />
              <span className="flex-1">{item.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#EAB308' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid #111318' }}>
        <button onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
          style={{ color: '#4B5563' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#FCA5A5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4B5563' }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Terminar sessão
        </button>
      </div>
    </aside>
  )
}
