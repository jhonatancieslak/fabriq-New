// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'

const clientSchema = z.object({
  name: z.string().min(1).max(200),
  taxId: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export async function clientsRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: [requireAuth, requireRole('admin', 'financial', 'viewer')] }

  // GET /api/v1/clients
  app.get('/', guard, async (req) => {
    const { search } = req.query as { search?: string }
    return app.prisma.client.findMany({
      where: {
        tenantId: req.tenantId!,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    })
  })

  // GET /api/v1/clients/:id
  app.get('/:id', guard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const client = await app.prisma.client.findFirst({
      where: { id, tenantId: req.tenantId! },
      include: { projects: { orderBy: { createdAt: 'desc' } } },
    })
    if (!client) return reply.status(404).send({ error: 'Cliente não encontrado' })
    return client
  })

  // POST /api/v1/clients
  app.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const body = clientSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const client = await app.prisma.client.create({
      data: { ...body.data, tenantId: req.tenantId! },
    })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'client.created', entityType: 'client', entityId: client.id })
    return reply.status(201).send(client)
  })

  // PATCH /api/v1/clients/:id
  app.patch('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = clientSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.client.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Cliente não encontrado' })

    const client = await app.prisma.client.update({ where: { id }, data: body.data })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'client.updated', entityType: 'client', entityId: id })
    return client
  })

  // DELETE /api/v1/clients/:id
  app.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const exists = await app.prisma.client.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Cliente não encontrado' })

    // Verificar dependências
    const [ordersCount, projectsCount] = await Promise.all([
      app.prisma.serviceOrder.count({ where: { clientId: id, tenantId: req.tenantId! } }),
      app.prisma.project.count({ where: { clientId: id, tenantId: req.tenantId! } }),
    ])
    if (ordersCount > 0 || projectsCount > 0) {
      return reply.status(409).send({
        error: `Não é possível remover: cliente tem ${ordersCount} ordem(ns) e ${projectsCount} obra(s) associadas. Remova-as primeiro.`,
      })
    }

    await app.prisma.client.delete({ where: { id } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'client.deleted', entityType: 'client', entityId: id })
    return reply.status(204).send()
  })
}
