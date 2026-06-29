// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { PrismaClient } from '@prisma/client'
import { getLimits, isUnlimited } from './plan-limits.js'

type Resource = 'order' | 'operator' | 'user' | 'machine'

interface CheckResult { allowed: boolean; error?: string; code?: string }

export async function checkPlanLimit(
  prisma: PrismaClient,
  tenantId: string,
  resource: Resource,
): Promise<CheckResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, trialEndsAt: true, planExpiresAt: true },
  })
  if (!tenant) return { allowed: false, error: 'Tenant não encontrado', code: 'NO_TENANT' }

  const plan = tenant.plan as string
  const limits = getLimits(plan)
  const now = new Date()

  if (plan === 'trial' && tenant.trialEndsAt && new Date(tenant.trialEndsAt) < now) {
    return { allowed: false, error: 'O período de trial terminou. Faça upgrade para continuar.', code: 'TRIAL_EXPIRED' }
  }

  if (tenant.planExpiresAt && new Date(tenant.planExpiresAt) < now) {
    return { allowed: false, error: 'A subscrição expirou. Renove o plano para continuar.', code: 'PLAN_EXPIRED' }
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  if (resource === 'order') {
    if (plan === 'trial' && limits.ordersTotal != null) {
      const total = await prisma.serviceOrder.count({ where: { tenantId, status: { not: 'cancelled' } } })
      if (total >= limits.ordersTotal) {
        return { allowed: false, error: `Limite de ${limits.ordersTotal} ordens do Trial atingido. Faça upgrade para continuar.`, code: 'LIMIT_ORDERS_TOTAL' }
      }
    } else if (!isUnlimited(limits.ordersPerMonth)) {
      const count = await prisma.serviceOrder.count({
        where: { tenantId, createdAt: { gte: monthStart }, status: { not: 'cancelled' } },
      })
      if (count >= limits.ordersPerMonth!) {
        return { allowed: false, error: `Limite de ${limits.ordersPerMonth} ordens/mês atingido. Faça upgrade para continuar.`, code: 'LIMIT_ORDERS_MONTH' }
      }
    }
  }

  if (resource === 'operator' && !isUnlimited(limits.maxOperators)) {
    const count = await prisma.operator.count({ where: { tenantId, isActive: true } })
    if (count >= limits.maxOperators!) {
      return { allowed: false, error: `Limite de ${limits.maxOperators} operadores do plano atingido.`, code: 'LIMIT_OPERATORS' }
    }
  }

  if (resource === 'user' && !isUnlimited(limits.maxAdminUsers)) {
    const count = await prisma.user.count({ where: { tenantId, isActive: true } })
    if (count >= limits.maxAdminUsers!) {
      return { allowed: false, error: `Limite de ${limits.maxAdminUsers} utilizadores do plano atingido.`, code: 'LIMIT_USERS' }
    }
  }

  if (resource === 'machine' && !isUnlimited(limits.maxMachines)) {
    const count = await prisma.machine.count({ where: { tenantId, isActive: true } })
    if (count >= limits.maxMachines!) {
      return { allowed: false, error: `Limite de ${limits.maxMachines} máquinas do plano atingido.`, code: 'LIMIT_MACHINES' }
    }
  }

  return { allowed: true }
}
