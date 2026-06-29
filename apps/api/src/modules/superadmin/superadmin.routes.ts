// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireSuperAdmin } from '../../shared/middleware/auth.js'
import { PLAN_LABEL, PLAN_PRICE } from '../../shared/utils/plan-limits.js'

const guard = { preHandler: [requireAuth, requireSuperAdmin] }

const updatePlanSchema = z.object({
  plan: z.enum(['trial', 'starter', 'pro', 'factory', 'enterprise']),
  trialEndsAt:  z.string().datetime().optional().nullable(),
  planExpiresAt: z.string().datetime().optional().nullable(),
})

export async function superadminRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/v1/superadmin/tenants — lista todos os tenants com uso
  app.get('/tenants', guard, async () => {
    const tenants = await app.prisma.tenant.findMany({
      select: {
        id: true, slug: true, name: true, plan: true,
        isActive: true, trialEndsAt: true, planExpiresAt: true, createdAt: true,
        _count: {
          select: {
            users: { where: { isActive: true } },
            operators: { where: { isActive: true } },
            serviceOrders: true,
            machines: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Ordens este mês por tenant (batch)
    const ordersThisMonth = await app.prisma.serviceOrder.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: monthStart }, status: { not: 'cancelled' } },
      _count: { id: true },
    })
    const ordersMap = Object.fromEntries(ordersThisMonth.map(o => [o.tenantId, o._count.id]))

    return tenants.map(t => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      plan: t.plan,
      planLabel: PLAN_LABEL[t.plan as keyof typeof PLAN_LABEL] ?? t.plan,
      planPrice: PLAN_PRICE[t.plan as keyof typeof PLAN_PRICE] ?? '—',
      isActive: t.isActive,
      trialEndsAt: t.trialEndsAt,
      planExpiresAt: t.planExpiresAt,
      trialExpired: t.plan === 'trial' && t.trialEndsAt ? new Date(t.trialEndsAt) < now : false,
      planExpired: t.planExpiresAt ? new Date(t.planExpiresAt) < now : false,
      createdAt: t.createdAt,
      usage: {
        users:      t._count.users,
        operators:  t._count.operators,
        machines:   t._count.machines,
        ordersTotal: t._count.serviceOrders,
        ordersMonth: ordersMap[t.id] ?? 0,
      },
    }))
  })

  // PATCH /api/v1/superadmin/tenants/:id/plan — alterar plano
  app.patch('/tenants/:id/plan', guard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updatePlanSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const tenant = await app.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const updated = await app.prisma.tenant.update({
      where: { id },
      data: {
        plan: body.data.plan as never,
        trialEndsAt:   body.data.trialEndsAt  !== undefined ? (body.data.trialEndsAt  ? new Date(body.data.trialEndsAt)  : null) : undefined,
        planExpiresAt: body.data.planExpiresAt !== undefined ? (body.data.planExpiresAt ? new Date(body.data.planExpiresAt) : null) : undefined,
      },
      select: { id: true, slug: true, plan: true, trialEndsAt: true, planExpiresAt: true },
    })

    return updated
  })

  // PATCH /api/v1/superadmin/tenants/:id/status — activar/desactivar tenant
  app.patch('/tenants/:id/status', guard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { isActive } = req.body as { isActive: boolean }

    const tenant = await app.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const updated = await app.prisma.tenant.update({
      where: { id },
      data: { isActive },
      select: { id: true, slug: true, isActive: true },
    })

    return updated
  })

  // POST /api/v1/superadmin/tenants/:id/extend-trial — extender trial N dias
  app.post('/tenants/:id/extend-trial', guard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { days } = req.body as { days: number }
    if (!days || days < 1 || days > 365) return reply.status(400).send({ error: 'Dias inválido (1–365)' })

    const tenant = await app.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const base = tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date()
      ? new Date(tenant.trialEndsAt)
      : new Date()
    const trialEndsAt = new Date(base.getTime() + days * 86400000)

    const updated = await app.prisma.tenant.update({
      where: { id },
      data: { trialEndsAt, plan: 'trial' as never },
      select: { id: true, slug: true, plan: true, trialEndsAt: true },
    })

    return updated
  })
}
