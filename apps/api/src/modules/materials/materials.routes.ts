// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'

const MATERIAL_TYPES = ['steel', 'stainless', 'aluminum', 'copper', 'brass', 'other'] as const

const materialSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(MATERIAL_TYPES),
  costPerKg: z.number().positive().optional().nullable(),
  costPerM2: z.number().positive().optional().nullable(),
})

export async function materialsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/materials — search + pagination
  app.get('/', { preHandler: [requireAuth] }, async (req) => {
    const { search, page = '1', limit = '50', includeInactive } = req.query as Record<string, string>
    const skip = (Number(page) - 1) * Number(limit)
    const showInactive = includeInactive === 'true'

    const where = {
      tenantId: req.tenantId!,
      ...(showInactive ? {} : { isActive: true }),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [materials, total] = await Promise.all([
      app.prisma.material.findMany({ where, orderBy: { name: 'asc' }, skip, take: Number(limit) }),
      app.prisma.material.count({ where }),
    ])

    return { materials, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
  })

  // POST /api/v1/materials
  app.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const body = materialSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const mat = await app.prisma.material.create({ data: { ...body.data, tenantId: req.tenantId! } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'material.created', entityType: 'material', entityId: mat.id, payload: { name: mat.name } })
    return reply.status(201).send(mat)
  })

  // PATCH /api/v1/materials/:id
  app.patch('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = materialSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const exists = await app.prisma.material.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Material não encontrado' })
    const mat = await app.prisma.material.update({ where: { id }, data: body.data })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'material.updated', entityType: 'material', entityId: id })
    return mat
  })

  // DELETE /api/v1/materials/:id — soft delete
  app.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const exists = await app.prisma.material.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Material não encontrado' })
    await app.prisma.material.update({ where: { id }, data: { isActive: false } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'material.deactivated', entityType: 'material', entityId: id })
    return { ok: true }
  })
}
