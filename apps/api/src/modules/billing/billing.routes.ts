// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { getLimits, PLAN_LABEL, PLAN_PRICE, isUnlimited } from '../../shared/utils/plan-limits.js'

export async function billingRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/v1/billing — uso actual vs limites do plano
  app.get('/', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req, reply) => {
    const tenantId = req.tenantId!

    const tenant = await app.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true, planExpiresAt: true, createdAt: true },
    })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const plan = tenant.plan as string
    const limits = getLimits(plan)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Contagem actual
    const [operatorsCount, adminUsersCount, machinesCount, ordersThisMonth, ordersTotal] = await Promise.all([
      app.prisma.operator.count({ where: { tenantId, isActive: true } }),
      app.prisma.user.count({ where: { tenantId, isActive: true } }),
      app.prisma.machine.count({ where: { tenantId, isActive: true } }),
      app.prisma.serviceOrder.count({
        where: { tenantId, createdAt: { gte: monthStart }, status: { not: 'cancelled' } },
      }),
      app.prisma.serviceOrder.count({
        where: { tenantId, status: { not: 'cancelled' } },
      }),
    ])

    // Estado do trial
    const isTrial = plan === 'trial'
    const trialExpired = isTrial && tenant.trialEndsAt ? new Date(tenant.trialEndsAt) < now : false
    const trialDaysLeft = isTrial && tenant.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - now.getTime()) / 86400000))
      : null

    // Verificar se o plano expirou
    const planExpired = tenant.planExpiresAt ? new Date(tenant.planExpiresAt) < now : false

    return {
      plan,
      planLabel: PLAN_LABEL[plan as keyof typeof PLAN_LABEL] ?? plan,
      planPrice: PLAN_PRICE[plan as keyof typeof PLAN_PRICE] ?? '—',
      planExpiresAt: tenant.planExpiresAt,
      planExpired,
      trial: isTrial ? {
        endsAt: tenant.trialEndsAt,
        daysLeft: trialDaysLeft,
        expired: trialExpired,
      } : null,
      usage: {
        operators:    { current: operatorsCount,   limit: limits.maxOperators,    unlimited: isUnlimited(limits.maxOperators) },
        adminUsers:   { current: adminUsersCount,   limit: limits.maxAdminUsers,   unlimited: isUnlimited(limits.maxAdminUsers) },
        machines:     { current: machinesCount,     limit: limits.maxMachines,     unlimited: isUnlimited(limits.maxMachines) },
        ordersMonth:  { current: ordersThisMonth,   limit: limits.ordersPerMonth,  unlimited: isUnlimited(limits.ordersPerMonth) },
        ...(isTrial ? { ordersTotal: { current: ordersTotal, limit: limits.ordersTotal ?? 20, unlimited: false } } : {}),
      },
    }
  })

  // POST /api/v1/billing/check — verificar se uma acção é permitida pelo plano (uso interno)
  app.post('/check', { preHandler: [requireAuth] }, async (req, reply) => {
    const { resource } = req.body as { resource: 'order' | 'operator' | 'user' | 'machine' }
    const tenantId = req.tenantId!

    const tenant = await app.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true, planExpiresAt: true },
    })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const plan = tenant.plan as string
    const limits = getLimits(plan)
    const now = new Date()

    // Trial expirado — bloquear tudo
    if (plan === 'trial' && tenant.trialEndsAt && new Date(tenant.trialEndsAt) < now) {
      return reply.status(402).send({ error: 'O período de trial terminou. Faça upgrade para continuar.', code: 'TRIAL_EXPIRED' })
    }

    // Plano expirado — bloquear criação
    if (tenant.planExpiresAt && new Date(tenant.planExpiresAt) < now) {
      return reply.status(402).send({ error: 'A subscrição expirou. Renove para continuar.', code: 'PLAN_EXPIRED' })
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    if (resource === 'order') {
      if (plan === 'trial' && limits.ordersTotal != null) {
        const total = await app.prisma.serviceOrder.count({ where: { tenantId, status: { not: 'cancelled' } } })
        if (total >= limits.ordersTotal) {
          return reply.status(402).send({ error: `Limite de ${limits.ordersTotal} ordens do Trial atingido. Faça upgrade para continuar.`, code: 'LIMIT_ORDERS_TOTAL' })
        }
      } else if (limits.ordersPerMonth != null) {
        const count = await app.prisma.serviceOrder.count({
          where: { tenantId, createdAt: { gte: monthStart }, status: { not: 'cancelled' } },
        })
        if (count >= limits.ordersPerMonth) {
          return reply.status(402).send({ error: `Limite de ${limits.ordersPerMonth} ordens/mês atingido. Faça upgrade para continuar.`, code: 'LIMIT_ORDERS_MONTH' })
        }
      }
    }

    if (resource === 'operator' && limits.maxOperators != null) {
      const count = await app.prisma.operator.count({ where: { tenantId, isActive: true } })
      if (count >= limits.maxOperators) {
        return reply.status(402).send({ error: `Limite de ${limits.maxOperators} operadores do plano atingido.`, code: 'LIMIT_OPERATORS' })
      }
    }

    if (resource === 'user' && limits.maxAdminUsers != null) {
      const count = await app.prisma.user.count({ where: { tenantId, isActive: true } })
      if (count >= limits.maxAdminUsers) {
        return reply.status(402).send({ error: `Limite de ${limits.maxAdminUsers} utilizadores do plano atingido.`, code: 'LIMIT_USERS' })
      }
    }

    if (resource === 'machine' && limits.maxMachines != null) {
      const count = await app.prisma.machine.count({ where: { tenantId, isActive: true } })
      if (count >= limits.maxMachines) {
        return reply.status(402).send({ error: `Limite de ${limits.maxMachines} máquinas do plano atingido.`, code: 'LIMIT_MACHINES' })
      }
    }

    return { allowed: true }
  })
}
