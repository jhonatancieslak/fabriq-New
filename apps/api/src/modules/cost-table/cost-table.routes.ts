// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { MaterialType } from '@prisma/client'

const entrySchema = z.object({
  materialType: z.nativeEnum(MaterialType),
  thicknessMm: z.number().min(0).max(100),  // 0 = sem espessura (fallback)
  costPerM2: z.number().min(0),
  description: z.string().max(200).optional(),
})

export async function costTableRoutes(app: FastifyInstance) {
  const adminGuard = { preHandler: [requireAuth, requireRole('admin')] }

  // GET /api/v1/cost-table — lista todas as entradas activas
  app.get('/cost-table', { preHandler: [requireAuth] }, async (req, reply) => {
    const entries = await app.prisma.costTable.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: [{ materialType: 'asc' }, { thicknessMm: 'asc' }],
    })
    return reply.send(entries.map(e => ({
      id: e.id,
      materialType: e.materialType,
      thicknessMm: Number(e.thicknessMm),
      costPerM2: Number(e.costPerM2),
      description: e.description,
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })))
  })

  // POST /api/v1/cost-table — criar entrada
  app.post('/cost-table', adminGuard, async (req, reply) => {
    const body = entrySchema.parse(req.body)
    // upsert: se já existe para este par, actualiza
    const existing = await app.prisma.costTable.findFirst({
      where: { tenantId: req.tenantId!, materialType: body.materialType, thicknessMm: body.thicknessMm },
    })
    if (existing) {
      const updated = await app.prisma.costTable.update({
        where: { id: existing.id },
        data: { costPerM2: body.costPerM2, description: body.description, isActive: true },
      })
      return reply.send({ ...updated, thicknessMm: Number(updated.thicknessMm), costPerM2: Number(updated.costPerM2) })
    }
    const entry = await app.prisma.costTable.create({
      data: { tenantId: req.tenantId!, ...body },
    })
    return reply.code(201).send({ ...entry, thicknessMm: Number(entry.thicknessMm), costPerM2: Number(entry.costPerM2) })
  })

  // PATCH /api/v1/cost-table/:id — actualizar
  app.patch<{ Params: { id: string } }>('/cost-table/:id', adminGuard, async (req, reply) => {
    const body = entrySchema.partial().parse(req.body)
    const entry = await app.prisma.costTable.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    })
    if (!entry) return reply.code(404).send({ error: 'Entrada não encontrada' })
    const updated = await app.prisma.costTable.update({
      where: { id: entry.id },
      data: body,
    })
    return reply.send({ ...updated, thicknessMm: Number(updated.thicknessMm), costPerM2: Number(updated.costPerM2) })
  })

  // DELETE /api/v1/cost-table/:id — remover
  app.delete<{ Params: { id: string } }>('/cost-table/:id', adminGuard, async (req, reply) => {
    const entry = await app.prisma.costTable.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    })
    if (!entry) return reply.code(404).send({ error: 'Entrada não encontrada' })
    await app.prisma.costTable.delete({ where: { id: entry.id } })
    return reply.send({ ok: true })
  })

  // POST /api/v1/cost-table/simulate — simula custo com os parâmetros dados
  app.post('/cost-table/simulate', { preHandler: [requireAuth] }, async (req, reply) => {
    const body = z.object({
      materialType: z.nativeEnum(MaterialType).optional(),
      thicknessMm: z.number().optional(),
      areaM2: z.number().optional(),
      cuttingTimeSecs: z.number().optional(),
      machineId: z.string().optional(),
      sheetClientOwned: z.boolean().default(false),
    }).parse(req.body)

    const { calculateCost } = await import('../../shared/services/cost.service.js')

    let machineMinuteCost: number | null = null
    let minBilledMinutes: number | null = null
    let minBilledCost: number | null = null
    let marginPercent: number | null = null

    if (body.machineId) {
      const m = await app.prisma.machine.findFirst({ where: { id: body.machineId, tenantId: req.tenantId! } })
      if (m) {
        machineMinuteCost = m.costPerMinute ? Number(m.costPerMinute) : m.costPerHour ? Number(m.costPerHour) / 60 : null
        minBilledMinutes = m.minBilledMinutes ?? null
        minBilledCost = m.minBilledCost ? Number(m.minBilledCost) : null
        marginPercent = m.marginPercent ? Number(m.marginPercent) : null
      }
    }

    const result = await calculateCost({
      tenantId: req.tenantId!,
      ...body,
      machineMinuteCost,
      minBilledMinutes,
      minBilledCost,
      marginPercent,
    })
    return reply.send(result)
  })
}
