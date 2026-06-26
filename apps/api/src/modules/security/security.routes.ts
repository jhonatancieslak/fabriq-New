// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../shared/middleware/auth.js'

export async function securityRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /api/v1/security/login-attempts ─────────────────────────────────────
  // Admin do tenant: vê tentativas de login da sua empresa
  app.get('/login-attempts', { preHandler: [requireAuth] }, async (req, reply) => {
    const { page = '1', limit = '50', success, startDate, endDate } = req.query as Record<string, string>
    const tenantId = req.tenantId
    if (!tenantId) return reply.status(400).send({ error: 'Tenant não identificado' })

    const take = Math.min(Number(limit), 200)
    const skip = (Number(page) - 1) * take

    const where: Record<string, unknown> = { tenantId }
    if (success !== undefined) where.success = success === 'true'
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate   ? { lte: new Date(endDate)   } : {}),
      }
    }

    const [attempts, total] = await Promise.all([
      app.prisma.loginAttempt.findMany({
        where, take, skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, success: true,
          ipAddress: true, userAgent: true, failureReason: true, createdAt: true,
          user: { select: { name: true } },
        },
      }),
      app.prisma.loginAttempt.count({ where }),
    ])

    return reply.send({ attempts, total, page: Number(page), pages: Math.ceil(total / take) })
  })

  // ── GET /api/v1/security/blocked-ips ─────────────────────────────────────────
  app.get('/blocked-ips', { preHandler: [requireAuth] }, async (req, reply) => {
    const tenantId = req.tenantId
    if (!tenantId) return reply.status(400).send({ error: 'Tenant não identificado' })

    const blocked = await app.prisma.blockedIp.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(blocked)
  })

  // ── POST /api/v1/security/block-ip ───────────────────────────────────────────
  app.post('/block-ip', { preHandler: [requireAuth] }, async (req, reply) => {
    if (req.userRole !== 'admin') return reply.status(403).send({ error: 'Sem permissão' })

    const { ipAddress, reason, expiresAt } = req.body as {
      ipAddress: string; reason?: string; expiresAt?: string
    }
    if (!ipAddress) return reply.status(400).send({ error: 'ipAddress obrigatório' })

    const block = await app.prisma.blockedIp.upsert({
      where:  { ipAddress },
      create: {
        ipAddress, reason,
        blockedBy:   req.userId,
        tenantId:    req.tenantId,
        isAutoBlock: false,
        expiresAt:   expiresAt ? new Date(expiresAt) : null,
      },
      update: {
        reason,
        blockedBy:   req.userId,
        isAutoBlock: false,
        expiresAt:   expiresAt ? new Date(expiresAt) : null,
      },
    })
    return reply.status(201).send(block)
  })

  // ── DELETE /api/v1/security/block-ip/:ip ─────────────────────────────────────
  app.delete('/block-ip/:ip', { preHandler: [requireAuth] }, async (req, reply) => {
    if (req.userRole !== 'admin') return reply.status(403).send({ error: 'Sem permissão' })

    const { ip } = req.params as { ip: string }
    await app.prisma.blockedIp.deleteMany({ where: { ipAddress: ip } })
    return reply.status(204).send()
  })

  // ── GET /api/v1/security/stats ────────────────────────────────────────────────
  // Resumo para dashboard de segurança
  app.get('/stats', { preHandler: [requireAuth] }, async (req, reply) => {
    const tenantId = req.tenantId
    if (!tenantId) return reply.status(400).send({ error: 'Tenant não identificado' })

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)

    const [
      total24h, failures24h, total7d, failures7d,
      topFailedIps, blockedCount,
    ] = await Promise.all([
      app.prisma.loginAttempt.count({ where: { tenantId, createdAt: { gte: since24h } } }),
      app.prisma.loginAttempt.count({ where: { tenantId, success: false, createdAt: { gte: since24h } } }),
      app.prisma.loginAttempt.count({ where: { tenantId, createdAt: { gte: since7d } } }),
      app.prisma.loginAttempt.count({ where: { tenantId, success: false, createdAt: { gte: since7d } } }),
      app.prisma.loginAttempt.groupBy({
        by: ['ipAddress'],
        where: { tenantId, success: false, createdAt: { gte: since24h } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      app.prisma.blockedIp.count({ where: { OR: [{ tenantId }, { tenantId: null }] } }),
    ])

    return reply.send({
      last24h:   { total: total24h,   failures: failures24h },
      last7d:    { total: total7d,    failures: failures7d  },
      topFailedIps: topFailedIps.map(r => ({ ip: r.ipAddress, count: r._count.id })),
      blockedCount,
    })
  })
}
