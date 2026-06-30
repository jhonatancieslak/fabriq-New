// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireOperator } from '../../shared/middleware/auth.js'

export async function consumablesRoutes(app: FastifyInstance) {
  // GET /api/v1/consumables/alerts — itens com stock abaixo do mínimo (deve ficar antes de /:id)
  app.get('/consumables/alerts', async (req: any) => {
    const tenantId = req.tenantId!
    const items = await app.prisma.consumable.findMany({
      where: { tenantId, isActive: true },
    })
    return items
      .filter((c: any) => c.stockCurrent <= c.stockMin)
      .map((c: any) => ({ id: c.id, name: c.name, category: c.category, stockCurrent: c.stockCurrent, stockMin: c.stockMin }))
  })

  // GET /api/v1/consumables — listar com stock e alerta
  app.get('/consumables', async (req: any) => {
    const tenantId = req.tenantId!
    const items = await app.prisma.consumable.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return items.map((c: any) => ({
      ...c,
      lowStock: c.stockCurrent <= c.stockMin,
    }))
  })

  // POST /api/v1/consumables — criar consumível
  app.post('/consumables', async (req: any, reply) => {
    const tenantId = req.tenantId!
    const { name, category, reference, unit, stockCurrent, stockMin, description } = req.body as any
    if (!name) return reply.status(400).send({ error: 'name é obrigatório' })
    return app.prisma.consumable.create({
      data: { tenantId, name, category: category ?? 'other', reference, unit: unit ?? 'un', stockCurrent: stockCurrent ?? 0, stockMin: stockMin ?? 1, description },
    })
  })

  // PATCH /api/v1/consumables/:id
  app.patch('/consumables/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const c = await app.prisma.consumable.findFirst({ where: { id, tenantId } })
    if (!c) return reply.status(404).send({ error: 'Consumível não encontrado' })
    return app.prisma.consumable.update({ where: { id }, data: req.body as any })
  })

  // DELETE /api/v1/consumables/:id
  app.delete('/consumables/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const c = await app.prisma.consumable.findFirst({ where: { id, tenantId } })
    if (!c) return reply.status(404).send({ error: 'Consumível não encontrado' })
    await app.prisma.consumable.delete({ where: { id } })
    return { ok: true }
  })

  // POST /api/v1/consumables/:id/movement — registar entrada ou saída
  app.post('/consumables/:id/movement', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const { type, quantity, reason, notes } = req.body as { type: 'in' | 'out'; quantity: number; reason?: string; notes?: string }

    if (!type || !quantity || quantity <= 0) {
      return reply.status(400).send({ error: 'type e quantity (>0) são obrigatórios' })
    }

    const c = await app.prisma.consumable.findFirst({ where: { id, tenantId } })
    if (!c) return reply.status(404).send({ error: 'Consumível não encontrado' })

    if (type === 'out' && c.stockCurrent < quantity) {
      return reply.status(400).send({ error: `Stock insuficiente (actual: ${c.stockCurrent})` })
    }

    const [movement] = await app.prisma.$transaction([
      app.prisma.stockMovement.create({
        data: {
          tenantId, consumableId: id, type, quantity, reason: reason ?? null, notes: notes ?? null,
          userId: req.userId ?? null,
        },
      }),
      app.prisma.consumable.update({
        where: { id },
        data: { stockCurrent: { increment: type === 'in' ? quantity : -quantity } },
      }),
    ])
    return movement
  })

  // POST /api/v1/consumables/:id/movement/operator — saída via PWA (operador)
  app.post('/consumables/:id/movement/operator', { preHandler: [requireOperator] }, async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const operatorId = req.operatorId!
    const { quantity, reason } = req.body as { quantity: number; reason?: string }

    if (!quantity || quantity <= 0) return reply.status(400).send({ error: 'quantity obrigatório' })

    const c = await app.prisma.consumable.findFirst({ where: { id, tenantId } })
    if (!c) return reply.status(404).send({ error: 'Consumível não encontrado' })
    if (c.stockCurrent < quantity) return reply.status(400).send({ error: `Stock insuficiente (${c.stockCurrent})` })

    await app.prisma.$transaction([
      app.prisma.stockMovement.create({
        data: { tenantId, consumableId: id, type: 'out', quantity, reason: reason ?? 'Uso em corte', operatorId },
      }),
      app.prisma.consumable.update({ where: { id }, data: { stockCurrent: { decrement: quantity } } }),
    ])
    return { ok: true, newStock: c.stockCurrent - quantity }
  })

  // GET /api/v1/consumables/:id/movements — histórico de movimentos
  app.get('/consumables/:id/movements', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const c = await app.prisma.consumable.findFirst({ where: { id, tenantId } })
    if (!c) return reply.status(404).send({ error: 'Consumível não encontrado' })
    return app.prisma.stockMovement.findMany({
      where: { consumableId: id },
      include: { operator: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })

}
