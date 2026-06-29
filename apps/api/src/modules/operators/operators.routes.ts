// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { hashPassword } from '../../shared/utils/crypto.js'
import { audit } from '../../shared/utils/audit.js'
import { checkPlanLimit } from '../../shared/utils/check-plan.js'

const operatorSchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(50).regex(/^[a-z0-9._-]+$/),
  password: z.string().min(6),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  machineId: z.string().uuid().optional(),
})

export async function operatorsRoutes(app: FastifyInstance): Promise<void> {
  const adminGuard = { preHandler: [requireAuth, requireRole('admin')] }

  app.get('/', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req) => {
    return app.prisma.operator.findMany({
      where: { tenantId: req.tenantId!, isActive: true },
      select: { id: true, name: true, username: true, phone: true, email: true, machineId: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
  })

  app.get('/:id', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const op = await app.prisma.operator.findFirst({
      where: { id, tenantId: req.tenantId!, isActive: true },
      select: { id: true, name: true, username: true, phone: true, email: true, machineId: true },
    })
    if (!op) return reply.status(404).send({ error: 'Operador não encontrado' })
    return op
  })

  app.post('/', adminGuard, async (req, reply) => {
    const planCheck = await checkPlanLimit(app.prisma, req.tenantId!, 'operator')
    if (!planCheck.allowed) return reply.status(402).send({ error: planCheck.error, code: planCheck.code })

    const body = operatorSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.operator.findFirst({
      where: { username: body.data.username, tenantId: req.tenantId! },
    })
    if (exists) return reply.status(409).send({ error: 'Username já existe nesta empresa' })

    const passwordHash = await hashPassword(body.data.password)
    const { password: _, ...data } = body.data

    const operator = await app.prisma.operator.create({
      data: { ...data, passwordHash, tenantId: req.tenantId! },
      select: { id: true, name: true, username: true, phone: true, email: true, machineId: true },
    })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'operator.created', entityType: 'operator', entityId: operator.id })
    return reply.status(201).send(operator)
  })

  app.patch('/:id', adminGuard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = operatorSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.operator.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Operador não encontrado' })

    const { password, ...rest } = body.data
    const data: Record<string, unknown> = { ...rest }
    if (password) data.passwordHash = await hashPassword(password)

    const operator = await app.prisma.operator.update({
      where: { id },
      data,
      select: { id: true, name: true, username: true, phone: true, email: true },
    })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'operator.updated', entityType: 'operator', entityId: id })
    return operator
  })

  app.delete('/:id', adminGuard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const exists = await app.prisma.operator.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Operador não encontrado' })

    // soft delete
    await app.prisma.operator.update({ where: { id }, data: { isActive: false } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'operator.deactivated', entityType: 'operator', entityId: id })
    return reply.status(204).send()
  })
}
