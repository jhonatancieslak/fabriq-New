// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'

const materialSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['steel', 'stainless', 'aluminum', 'copper', 'brass', 'other']),
})

export async function materialsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, async (req) => {
    return app.prisma.material.findMany({
      where: { tenantId: req.tenantId!, isActive: true },
      orderBy: { name: 'asc' },
    })
  })

  app.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const body = materialSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const mat = await app.prisma.material.create({ data: { ...body.data, tenantId: req.tenantId! } })
    return reply.status(201).send(mat)
  })

  app.patch('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = materialSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const exists = await app.prisma.material.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Material não encontrado' })
    return app.prisma.material.update({ where: { id }, data: body.data })
  })
}
