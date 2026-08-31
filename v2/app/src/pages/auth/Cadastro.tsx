import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const PENDING_KEY = 'fabriq_pending_signup'

export default function Cadastro() {
  const [confirmEmailSent, setConfirmEmailSent] = useState(false)
  const [form, setForm] = useState({
    razaoSocial: '',
    nif: '',
    maquinaPotencia: '',
    maquinaDimensao: '',
    nomeCompleto: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
  })
  const [aceitaPolitica, setAceitaPolitica] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.senha !== form.confirmarSenha) {
      setError('As passwords não coincidem.')
      return
    }
    if (!aceitaPolitica) {
      setError('Tem de aceitar a Política de Privacidade.')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // A conta só fica com sessão activa depois de confirmar o e-mail.
    // Guardamos os dados da empresa para os aplicar no primeiro login (ver AuthContext).
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        email: form.email,
        razaoSocial: form.razaoSocial,
        nif: form.nif,
        maquinaPotencia: form.maquinaPotencia,
        maquinaDimensao: form.maquinaDimensao,
        nomeCompleto: form.nomeCompleto,
        telefone: form.telefone,
      }),
    )

    setConfirmEmailSent(true)
  }

  if (confirmEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-2xl">
            ✉️
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">Confirme o seu e-mail</h1>
          <p className="text-sm text-slate-400 mb-6">
            Enviámos um link de confirmação para <span className="text-white">{form.email}</span>. Clique nele para
            ativar a conta e comece o seu teste grátis de 4 dias.
          </p>
          <Link to="/login" className="text-amber-400 hover:underline text-sm">
            Já confirmei — Entrar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-8">
        <p className="text-lg font-black tracking-tight text-white mb-6">
          FABRIQ<span className="text-amber-400">.PT</span>
        </p>
        <h1 className="text-xl font-semibold text-white mb-1">Teste grátis por 4 dias</h1>
        <p className="text-sm text-slate-400 mb-6">Crie a sua conta e comece a orçar agora. Sem cartão de crédito.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Razão Social" value={form.razaoSocial} onChange={(v) => set('razaoSocial', v)} required />
            <Field label="NIF" value={form.nif} onChange={(v) => set('nif', v)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Potência da máquina" value={form.maquinaPotencia} onChange={(v) => set('maquinaPotencia', v)} />
            <Field label="Dimensão da máquina" value={form.maquinaDimensao} onChange={(v) => set('maquinaDimensao', v)} />
          </div>
          <Field label="Nome completo do admin" value={form.nomeCompleto} onChange={(v) => set('nomeCompleto', v)} required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-mail do admin" type="email" value={form.email} onChange={(v) => set('email', v)} required />
            <Field label="Telefone" value={form.telefone} onChange={(v) => set('telefone', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Senha de acesso" type="password" value={form.senha} onChange={(v) => set('senha', v)} required />
            <Field label="Confirme a senha" type="password" value={form.confirmarSenha} onChange={(v) => set('confirmarSenha', v)} required />
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={aceitaPolitica}
              onChange={(e) => setAceitaPolitica(e.target.checked)}
              className="mt-0.5"
            />
            Li e aceito a Política de Privacidade.
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-medium py-2 transition"
          >
            {loading ? 'A criar conta…' : 'Começar teste grátis de 4 dias'}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-6 text-center">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-amber-400 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  )
}
