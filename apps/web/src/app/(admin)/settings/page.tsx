// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

'use client'

import Link from 'next/link'
import { Cpu, Package, HardHat, UserCog, MessageSquare, Mail, ArrowRight, Settings } from 'lucide-react'
import { T, PageHeader } from '@/components/ui/admin-ui'

interface NavItem { href: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; desc: string; badge?: string }
interface NavSection { title: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    title: 'Produção',
    items: [
      { href: '/machines',   icon: Cpu,     label: 'Máquinas',   desc: 'Equipamentos, tipos e parâmetros de custo' },
      { href: '/materials',  icon: Package, label: 'Materiais',  desc: 'Catálogo de materiais e custos por kg / m²' },
      { href: '/operators',  icon: HardHat, label: 'Operadores', desc: 'QR code de acesso à PWA do operador' },
    ],
  },
  {
    title: 'Acessos',
    items: [
      { href: '/utilizadores', icon: UserCog, label: 'Utilizadores', desc: 'Admin, financeiro, solicitador, visualizador' },
    ],
  },
  {
    title: 'Integrações',
    items: [
      { href: '/settings/whatsapp', icon: MessageSquare, label: 'WhatsApp (Evolution API)', desc: 'Notificações automáticas via WhatsApp', badge: 'Em breve' },
      { href: '/settings/smtp',     icon: Mail,          label: 'Email (Resend)',            desc: 'Notificações automáticas por email' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-8">
      <PageHeader title="Configurações" sub="Empresa, equipamentos, materiais e integrações" />

      {sections.map(section => (
        <div key={section.title}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.subtle }}>
            {section.title}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.items.map(item => (
              item.badge ? (
                <div key={item.href}
                  className="rounded-2xl p-5 flex items-start gap-4 opacity-50 cursor-not-allowed"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.border }}>
                    <item.icon className="h-4 w-4" style={{ color: T.muted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{item.label}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: T.border, color: T.faint }}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{item.desc}</p>
                  </div>
                </div>
              ) : (
                <Link key={item.href} href={item.href}
                  className="rounded-2xl p-5 flex items-start gap-4 transition-all group"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#374151')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.border }}>
                    <item.icon className="h-4 w-4" style={{ color: T.muted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: T.text }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: T.muted }} />
                </Link>
              )
            ))}
          </div>
        </div>
      ))}

      {/* Info plano */}
      <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3 mb-3">
          <Settings className="h-4 w-4" style={{ color: T.subtle }} />
          <p className="text-sm font-semibold" style={{ color: T.text }}>Plano actual</p>
        </div>
        <p className="text-xs" style={{ color: T.subtle }}>
          Billing e gestão de planos disponível em breve. Conta de desenvolvimento activa.
        </p>
      </div>
    </div>
  )
}
