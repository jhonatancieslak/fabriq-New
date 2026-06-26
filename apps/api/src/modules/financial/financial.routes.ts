// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'
import { z } from 'zod'

const approveSchema = z.object({
  costValue: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
  type: z.enum(['material_and_labor', 'labor_only']).optional(),
})

export async function financialRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/financial — listar registos de faturação
  app.get('/', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req) => {
    const { status, page = '1', limit = '20', from, to } = req.query as Record<string, string>
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = { tenantId: req.tenantId! }
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59Z') } : {}),
      }
    }

    const [records, total] = await Promise.all([
      app.prisma.invoicing.findMany({
        where,
        include: {
          serviceOrder: {
            include: {
              client: { select: { name: true } },
              project: { select: { name: true, code: true } },
              stages: {
                where: { status: 'completed' },
                select: { cuttingTime: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      app.prisma.invoicing.count({ where }),
    ])

    return { records, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
  })

  // GET /api/v1/financial/stats — KPIs financeiros
  app.get('/stats', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req) => {
    const tenantId = req.tenantId!
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [pending, invoicedMonth, invoicedLastMonth, totalInvoiced] = await Promise.all([
      app.prisma.invoicing.count({ where: { tenantId, status: 'pending' } }),
      app.prisma.invoicing.aggregate({
        where: { tenantId, status: 'invoiced', invoiceDate: { gte: startOfMonth } },
        _count: true,
        _sum: { costValue: true },
      }),
      app.prisma.invoicing.aggregate({
        where: { tenantId, status: 'invoiced', invoiceDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _count: true,
        _sum: { costValue: true },
      }),
      app.prisma.invoicing.aggregate({
        where: { tenantId, status: 'invoiced' },
        _sum: { costValue: true },
      }),
    ])

    const thisMonthValue = Number(invoicedMonth._sum.costValue ?? 0)
    const lastMonthValue = Number(invoicedLastMonth._sum.costValue ?? 0)
    const growth = lastMonthValue > 0 ? ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100 : null

    return {
      pendingCount: pending,
      invoicedThisMonth: invoicedMonth._count,
      revenueThisMonth: thisMonthValue,
      revenueLastMonth: lastMonthValue,
      revenueGrowth: growth,
      revenueTotal: Number(totalInvoiced._sum.costValue ?? 0),
    }
  })

  // GET /api/v1/financial/:id/calculate — calcula valor sugerido com base nos params da máquina
  app.get('/:id/calculate', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const record = await app.prisma.invoicing.findFirst({
      where: { id, tenantId: req.tenantId! },
      include: {
        serviceOrder: {
          include: {
            stages: {
              where: { status: 'completed' },
              include: { machine: true },
            },
          },
        },
      },
    })
    if (!record) return reply.status(404).send({ error: 'Registo não encontrado' })

    let suggestedValue = 0
    const breakdown: { stageNumber: number; machineType: string; machineName: string; minutes: number; cost: number }[] = []

    for (const stage of record.serviceOrder.stages) {
      const m = stage.machine
      if (!m || !m.costPerHour || stage.cuttingTime == null) continue

      const totalMin = stage.cuttingTime
      const minBilled = m.minBilledMinutes ?? 0
      const costPerMin = Number(m.costPerHour) / 60
      const costPerMinAfter = m.costPerMinAfterMin ? Number(m.costPerMinAfterMin) : costPerMin

      let stageCost = 0
      if (totalMin <= minBilled) {
        stageCost = minBilled * costPerMin
      } else {
        stageCost = minBilled * costPerMin + (totalMin - minBilled) * costPerMinAfter
      }

      if (m.marginPercent) {
        stageCost *= 1 + Number(m.marginPercent) / 100
      }

      breakdown.push({
        stageNumber: stage.stageNumber,
        machineType: stage.type,
        machineName: m.name,
        minutes: totalMin,
        cost: Math.round(stageCost * 100) / 100,
      })
      suggestedValue += stageCost
    }

    return {
      suggestedValue: Math.round(suggestedValue * 100) / 100,
      breakdown,
      hasParams: breakdown.length > 0,
    }
  })

  // PATCH /api/v1/financial/:id/approve — aprovar e marcar como faturado
  app.patch('/:id/approve', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = approveSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const record = await app.prisma.invoicing.findFirst({
      where: { id, tenantId: req.tenantId! },
    })
    if (!record) return reply.status(404).send({ error: 'Registo não encontrado' })
    if (record.status !== 'pending') return reply.status(409).send({ error: 'Registo já foi processado' })

    const updated = await app.prisma.$transaction(async (tx) => {
      const inv = await tx.invoicing.update({
        where: { id },
        data: {
          status: 'invoiced',
          invoiceDate: new Date(),
          invoicedById: req.userId,
          costValue: body.data.costValue !== undefined ? body.data.costValue : record.costValue,
          notes: body.data.notes ?? record.notes,
          type: body.data.type ?? record.type,
        },
        include: {
          serviceOrder: {
            include: {
              client: { select: { name: true } },
              project: { select: { name: true, code: true } },
            },
          },
        },
      })
      await tx.serviceOrder.update({
        where: { id: record.serviceOrderId },
        data: { status: 'invoiced' },
      })
      return inv
    })

    await audit({
      prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'financial.approved', entityType: 'invoicing', entityId: id,
      payload: { costValue: body.data.costValue, orderNumber: updated.serviceOrder.orderNumber },
    })

    return updated
  })

  // PATCH /api/v1/financial/:id/cancel — cancelar faturação (volta para pending)
  app.patch('/:id/cancel', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const record = await app.prisma.invoicing.findFirst({
      where: { id, tenantId: req.tenantId! },
    })
    if (!record) return reply.status(404).send({ error: 'Registo não encontrado' })
    if (record.status === 'cancelled') return reply.status(409).send({ error: 'Já cancelado' })

    await app.prisma.$transaction(async (tx) => {
      await tx.invoicing.update({ where: { id }, data: { status: 'cancelled' } })
      await tx.serviceOrder.update({
        where: { id: record.serviceOrderId },
        data: { status: 'completed' },
      })
    })

    await audit({
      prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'financial.cancelled', entityType: 'invoicing', entityId: id,
    })

    return { ok: true }
  })
}
