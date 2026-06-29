// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, LogOut, ChevronDown, ClipboardList } from 'lucide-react'
import { api } from '@/lib/api'
import { T } from '@/components/ui/admin-ui'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/orders':       'Ordens de Serviço',
  '/clients':      'Clientes',
  '/projects':     'Obras',
  '/machines':     'Máquinas',
  '/materials':    'Materiais',
  '/operators':    'Operadores',
  '/invoicing':    'Faturação',
  '/reports':      'Relatórios',
  '/utilizadores': 'Utilizadores',
  '/security':     'Segurança',
  '/billing':      'Plano & Billing',
  '/settings':     'Configurações',
  '/superadmin':   'Super Admin',
}

export function Header() {
  const router   = useRouter()
  const pathname = usePathname()
  const [badge, setBadge]       = useState<number>(0)
  const [showUser, setShowUser] = useState(false)
  const [showBell, setShowBell] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  const userName    = typeof window !== 'undefined' ? (localStorage.getItem('fabriq_user_name') ?? '') : ''
  const tenantName  = typeof window !== 'undefined' ? (localStorage.getItem('fabriq_tenant_name') ?? '') : ''
  const role        = typeof window !== 'undefined' ? (localStorage.getItem('fabriq_role') ?? '') : ''
  const initials    = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const ROLE_LABEL: Record<string, string> = {
    admin: 'Administrador', financial: 'Financeiro',
    requester: 'Solicitador', viewer: 'Visualizador',
  }

  // Title: match longest prefix
  const title = Object.entries(PAGE_TITLES)
    .filter(([k]) => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? ''

  useEffect(() => {
    api.notifications.badge().then(d => setBadge(d.total)).catch(() => {})
    const interval = setInterval(() => {
      api.notifications.badge().then(d => setBadge(d.total)).catch(() => {})
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function logout() {
    localStorage.removeItem('fabriq_token')
    localStorage.removeItem('fabriq_super_admin')
    localStorage.removeItem('fabriq_user_name')
    localStorage.removeItem('fabriq_user_id')
    localStorage.removeItem('fabriq_tenant_name')
    localStorage.removeItem('fabriq_role')
    localStorage.removeItem('fabriq_tenant')
    router.replace('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between px-6 flex-shrink-0"
      style={{ background: '#FFFFFF', borderBottom: `1px solid ${T.border}` }}>

      {/* Page title */}
      <h1 className="text-base font-bold tracking-tight" style={{ color: T.text }}>{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setShowBell(v => !v)}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-gray-100"
            title="Ordens pendentes"
          >
            <Bell className="h-4 w-4" style={{ color: T.muted }} />
            {badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
                style={{ background: '#EAB308', color: '#07080A' }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>

          {showBell && (
            <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl shadow-xl overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.divider}` }}>
                <p className="text-sm font-semibold" style={{ color: T.text }}>Notificações</p>
              </div>
              <div className="px-4 py-4 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                  style={{ background: badge > 0 ? 'rgba(234,179,8,0.1)' : T.divider }}>
                  <ClipboardList className="h-5 w-5" style={{ color: badge > 0 ? '#EAB308' : T.faint }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  {badge > 0 ? `${badge} ordem${badge !== 1 ? 's' : ''} pendente${badge !== 1 ? 's' : ''}` : 'Sem pendentes'}
                </p>
                <p className="text-xs text-center" style={{ color: T.subtle }}>
                  {badge > 0
                    ? 'Ordens à espera de atribuição e início'
                    : 'Todas as ordens estão em execução ou concluídas'}
                </p>
                {badge > 0 && (
                  <button
                    onClick={() => { router.push('/orders?status=pending'); setShowBell(false) }}
                    className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(234,179,8,0.12)', color: '#CA8A04' }}>
                    Ver ordens pendentes →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUser(v => !v)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-gray-100"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black"
              style={{ background: '#EAB308', color: '#07080A' }}>
              {initials || '?'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold leading-tight" style={{ color: T.text }}>
                {userName.split(' ')[0] || 'Utilizador'}
              </p>
              <p className="text-xs leading-tight" style={{ color: T.subtle }}>
                {ROLE_LABEL[role] ?? role}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5" style={{ color: T.faint }} />
          </button>

          {showUser && (
            <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl shadow-xl overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.divider}` }}>
                <p className="text-sm font-semibold" style={{ color: T.text }}>{userName}</p>
                <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{tenantName}</p>
                <p className="text-xs mt-0.5" style={{ color: T.faint }}>{ROLE_LABEL[role] ?? role}</p>
              </div>
              <div className="p-2">
                <button onClick={logout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-red-50"
                  style={{ color: '#DC2626' }}>
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  Terminar sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
