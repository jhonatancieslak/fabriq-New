// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Empresa, máquinas, materiais e integrações</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Empresa', desc: 'Nome, NIF, logótipo, morada', href: '/settings/company' },
          { title: 'Máquinas', desc: 'Laser CNC, quinadeiras, guilhotinas', href: '/settings/machines' },
          { title: 'Materiais', desc: 'Tipos de material disponíveis', href: '/settings/materials' },
          { title: 'Operadores', desc: 'Gestão de operadores do chão de fábrica', href: '/settings/operators' },
          { title: 'Utilizadores', desc: 'Admins, financeiros e solicitadores', href: '/settings/users' },
          { title: 'Integrações', desc: 'WhatsApp (Evolution API), SMTP', href: '/settings/integrations' },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
