// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { loginSchema, operatorLoginSchema, refreshSchema } from './auth.schema.js'
import { loginUser, loginOperator, refreshAccessToken, revokeRefreshToken } from './auth.service.js'
import { resolveTenant } from '../../shared/middleware/tenant.js'
import { requireAuth } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'
import { recordLoginAttempt, isIpBlocked } from '../../shared/utils/security.js'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/login — admin/user login (tenant auto-detectado pelo email)
  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      const body = loginSchema.safeParse(req.body)
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

      // Verificar IP bloqueado
      const ipCheck = await isIpBlocked(app.prisma, req.ip)
      if (ipCheck.blocked) {
        await recordLoginAttempt(app.prisma, req, {
          email: body.data.email, success: false, failureReason: 'ip_blocked',
        })
        return reply.status(403).send({ error: 'Acesso bloqueado. Contacte o administrador.' })
      }

      try {
        const result = await loginUser(app, body.data.email, body.data.password)

        await Promise.all([
          recordLoginAttempt(app.prisma, req, {
            email: body.data.email, success: true,
            tenantId: result.tenant.id, userId: result.user.id,
          }),
          audit({
            prisma: app.prisma, req, tenantId: result.tenant.id,
            userId: result.user.id, action: 'auth.login',
            payload: { email: body.data.email, tenant: result.tenant.slug },
          }),
        ])

        return reply.send(result)
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'unknown'
        await recordLoginAttempt(app.prisma, req, {
          email: body.data.email, success: false,
          failureReason: reason === 'INVALID_CREDENTIALS' ? 'invalid_credentials' : reason,
        })
        return reply.status(401).send({ error: 'Credenciais inválidas' })
      }
    },
  })

  // POST /api/v1/auth/operator/token — operator login (PWA)
  app.post('/operator/token', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      const body = operatorLoginSchema.safeParse(req.body)
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

      try {
        const result = await loginOperator(
          app, body.data.username, body.data.password, body.data.tenantSlug,
        )
        await audit({
          prisma: app.prisma, req, action: 'auth.operator.login',
          operatorId: result.operator.id, payload: { username: body.data.username },
        })
        return reply.send(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'TENANT_NOT_FOUND') return reply.status(404).send({ error: 'Empresa não encontrada' })
        return reply.status(401).send({ error: 'Credenciais inválidas' })
      }
    },
  })

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const body = refreshSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: 'refreshToken obrigatório' })

    try {
      const tokens = await refreshAccessToken(app, body.data.refreshToken)
      return reply.send(tokens)
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
  })

  // POST /api/v1/auth/logout
  app.post('/logout', async (req, reply) => {
    const body = req.body as { refreshToken?: string }
    if (body?.refreshToken) {
      await revokeRefreshToken(app, body.refreshToken)
    }
    return reply.send({ ok: true })
  })

  // GET /api/v1/auth/session — sessão actual (utilizador, tenant, estado do plano), sem gate de role
  // (GET /billing exige admin/financial — esta rota serve qualquer utilizador autenticado, ex: app desktop)
  app.get('/session', { preHandler: [requireAuth] }, async (req, reply) => {
    const tenant = await app.prisma.tenant.findUnique({
      where: { id: req.tenantId! },
      select: { id: true, slug: true, name: true, plan: true, trialEndsAt: true, planExpiresAt: true },
    })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const now = new Date()
    const isTrial = tenant.plan === 'trial'
    const trialExpired = isTrial && tenant.trialEndsAt ? new Date(tenant.trialEndsAt) < now : false
    const planExpired = tenant.planExpiresAt ? new Date(tenant.planExpiresAt) < now : false

    return {
      tenant: {
        id: tenant.id, slug: tenant.slug, name: tenant.name,
        plan: tenant.plan, planExpiresAt: tenant.planExpiresAt, planExpired,
        serial: tenant.id.slice(0, 8).toUpperCase(),
      },
      trial: { isTrialPlan: isTrial, expiresAt: tenant.trialEndsAt, expired: trialExpired },
    }
  })
}
