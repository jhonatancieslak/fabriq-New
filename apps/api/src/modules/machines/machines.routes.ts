// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'

const MACHINE_TYPES = [
  'laser_cnc', 'cnc_router', 'plasma', 'waterjet',
  'bending', 'guillotine', 'welding', 'turning', 'milling', 'other',
] as const

const machineSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(MACHINE_TYPES),
  model: z.string().max(100).optional(),
  serial: z.string().max(100).optional(),
  costPerHour: z.number().positive().optional().nullable(),
  minBilledMinutes: z.number().int().min(0).optional().nullable(),
  costPerMinAfterMin: z.number().positive().optional().nullable(),
  materialCostEnabled: z.boolean().optional(),
  marginPercent: z.number().min(0).max(500).optional().nullable(),
})

export async function machinesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/machines — lista com search + paginação
  app.get('/', { preHandler: [requireAuth] }, async (req) => {
    const { search, page = '1', limit = '20', includeInactive } = req.query as Record<string, string>
    const skip = (Number(page) - 1) * Number(limit)
    const showInactive = includeInactive === 'true'

    const where = {
      tenantId: req.tenantId!,
      ...(showInactive ? {} : { isActive: true }),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [machines, total] = await Promise.all([
      app.prisma.machine.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      app.prisma.machine.count({ where }),
    ])

    return { machines, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
  })

  // POST /api/v1/machines
  app.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const body = machineSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const machine = await app.prisma.machine.create({
      data: { ...body.data, tenantId: req.tenantId! },
    })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'machine.created', entityType: 'machine', entityId: machine.id,
      payload: { name: machine.name, type: machine.type } })

    return reply.status(201).send(machine)
  })

  // PATCH /api/v1/machines/:id
  app.patch('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = machineSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.machine.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Máquina não encontrada' })

    const machine = await app.prisma.machine.update({ where: { id }, data: body.data })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'machine.updated', entityType: 'machine', entityId: id })

    return machine
  })

  // DELETE /api/v1/machines/:id — desactiva (soft delete)
  app.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const exists = await app.prisma.machine.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Máquina não encontrada' })

    await app.prisma.machine.update({ where: { id }, data: { isActive: false } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'machine.deactivated', entityType: 'machine', entityId: id })

    return { ok: true }
  })
}
