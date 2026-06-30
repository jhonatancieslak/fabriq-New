// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'

const requesterSchema = z.object({
  name:            z.string().min(1).max(200),
  email:           z.string().email().optional(),
  phone:           z.string().optional(),
  notifyWhatsapp:  z.boolean().optional().default(true),
  notifyEmail:     z.boolean().optional().default(true),
})

export async function requestersRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: [requireAuth, requireRole('admin', 'requester', 'viewer')] }
  const adminGuard = { preHandler: [requireAuth, requireRole('admin')] }

  app.get('/', guard, async (req) => {
    return app.prisma.requester.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { name: 'asc' },
    })
  })

  app.post('/', adminGuard, async (req, reply) => {
    const body = requesterSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const requester = await app.prisma.requester.create({
      data: { ...body.data, tenantId: req.tenantId! },
    })
    return reply.status(201).send(requester)
  })

  app.patch('/:id', adminGuard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = requesterSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.requester.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Solicitador não encontrado' })

    return app.prisma.requester.update({ where: { id }, data: body.data })
  })

  app.delete('/:id', adminGuard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const exists = await app.prisma.requester.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Solicitador não encontrado' })

    await app.prisma.requester.delete({ where: { id } })
    return reply.status(204).send()
  })
}
