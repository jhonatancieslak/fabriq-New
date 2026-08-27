import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { company, subscription } = useAuth()

  return (
    <div>
      <h1 className="text-white text-xl font-semibold mb-1">Olá, {company?.razao_social}</h1>
      <p className="text-slate-500 text-sm mb-6">
        Plano {subscription?.plano} · Estado: {subscription?.status}
        {subscription?.status === 'trial' && subscription.trial_ends_at
          ? ` · trial até ${new Date(subscription.trial_ends_at).toLocaleDateString('pt-PT')}`
          : ''}
      </p>
      <div className="grid grid-cols-3 gap-4">
        {['Orçamentos este mês', 'Ordens em produção', 'Clientes ativos'].map((label) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500 text-xs">{label}</p>
            <p className="text-white text-2xl font-semibold mt-1">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
