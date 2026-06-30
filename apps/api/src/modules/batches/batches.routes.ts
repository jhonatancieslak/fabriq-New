// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'

export async function batchesRoutes(app: FastifyInstance) {

  // GET /api/v1/batches — listar todos (com ordens incluídas)
  app.get('/batches', async (req: any) => {
    const tenantId = req.tenantId!
    const { status, machineId, from, to } = req.query as any

    const where: any = { tenantId }
    if (status) where.status = status
    if (machineId) where.machineId = machineId
    if (from || to) {
      where.scheduledAt = {}
      if (from) where.scheduledAt.gte = new Date(from)
      if (to)   where.scheduledAt.lte = new Date(to + 'T23:59:59')
    }

    const batches = await app.prisma.orderBatch.findMany({
      where,
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        orders: {
          orderBy: { sortOrder: 'asc' },
          include: {
            batch: false,
          },
        },
      },
    })

    // Enrich with order data
    const batchIds = batches.map((b: any) => b.id)
    const orderIds = batches.flatMap((b: any) => b.orders.map((o: any) => o.serviceOrderId))

    const orders = orderIds.length > 0
      ? await app.prisma.serviceOrder.findMany({
          where: { id: { in: orderIds } },
          include: {
            client: { select: { id: true, name: true } },
            items: { select: { id: true, quantityPlanned: true, areaM2: true } },
            stages: { select: { id: true, status: true, machine: { select: { id: true, name: true } } } },
          },
        })
      : []

    const orderMap = Object.fromEntries(orders.map((o: any) => [o.id, o]))

    return batches.map((b: any) => ({
      ...b,
      orders: b.orders.map((bo: any) => ({
        sortOrder: bo.sortOrder,
        ...orderMap[bo.serviceOrderId],
      })).filter((o: any) => o.id),
    }))
  })

  // GET /api/v1/batches/kanban — agrupado por estado (para o kanban)
  app.get('/batches/kanban', async (req: any) => {
    const tenantId = req.tenantId!
    const { machineId } = req.query as any

    const where: any = { tenantId }
    if (machineId) where.machineId = machineId

    const batches = await app.prisma.orderBatch.findMany({
      where,
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        orders: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    const orderIds = batches.flatMap((b: any) => b.orders.map((o: any) => o.serviceOrderId))
    const orders = orderIds.length > 0
      ? await app.prisma.serviceOrder.findMany({
          where: { id: { in: orderIds } },
          include: {
            client: { select: { id: true, name: true } },
            items: { select: { id: true, quantityPlanned: true, areaM2: true } },
            stages: { select: { id: true, status: true, machine: { select: { id: true, name: true } } } },
          },
        })
      : []

    const orderMap = Object.fromEntries(orders.map((o: any) => [o.id, o]))

    const enriched = batches.map((b: any) => ({
      ...b,
      orders: b.orders
        .map((bo: any) => ({ sortOrder: bo.sortOrder, ...orderMap[bo.serviceOrderId] }))
        .filter((o: any) => o.id),
    }))

    return {
      planned:     enriched.filter((b: any) => b.status === 'planned'),
      in_progress: enriched.filter((b: any) => b.status === 'in_progress'),
      completed:   enriched.filter((b: any) => b.status === 'completed'),
    }
  })

  // GET /api/v1/batches/:id
  app.get('/batches/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!

    const batch = await app.prisma.orderBatch.findFirst({
      where: { id, tenantId },
      include: { orders: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!batch) return reply.status(404).send({ error: 'Batch não encontrado' })

    const orderIds = batch.orders.map((o: any) => o.serviceOrderId)
    const orders = orderIds.length > 0
      ? await app.prisma.serviceOrder.findMany({
          where: { id: { in: orderIds } },
          include: {
            client: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
            items: { select: { id: true, description: true, quantityPlanned: true, areaM2: true, widthMm: true, heightMm: true, thicknessMm: true } },
            stages: { select: { id: true, status: true, startedAt: true, completedAt: true, machine: { select: { id: true, name: true } }, operator: { select: { id: true, name: true } } } },
          },
        })
      : []

    const orderMap = Object.fromEntries(orders.map((o: any) => [o.id, o]))

    return {
      ...batch,
      orders: batch.orders
        .map((bo: any) => ({ sortOrder: bo.sortOrder, ...orderMap[bo.serviceOrderId] }))
        .filter((o: any) => o.id),
    }
  })

  // POST /api/v1/batches — criar batch
  app.post('/batches', async (req: any, reply) => {
    const tenantId = req.tenantId!
    const userId   = req.userId!
    const { name, machineId, operatorId, scheduledAt, notes, orderIds } = req.body as any

    if (!name) return reply.status(400).send({ error: 'name é obrigatório' })

    const batch = await app.prisma.orderBatch.create({
      data: {
        tenantId,
        name,
        machineId: machineId ?? null,
        operatorId: operatorId ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes ?? null,
        createdById: userId,
        orders: orderIds?.length
          ? {
              create: (orderIds as string[]).map((oid: string, idx: number) => ({
                serviceOrderId: oid,
                sortOrder: idx,
              })),
            }
          : undefined,
      },
    })
    return batch
  })

  // PATCH /api/v1/batches/:id — editar batch
  app.patch('/batches/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const batch = await app.prisma.orderBatch.findFirst({ where: { id, tenantId } })
    if (!batch) return reply.status(404).send({ error: 'Batch não encontrado' })

    const { name, machineId, operatorId, scheduledAt, notes, status } = req.body as any
    return app.prisma.orderBatch.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(machineId   !== undefined && { machineId }),
        ...(operatorId  !== undefined && { operatorId }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(notes       !== undefined && { notes }),
        ...(status      !== undefined && { status }),
      },
    })
  })

  // DELETE /api/v1/batches/:id
  app.delete('/batches/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const batch = await app.prisma.orderBatch.findFirst({ where: { id, tenantId } })
    if (!batch) return reply.status(404).send({ error: 'Batch não encontrado' })
    await app.prisma.orderBatchOrder.deleteMany({ where: { batchId: id } })
    await app.prisma.orderBatch.delete({ where: { id } })
    return { ok: true }
  })

  // POST /api/v1/batches/:id/orders — adicionar ordens ao batch
  app.post('/batches/:id/orders', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const { orderIds } = req.body as { orderIds: string[] }

    if (!orderIds?.length) return reply.status(400).send({ error: 'orderIds é obrigatório' })

    const batch = await app.prisma.orderBatch.findFirst({ where: { id, tenantId } })
    if (!batch) return reply.status(404).send({ error: 'Batch não encontrado' })

    const currentCount = await app.prisma.orderBatchOrder.count({ where: { batchId: id } })

    // Ignorar ordens já presentes
    const existing = await app.prisma.orderBatchOrder.findMany({
      where: { batchId: id, serviceOrderId: { in: orderIds } },
      select: { serviceOrderId: true },
    })
    const existingIds = new Set(existing.map((e: any) => e.serviceOrderId))
    const newIds = orderIds.filter((oid: string) => !existingIds.has(oid))

    if (newIds.length > 0) {
      await app.prisma.orderBatchOrder.createMany({
        data: newIds.map((oid: string, idx: number) => ({
          batchId: id,
          serviceOrderId: oid,
          sortOrder: currentCount + idx,
        })),
      })
    }
    return { ok: true, added: newIds.length, skipped: orderIds.length - newIds.length }
  })

  // DELETE /api/v1/batches/:id/orders/:orderId — remover ordem do batch
  app.delete('/batches/:id/orders/:orderId', async (req: any, reply) => {
    const { id, orderId } = req.params
    const tenantId = req.tenantId!
    const batch = await app.prisma.orderBatch.findFirst({ where: { id, tenantId } })
    if (!batch) return reply.status(404).send({ error: 'Batch não encontrado' })
    await app.prisma.orderBatchOrder.deleteMany({ where: { batchId: id, serviceOrderId: orderId } })
    return { ok: true }
  })

  // PATCH /api/v1/batches/:id/status — mover entre colunas do kanban
  app.patch('/batches/:id/status', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const { status } = req.body as { status: 'planned' | 'in_progress' | 'completed' }

    if (!['planned', 'in_progress', 'completed'].includes(status)) {
      return reply.status(400).send({ error: 'status inválido' })
    }

    const batch = await app.prisma.orderBatch.findFirst({ where: { id, tenantId } })
    if (!batch) return reply.status(404).send({ error: 'Batch não encontrado' })

    return app.prisma.orderBatch.update({ where: { id }, data: { status } })
  })

  // GET /api/v1/batches/orders/unassigned — ordens sem batch (para adicionar)
  app.get('/batches/orders/unassigned', async (req: any) => {
    const tenantId = req.tenantId!

    const assignedOrderIds = (await app.prisma.orderBatchOrder.findMany({
      where: { batch: { tenantId } },
      select: { serviceOrderId: true },
    })).map((o: any) => o.serviceOrderId)

    return app.prisma.serviceOrder.findMany({
      where: {
        tenantId,
        status: { in: ['pending', 'in_progress'] },
        id: assignedOrderIds.length > 0 ? { notIn: assignedOrderIds } : undefined,
      },
      select: {
        id: true, orderNumber: true, status: true, isUrgent: true,
        client: { select: { id: true, name: true } },
        items: { select: { id: true } },
        scheduledAt: true,
        createdAt: true,
      },
      orderBy: [{ isUrgent: 'desc' }, { scheduledAt: 'asc' }, { createdAt: 'asc' }],
    })
  })
}
