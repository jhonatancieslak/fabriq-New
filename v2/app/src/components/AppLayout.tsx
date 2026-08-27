import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/orcamentos', label: 'Orçamentos' },
  { to: '/ordens', label: 'Ordens de Produção' },
  { to: '/nesting', label: 'Nesting' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/parametros', label: 'Parâmetros' },
  { to: '/historicos', label: 'Históricos' },
  { to: '/configuracoes', label: 'Configurações' },
]

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { company, appUser, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-60 shrink-0 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <p className="text-white font-semibold text-sm">{company?.nome_fantasia || company?.razao_social || 'Fabriq'}</p>
          <p className="text-slate-500 text-xs">{appUser?.role}</p>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
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
