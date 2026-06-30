// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FolderOpen, ClipboardList, HardHat,
  Settings, BarChart3, FileText, Zap, Cpu, UserCog, Package,
  ShieldAlert, CreditCard, ShieldCheck, ChevronLeft, ChevronRight, Library, Kanban, Factory, Wrench,
} from 'lucide-react'

const nav = [
  { href: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/orders',       label: 'Ordens',           icon: ClipboardList },
  { href: '/production/kanban', label: 'Kanban',       icon: Kanban },
  { href: '/clients',      label: 'Clientes',         icon: Users },
  { href: '/projects',     label: 'Obras',            icon: FolderOpen },
  { href: '/media',        label: 'Biblioteca',       icon: Library },
  { href: '/machines',     label: 'Máquinas',         icon: Cpu },
  { href: '/materials',    label: 'Materiais',        icon: Package },
  { href: '/operators',    label: 'Operadores',       icon: HardHat },
  { href: '/invoicing',    label: 'Faturação',        icon: FileText },
  { href: '/production',   label: 'Produção',         icon: Factory },
  { href: '/maintenance',  label: 'Manutenção',       icon: Wrench },
  { href: '/consumables',  label: 'Consumíveis',      icon: Package },
  { href: '/reports',      label: 'Relatórios',       icon: BarChart3 },
  { href: '/utilizadores', label: 'Utilizadores',     icon: UserCog },
  { href: '/security',     label: 'Segurança',        icon: ShieldAlert },
  { href: '/billing',      label: 'Plano',            icon: CreditCard },
  { href: '/settings',     label: 'Configurações',    icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const isSuperAdmin = typeof window !== 'undefined' && localStorage.getItem('fabriq_super_admin') === 'true'

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('fabriq_sidebar_collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('fabriq_sidebar_collapsed', String(collapsed))
  }, [collapsed])

  const w = collapsed ? 'w-[64px]' : 'w-56'

  return (
    <aside
      data-tour="sidebar"
      className={`relative flex h-screen flex-col flex-shrink-0 transition-all duration-200 ${w}`}
      style={{ background: '#07080A', borderRight: '1px solid #111318' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-4 flex-shrink-0" style={{ borderBottom: '1px solid #111318' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: '#EAB308' }}>
          <Zap className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="font-black text-lg uppercase tracking-tight text-white whitespace-nowrap">
            FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
          </span>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-[60px] z-10 flex items-center justify-center w-6 h-6 rounded-full transition-colors"
        style={{ background: '#1a1d24', border: '1px solid #2a2d35', color: '#6B7280' }}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-0.5">
        {nav.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              data-tour={
                item.href === '/orders' ? 'orders-link' :
                item.href === '/clients' ? 'clients-link' :
                item.href === '/machines' ? 'machines-link' :
                item.href === '/billing' ? 'billing-link' : undefined
              }
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
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
              {!collapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
              {!collapsed && active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#EAB308' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Super Admin link */}
      {isSuperAdmin && (
        <div className="px-2 pb-1">
          <Link href="/superadmin"
            title={collapsed ? 'Super Admin' : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            {!collapsed && 'Super Admin'}
          </Link>
        </div>
      )}

      <div className="pb-4" />
    </aside>
  )
}
