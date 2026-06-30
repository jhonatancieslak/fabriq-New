// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'

const projectSchema = z.object({
  clientId: z.string().uuid(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
})

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: [requireAuth, requireRole('admin', 'financial', 'viewer', 'requester')] }

  app.get('/', guard, async (req) => {
    const { clientId, status } = req.query as { clientId?: string; status?: string }
    return app.prisma.project.findMany({
      where: {
        tenantId: req.tenantId!,
        ...(clientId ? { clientId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/:id', guard, async (req, reply) => {
    const { id } = req.params as { id: string }
    const project = await app.prisma.project.findFirst({
      where: { id, tenantId: req.tenantId! },
      include: {
        client: true,
        serviceOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            stages: { include: { machine: { select: { name: true } }, operator: { select: { name: true } } } },
            items: { include: { material: { select: { name: true } }, files: { where: { processed: true } } } },
            invoicing: { select: { costValue: true, status: true, type: true } },
          },
        },
      },
    })
    if (!project) return reply.status(404).send({ error: 'Obra não encontrada' })

    let totalCuttingTimeSecs = 0, totalAreaM2 = 0, totalCost = 0, totalPieces = 0
    for (const order of project.serviceOrders) {
      for (const stage of order.stages) totalCuttingTimeSecs += stage.cuttingTime ?? 0
      for (const item of order.items) {
        totalPieces += item.quantityPlanned
        for (const file of item.files) {
          if (file.areaM2) totalAreaM2 += Number(file.areaM2) * item.quantityPlanned
        }
      }
      if (order.invoicing?.costValue) totalCost += Number(order.invoicing.costValue)
    }

    return {
      ...project,
      metrics: {
        totalOrders: project.serviceOrders.length,
        completedOrders: project.serviceOrders.filter(o => ['completed', 'invoiced'].includes(o.status)).length,
        totalPieces,
        totalCuttingTimeSecs,
        totalAreaM2: Number(totalAreaM2.toFixed(6)),
        totalCost: Number(totalCost.toFixed(2)),
      },
    }
  })

  // POST /projects/:id/complete — marca obra como concluída
  app.post('/:id/complete', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const project = await app.prisma.project.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!project) return reply.status(404).send({ error: 'Obra não encontrada' })
    if (['completed', 'invoiced'].includes(project.status)) {
      return reply.status(409).send({ error: 'Obra já está concluída ou faturada' })
    }
    const updated = await app.prisma.project.update({ where: { id }, data: { status: 'completed' } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'project.completed', entityType: 'project', entityId: id })
    return updated
  })

  // POST /projects/:id/reopen — reabre obra
  app.post('/:id/reopen', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const project = await app.prisma.project.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!project) return reply.status(404).send({ error: 'Obra não encontrada' })
    const updated = await app.prisma.project.update({ where: { id }, data: { status: 'open' } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'project.reopened', entityType: 'project', entityId: id })
    return updated
  })

  app.post('/', { preHandler: [requireAuth, requireRole('admin', 'requester')] }, async (req, reply) => {
    const body = projectSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const clientExists = await app.prisma.client.findFirst({ where: { id: body.data.clientId, tenantId: req.tenantId! } })
    if (!clientExists) return reply.status(400).send({ error: 'Cliente não encontrado' })

    const project = await app.prisma.project.create({
      data: { ...body.data, tenantId: req.tenantId!, createdById: req.userId! },
    })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'project.created', entityType: 'project', entityId: project.id })
    return reply.status(201).send(project)
  })

  app.patch('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = projectSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.project.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Obra não encontrada' })

    const project = await app.prisma.project.update({ where: { id }, data: body.data })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'project.updated', entityType: 'project', entityId: id })
    return project
  })

  app.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const exists = await app.prisma.project.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Obra não encontrada' })

    // Desvincular ordens antes de apagar (notas de auditoria no campo notes)
    const ordersToUpdate = await app.prisma.serviceOrder.findMany({ where: { projectId: id, tenantId: req.tenantId! }, select: { id: true } })
    if (ordersToUpdate.length > 0) {
      return reply.status(409).send({ error: `Não é possível remover: obra tem ${ordersToUpdate.length} ordem(ns) associada(s). Remova-as primeiro.` })
    }
    await app.prisma.project.delete({ where: { id } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'project.deleted', entityType: 'project', entityId: id })
    return reply.status(204).send()
  })
}
