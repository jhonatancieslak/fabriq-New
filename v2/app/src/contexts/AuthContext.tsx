import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { AppUser, Company, Subscription } from '../types/db'

interface AuthState {
  session: Session | null
  appUser: AppUser | null
  company: Company | null
  subscription: Subscription | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  async function completePendingSignup(currentSession: Session) {
    const raw = localStorage.getItem('fabriq_pending_signup')
    if (!raw) return

    try {
      const pending = JSON.parse(raw)
      if (pending.email !== currentSession.user.email) return

      const { error } = await supabase.rpc('signup_company', {
        p_razao_social: pending.razaoSocial,
        p_nif: pending.nif,
        p_maquina_potencia: pending.maquinaPotencia,
        p_maquina_dimensao: pending.maquinaDimensao,
        p_nome_completo: pending.nomeCompleto,
        p_telefone: pending.telefone,
      })

      if (!error) localStorage.removeItem('fabriq_pending_signup')
    } catch {
      // dados corrompidos — ignora, utilizador terá de contactar suporte
    }
  }

  async function loadProfile(currentSession: Session | null) {
    if (!currentSession) {
      setAppUser(null)
      setCompany(null)
      setSubscription(null)
      return
    }

    let { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentSession.user.id)
      .maybeSingle()

    if (!userRow) {
      await completePendingSignup(currentSession)
      const retry = await supabase.from('users').select('*').eq('id', currentSession.user.id).maybeSingle()
      userRow = retry.data
    }

    if (!userRow) {
      setAppUser(null)
      setCompany(null)
      setSubscription(null)
      return
    }

    setAppUser(userRow as AppUser)

    const [{ data: companyRow }, { data: subRow }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', userRow.company_id).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('company_id', userRow.company_id).maybeSingle(),
    ])

    setCompany((companyRow as Company) ?? null)
    setSubscription((subRow as Subscription) ?? null)
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await loadProfile(data.session)
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, appUser, company, subscription, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
