// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { hashPassword } from '../../shared/utils/crypto.js'
import { audit } from '../../shared/utils/audit.js'
import { checkPlanLimit } from '../../shared/utils/check-plan.js'

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'financial', 'requester', 'viewer']),
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'financial', 'requester', 'viewer']).optional(),
  isActive: z.boolean().optional(),
})

const changePasswordSchema = z.object({
  password: z.string().min(8),
})

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  const adminGuard = { preHandler: [requireAuth, requireRole('admin')] }

  // List users of the tenant
  app.get('/', { preHandler: [requireAuth, requireRole('admin')] }, async (req) => {
    return app.prisma.user.findMany({
      where: { tenantId: req.tenantId! },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: { name: 'asc' },
    })
  })

  // Get single user
  app.get('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = await app.prisma.user.findFirst({
      where: { id, tenantId: req.tenantId! },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, lastLoginAt: true, createdAt: true,
      },
    })
    if (!user) return reply.status(404).send({ error: 'Utilizador não encontrado' })
    return user
  })

  // Create user
  app.post('/', adminGuard, async (req, reply) => {
    const planCheck = await checkPlanLimit(app.prisma, req.tenantId!, 'user')
    if (!planCheck.allowed) return reply.status(402).send({ error: planCheck.error, code: planCheck.code })

    const body = createUserSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.user.findFirst({
      where: { email: body.data.email, tenantId: req.tenantId! },
    })
    if (exists) return reply.status(409).send({ error: 'Email já existe nesta empresa' })

    const passwordHash = await hashPassword(body.data.password)
    const { password: _, ...data } = body.data

    const user = await app.prisma.user.create({
      data: { ...data, passwordHash, tenantId: req.tenantId! },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    await audit({
      prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'user.created', entityType: 'user', entityId: user.id,
    })

    return reply.status(201).send(user)
  })

  // Update user
  app.patch('/:id', adminGuard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateUserSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const existing = await app.prisma.user.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!existing) return reply.status(404).send({ error: 'Utilizador não encontrado' })

    // Prevent removing last active admin
    if (body.data.role && body.data.role !== 'admin' && existing.role === 'admin') {
      const adminCount = await app.prisma.user.count({
        where: { tenantId: req.tenantId!, role: 'admin', isActive: true },
      })
      if (adminCount <= 1) {
        return reply.status(400).send({ error: 'Deve existir pelo menos um admin activo' })
      }
    }

    if (body.data.email && body.data.email !== existing.email) {
      const emailExists = await app.prisma.user.findFirst({
        where: { email: body.data.email, tenantId: req.tenantId!, id: { not: id } },
      })
      if (emailExists) return reply.status(409).send({ error: 'Email já existe nesta empresa' })
    }

    const user = await app.prisma.user.update({
      where: { id },
      data: body.data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    await audit({
      prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'user.updated', entityType: 'user', entityId: id,
    })

    return user
  })

  // Change password (admin resets another user's password)
  app.patch('/:id/password', adminGuard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = changePasswordSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const existing = await app.prisma.user.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!existing) return reply.status(404).send({ error: 'Utilizador não encontrado' })

    const passwordHash = await hashPassword(body.data.password)
    await app.prisma.user.update({ where: { id }, data: { passwordHash } })

    // Revoke all refresh tokens so user is forced to re-login
    await app.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    await audit({
      prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'user.password_reset', entityType: 'user', entityId: id,
    })

    return { ok: true }
  })

  // Deactivate / reactivate user
  app.delete('/:id', adminGuard, async (req, reply) => {
    const { id } = req.params as { id: string }

    if (id === req.userId) {
      return reply.status(400).send({ error: 'Não pode desactivar a sua própria conta' })
    }

    const existing = await app.prisma.user.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!existing) return reply.status(404).send({ error: 'Utilizador não encontrado' })

    if (existing.role === 'admin' && existing.isActive) {
      const adminCount = await app.prisma.user.count({
        where: { tenantId: req.tenantId!, role: 'admin', isActive: true },
      })
      if (adminCount <= 1) {
        return reply.status(400).send({ error: 'Deve existir pelo menos um admin activo' })
      }
    }

    const user = await app.prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: { id: true, isActive: true },
    })

    await audit({
      prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: existing.isActive ? 'user.deactivated' : 'user.reactivated',
      entityType: 'user', entityId: id,
    })

    return user
  })
}
