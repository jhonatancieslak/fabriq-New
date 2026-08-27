import { useAuth } from '../contexts/AuthContext'

const MENSAGENS: Record<string, string> = {
  trial: 'O seu período de teste terminou.',
  past_due: 'O pagamento da sua subscrição está em atraso.',
  blocked: 'O acesso à sua conta está bloqueado.',
  canceled: 'A sua subscrição foi cancelada.',
}

export default function Bloqueado() {
  const { subscription, company, signOut } = useAuth()
  const status = subscription?.status ?? 'blocked'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-2xl">
          🔒
        </div>
        <h1 className="text-lg font-semibold text-white mb-2">Acesso bloqueado</h1>
        <p className="text-sm text-slate-400 mb-1">{MENSAGENS[status] ?? MENSAGENS.blocked}</p>
        {company && <p className="text-sm text-slate-500 mb-6">{company.razao_social}</p>}
        <p className="text-sm text-slate-400 mb-6">
          Regularize a subscrição para voltar a aceder ao sistema. Contacte o suporte para renovar o seu plano.
        </p>
        <button
          onClick={signOut}
          className="w-full rounded-md bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 transition"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
