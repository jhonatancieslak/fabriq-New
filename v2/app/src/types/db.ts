export type UserRole = 'admin' | 'gestor' | 'vendedor' | 'operador'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'blocked' | 'canceled'

export interface Company {
  id: string
  razao_social: string
  nome_fantasia: string | null
  nif: string
  maquina_potencia: string | null
  maquina_dimensao: string | null
  locale: string
  currency: string
  logo_url: string | null
  tema: string
}

export interface Subscription {
  id: string
  company_id: string
  plano: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_end: string | null
}

export interface AppUser {
  id: string
  company_id: string
  nome_completo: string
  email: string
  telefone: string | null
  role: UserRole
}
