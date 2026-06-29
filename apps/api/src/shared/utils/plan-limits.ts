// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

export type Plan = 'trial' | 'starter' | 'pro' | 'factory' | 'enterprise'

export interface PlanLimits {
  ordersPerMonth: number | null  // null = ilimitado
  maxOperators: number | null
  maxAdminUsers: number | null
  maxMachines: number | null
  // trial usa ordersTotal em vez de ordersPerMonth
  ordersTotal?: number | null
  trialDays?: number
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  trial: {
    ordersPerMonth: null,
    ordersTotal: 20,
    maxOperators: 3,
    maxAdminUsers: 2,
    maxMachines: 1,
    trialDays: 14,
  },
  starter: {
    ordersPerMonth: 150,
    maxOperators: 5,
    maxAdminUsers: 3,
    maxMachines: 1,
  },
  pro: {
    ordersPerMonth: null,
    maxOperators: 20,
    maxAdminUsers: 10,
    maxMachines: 3,
  },
  factory: {
    ordersPerMonth: null,
    maxOperators: null,
    maxAdminUsers: null,
    maxMachines: null,
  },
  enterprise: {
    ordersPerMonth: null,
    maxOperators: null,
    maxAdminUsers: null,
    maxMachines: null,
  },
}

export const PLAN_PRICE: Record<Plan, string> = {
  trial:      'Grátis (14 dias)',
  starter:    '49€/mês',
  pro:        '99€/mês',
  factory:    '199€/mês',
  enterprise: 'Sob consulta',
}

export const PLAN_LABEL: Record<Plan, string> = {
  trial:      'Trial',
  starter:    'Starter',
  pro:        'Pro',
  factory:    'Factory',
  enterprise: 'Enterprise',
}

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.starter
}

export function isUnlimited(val: number | null): val is null {
  return val === null
}
