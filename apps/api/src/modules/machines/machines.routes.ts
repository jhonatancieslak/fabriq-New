// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'

const machineSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['laser_cnc', 'bending', 'guillotine']),
  model: z.string().optional(),
  serial: z.string().optional(),
})

export async function machinesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, async (req) => {
    return app.prisma.machine.findMany({
      where: { tenantId: req.tenantId!, isActive: true },
      orderBy: { name: 'asc' },
    })
  })

  app.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const body = machineSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const machine = await app.prisma.machine.create({ data: { ...body.data, tenantId: req.tenantId! } })
    return reply.status(201).send(machine)
  })

  app.patch('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = machineSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const exists = await app.prisma.machine.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Máquina não encontrada' })
    return app.prisma.machine.update({ where: { id }, data: body.data })
  })
}
