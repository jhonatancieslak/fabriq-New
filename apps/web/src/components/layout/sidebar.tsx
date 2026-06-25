// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FolderOpen, ClipboardList,
  Settings, LogOut, Wrench, BarChart3, FileText, HardHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

const nav = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/orders',     label: 'Ordens',       icon: ClipboardList },
  { href: '/clients',    label: 'Clientes',     icon: Users },
  { href: '/projects',   label: 'Obras',        icon: FolderOpen },
  { href: '/operators',  label: 'Operadores',   icon: HardHat },
  { href: '/reports',    label: 'Relatórios',   icon: BarChart3 },
  { href: '/invoicing',  label: 'Faturação',    icon: FileText },
  { href: '/settings',   label: 'Configurações',icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-slate-200">
        <Logo size="sm" variant="dark" />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-blue-700' : 'text-slate-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <LogOut className="h-4 w-4 text-slate-400" />
          Sair
        </button>
      </div>
    </aside>
  )
}
