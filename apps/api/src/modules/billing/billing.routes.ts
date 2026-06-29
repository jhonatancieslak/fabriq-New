// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { getLimits, PLAN_LABEL, PLAN_PRICE, isUnlimited } from '../../shared/utils/plan-limits.js'
import { stripe, createCheckoutSession, createPortalSession, handleWebhookEvent, PLAN_TO_PRICE } from './stripe.service.js'

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

  // POST /api/v1/billing/checkout — criar Checkout Session para upgrade
  app.post('/checkout', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { plan } = req.body as { plan: 'starter' | 'pro' | 'factory' }
    const tenantId = req.tenantId!

    if (!['starter', 'pro', 'factory'].includes(plan)) {
      return reply.status(400).send({ error: 'Plano inválido' })
    }
    if (!PLAN_TO_PRICE[plan]) {
      return reply.status(503).send({ error: 'Stripe não configurado. Configure STRIPE_PRICE_* no servidor.' })
    }

    const appUrl = process.env.APP_URL ?? 'https://sistema.fabriq.pt'
    const url = await createCheckoutSession(
      app.prisma, tenantId, plan,
      `${appUrl}/billing?success=1`,
      `${appUrl}/billing?cancelled=1`,
    )

    return { url }
  })

  // POST /api/v1/billing/portal — Customer Portal (gerir subscrição, cancelar, mudar plano)
  app.post('/portal', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const tenantId = req.tenantId!
    const appUrl = process.env.APP_URL ?? 'https://sistema.fabriq.pt'

    const tenant = await app.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeCustomerId: true },
    })
    if (!tenant?.stripeCustomerId) {
      return reply.status(400).send({ error: 'Sem subscrição activa no Stripe' })
    }

    const url = await createPortalSession(app.prisma, tenantId, `${appUrl}/billing`)
    return { url }
  })

  // POST /api/v1/billing/webhook — receber eventos do Stripe (sem auth — verificado por assinatura)
  app.post('/webhook', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const sig = req.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event: any
    try {
      if (webhookSecret && sig) {
        const rawBody = (req as any).rawBody ?? JSON.stringify(req.body)
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
      } else {
        // Sem secret configurado — aceitar sem verificar (apenas em desenvolvimento)
        event = req.body as any
      }
    } catch (err: any) {
      return reply.status(400).send({ error: `Webhook Error: ${err.message}` })
    }

    await handleWebhookEvent(app.prisma, event)
    return { received: true }
  })

  // GET /api/v1/billing/plans — listar planos disponíveis com preços
  app.get('/plans', async () => {
    return {
      plans: [
        { id: 'starter', label: 'Starter', price: 49,  priceId: PLAN_TO_PRICE.starter, features: ['150 ordens/mês', '5 operadores', '3 admins', '1 máquina'] },
        { id: 'pro',     label: 'Pro',     price: 99,  priceId: PLAN_TO_PRICE.pro,     features: ['Ilimitado ordens', '20 operadores', '10 admins', '3 máquinas'] },
        { id: 'factory', label: 'Factory', price: 199, priceId: PLAN_TO_PRICE.factory, features: ['Tudo ilimitado', 'Suporte prioritário'] },
      ]
    }
  })
}
