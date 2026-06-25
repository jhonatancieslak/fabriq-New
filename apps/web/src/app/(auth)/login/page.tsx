// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { Logo } from '@/components/layout/logo'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Logo size="lg" variant="light" />
          <p className="mt-3 text-slate-400 text-sm">Acesso ao painel de gestão</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              placeholder="admin@empresa.pt"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Palavra-passe</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              placeholder="••••••••"
            />
          </div>

          <button className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-yellow-300 transition-colors uppercase tracking-wide">
            Entrar
          </button>
        </div>
      </div>
    </div>
  )
}
