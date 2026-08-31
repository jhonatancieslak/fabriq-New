import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (signInError) {
      setError('E-mail ou password incorretos.')
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-8">
        <p className="text-lg font-black tracking-tight text-white mb-6">
          FABRIQ<span className="text-amber-400">.PT</span>
        </p>
        <h1 className="text-xl font-semibold text-white mb-1">Entrar</h1>
        <p className="text-sm text-slate-400 mb-6">Aceda à sua conta Fabriq</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-medium py-2 transition"
          >
            {loading ? 'A entrar…' : 'Entrar'}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-6 text-center">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="text-amber-400 hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
