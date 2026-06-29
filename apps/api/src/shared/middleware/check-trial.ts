// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Middleware que verifica se o tenant pode operar:
 *  - plan === 'trial' e trialEndsAt < now → 402 trial_expired
 *  - plan !== 'trial' e isActive === false → 402 subscription_inactive
 *
 * Deve ser usado como preHandler em rotas protegidas, depois de requireAuth.
 */
export async function checkTrial(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tenantId = req.tenantId
  if (!tenantId) return // sem tenant (operador, etc.) — deixar passar

  const tenant = await (req.server as any).prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, trialEndsAt: true, isActive: true },
  })

  if (!tenant) return

  const now = new Date()

  if (tenant.plan === 'trial' && tenant.trialEndsAt && new Date(tenant.trialEndsAt) < now) {
    return reply.status(402).send({
      error: 'trial_expired',
      message: 'O período de trial terminou. Activa um plano para continuar a usar o FABRIQ.IA.',
    })
  }

  if (tenant.plan !== 'trial' && !tenant.isActive) {
    return reply.status(402).send({
      error: 'subscription_inactive',
      message: 'A subscrição está inactiva. Renova o plano para continuar.',
    })
  }
}
