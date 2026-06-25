// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { loginSchema, operatorLoginSchema, refreshSchema } from './auth.schema.js'
import { loginUser, loginOperator, refreshAccessToken, revokeRefreshToken } from './auth.service.js'
import { resolveTenant } from '../../shared/middleware/tenant.js'
import { audit } from '../../shared/utils/audit.js'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/login — admin/user login
  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      await resolveTenant(req, reply)
      if (!req.tenantId) return reply.status(400).send({ error: 'Tenant not identified' })

      const body = loginSchema.safeParse(req.body)
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

      try {
        const result = await loginUser(app, body.data.email, body.data.password, req.tenantId)
        await audit({
          prisma: app.prisma, req, tenantId: req.tenantId,
          userId: result.user.id, action: 'auth.login',
          payload: { email: body.data.email },
        })
        return reply.send(result)
      } catch {
        await audit({
          prisma: app.prisma, req, tenantId: req.tenantId,
          action: 'auth.login.failed', payload: { email: body.data.email },
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
}
