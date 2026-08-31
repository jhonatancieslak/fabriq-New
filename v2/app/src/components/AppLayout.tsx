import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FileText, ClipboardList, Grid2x2, Users, Settings2, History, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/', label: 'Início', end: true, icon: LayoutDashboard },
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/ordens', label: 'Ordens de Produção', icon: ClipboardList },
  { to: '/nesting', label: 'Nesting', icon: Grid2x2 },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/parametros', label: 'Parâmetros', icon: Settings2 },
  { to: '/historicos', label: 'Históricos', icon: History },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { company, appUser, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-60 shrink-0 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <p className="text-sm font-black tracking-tight text-white">
            FABRIQ<span className="text-amber-400">.PT</span>
          </p>
          <p className="text-white font-medium text-xs mt-2">{company?.nome_fantasia || company?.razao_social || 'Fabriq'}</p>
          <p className="text-slate-500 text-xs">{appUser?.role}</p>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                  isActive ? 'bg-amber-500 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={16} strokeWidth={2} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-slate-800">
          <button
            onClick={signOut}
            className="w-full rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition text-left"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children ?? <Outlet />}</main>
    </div>
  )
}
