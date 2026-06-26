// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole, requireOperator } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'
import {
  createOrderSchema, completeStageSchema, startStageSchema, cancelOrderSchema,
} from './orders.schema.js'
import {
  createOrder, startStage, completeStage, cancelOrder, getOrderByToken,
} from './orders.service.js'
import { writeFile, unlink } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { UPLOADS_DIR } from '../../shared/config.js'

export async function ordersRoutes(app: FastifyInstance): Promise<void> {
  // ── Admin routes ────────────────────────────────────────────────────────────

  // GET /api/v1/orders
  app.get('/', { preHandler: [requireAuth, requireRole('admin', 'financial', 'viewer', 'requester')] }, async (req) => {
    const { status, projectId, page = '1', limit = '20' } = req.query as Record<string, string>
    const skip = (Number(page) - 1) * Number(limit)
    const validStatus = status && status !== 'undefined' ? status : undefined

    // requesters only see their own orders
    const requesterFilter = req.userRole === 'requester' ? { requesterId: req.userId! } : {}

    const [orders, total] = await Promise.all([
      app.prisma.serviceOrder.findMany({
        where: {
          tenantId: req.tenantId!,
          ...requesterFilter,
          ...(validStatus ? { status: validStatus as never } : {}),
          ...(projectId && projectId !== 'undefined' ? { projectId } : {}),
        },
        include: {
          client: { select: { name: true } },
          project: { select: { name: true, code: true } },
          stages: { orderBy: { stageNumber: 'asc' }, select: { id: true, stageNumber: true, type: true, status: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      app.prisma.serviceOrder.count({ where: { tenantId: req.tenantId!, ...requesterFilter, ...(validStatus ? { status: validStatus as never } : {}) } }),
    ])

    return { orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
  })

  // GET /api/v1/orders/:id
  app.get('/:id', { preHandler: [requireAuth, requireRole('admin', 'financial', 'viewer', 'requester')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const order = await app.prisma.serviceOrder.findFirst({
      where: { id, tenantId: req.tenantId! },
      include: {
        client: true,
        project: true,
        requester: true,
        stages: {
          orderBy: { stageNumber: 'asc' },
          include: { operator: { select: { id: true, name: true } }, machine: { select: { id: true, name: true } }, photos: true },
        },
        items: { orderBy: { sortOrder: 'asc' }, include: { material: true, files: true } },
        invoicing: true,
      },
    })
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' })
    return order
  })

  // POST /api/v1/orders
  app.post('/', { preHandler: [requireAuth, requireRole('admin', 'requester')] }, async (req, reply) => {
    const body = createOrderSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const data = req.userRole === 'requester'
      ? { ...body.data, requesterId: req.userId! }
      : body.data
    const order = await createOrder(app.prisma, req.tenantId!, req.userId!, data)
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'order.created', entityType: 'order', entityId: order.id,
      payload: { orderNumber: order.orderNumber } })
    return reply.status(201).send(order)
  })

  // POST /api/v1/orders/:id/cancel
  app.post('/:id/cancel', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = cancelOrderSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    try {
      const order = await cancelOrder(app.prisma, req.tenantId!, id, body.data.reason)
      await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
        action: 'order.cancelled', entityType: 'order', entityId: id, payload: { reason: body.data.reason } })
      return order
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'ORDER_NOT_FOUND') return reply.status(404).send({ error: 'Ordem não encontrada' })
      if (msg === 'ORDER_CANNOT_BE_CANCELLED') return reply.status(409).send({ error: 'Ordem não pode ser cancelada neste estado' })
      throw err
    }
  })

  // ── Stage routes (operator PWA) ────────────────────────────────────────────

  // POST /api/v1/orders/stages/:stageId/start
  app.post('/stages/:stageId/start', { preHandler: [requireOperator] }, async (req, reply) => {
    const { stageId } = req.params as { stageId: string }

    // lock no Redis — impede dois operadores de iniciar a mesma etapa
    const lockKey = `lock:stage:${stageId}`
    const locked = await app.redis.set(lockKey, req.operatorId!, 'EX', 86400, 'NX')
    if (!locked) {
      const currentOp = await app.redis.get(lockKey)
      if (currentOp !== req.operatorId) {
        return reply.status(409).send({ error: 'Esta etapa já está a ser executada por outro operador' })
      }
    }

    try {
      const stage = await startStage(app.prisma, req.tenantId!, stageId, req.operatorId!)
      await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, operatorId: req.operatorId,
        action: 'order.stage.started', entityType: 'order_stage', entityId: stageId })
      return stage
    } catch (err) {
      await app.redis.del(lockKey)
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'STAGE_NOT_FOUND') return reply.status(404).send({ error: 'Etapa não encontrada' })
      if (msg === 'STAGE_ALREADY_STARTED') return reply.status(409).send({ error: 'Etapa já foi iniciada' })
      if (msg === 'PREVIOUS_STAGE_NOT_COMPLETED') return reply.status(409).send({ error: 'A etapa anterior ainda não foi concluída' })
      throw err
    }
  })

  // POST /api/v1/orders/stages/:stageId/complete
  app.post('/stages/:stageId/complete', { preHandler: [requireOperator] }, async (req, reply) => {
    const { stageId } = req.params as { stageId: string }
    const body = completeStageSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    try {
      const order = await completeStage(app.prisma, req.tenantId!, stageId, body.data)
      await app.redis.del(`lock:stage:${stageId}`)
      await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, operatorId: req.operatorId,
        action: 'order.stage.completed', entityType: 'order_stage', entityId: stageId,
        payload: { quantityDone: body.data.quantityDone, cuttingTime: body.data.cuttingTime } })
      return order
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'STAGE_NOT_FOUND') return reply.status(404).send({ error: 'Etapa não encontrada' })
      if (msg === 'STAGE_NOT_IN_PROGRESS') return reply.status(409).send({ error: 'Etapa não está em execução' })
      throw err
    }
  })

  // GET /api/v1/orders/operator/mine — ordens do operador autenticado
  app.get('/operator/mine', { preHandler: [requireOperator] }, async (req) => {
    return app.prisma.orderStage.findMany({
      where: {
        tenantId: req.tenantId!,
        operatorId: req.operatorId!,
        status: { in: ['pending', 'in_progress', 'paused'] },
      },
      include: {
        serviceOrder: {
          include: {
            client: { select: { name: true } },
            project: { select: { name: true, code: true } },
            items: { include: { material: true } },
          },
        },
        machine: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  })

  // ── Rota pública — verificação por token (QR code) ─────────────────────────

  // GET /api/v1/orders/verify/:token — sem autenticação
  app.get('/verify/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    try {
      const order = await getOrderByToken(app.prisma, token)
      return order
    } catch {
      return reply.status(404).send({ error: 'Ordem não encontrada ou token inválido' })
    }
  })

  // ── Fotos de etapa ─────────────────────────────────────────────────────────

  // POST /api/v1/orders/stages/:stageId/photos — upload de foto (operador)
  app.post('/stages/:stageId/photos', { preHandler: [requireOperator] }, async (req, reply) => {
    const { stageId } = req.params as { stageId: string }

    const stage = await app.prisma.orderStage.findFirst({
      where: { id: stageId, tenantId: req.tenantId! },
    })
    if (!stage) return reply.status(404).send({ error: 'Etapa não encontrada' })
    if (stage.status !== 'in_progress') return reply.status(409).send({ error: 'Etapa não está em execução' })

    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'Nenhum ficheiro enviado' })

    const ext = extname(data.filename || '.jpg') || '.jpg'
    const filename = `${randomUUID()}${ext}`
    const storagePath = join('photos', filename)
    const fullPath = join(UPLOADS_DIR, storagePath)

    const buffer = await data.toBuffer()
    await writeFile(fullPath, buffer)

    const photo = await app.prisma.orderPhoto.create({
      data: {
        tenantId: req.tenantId!,
        orderStageId: stageId,
        storagePath,
        takenById: req.operatorId!,
      },
    })

    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, operatorId: req.operatorId,
      action: 'order.stage.photo.uploaded', entityType: 'order_stage', entityId: stageId,
      payload: { photoId: photo.id } })

    return { id: photo.id, url: `/uploads/${storagePath}`, takenAt: photo.takenAt }
  })

  // GET /api/v1/orders/stages/:stageId/photos — listar fotos da etapa
  app.get('/stages/:stageId/photos', { preHandler: [requireOperator] }, async (req, reply) => {
    const { stageId } = req.params as { stageId: string }
    const photos = await app.prisma.orderPhoto.findMany({
      where: { orderStageId: stageId, tenantId: req.tenantId! },
      orderBy: { takenAt: 'asc' },
    })
    return photos.map(p => ({ id: p.id, url: `/uploads/${p.storagePath}`, takenAt: p.takenAt }))
  })

  // DELETE /api/v1/orders/stages/:stageId/photos/:photoId
  app.delete('/stages/:stageId/photos/:photoId', { preHandler: [requireOperator] }, async (req, reply) => {
    const { stageId, photoId } = req.params as { stageId: string; photoId: string }
    const photo = await app.prisma.orderPhoto.findFirst({
      where: { id: photoId, orderStageId: stageId, tenantId: req.tenantId! },
    })
    if (!photo) return reply.status(404).send({ error: 'Foto não encontrada' })

    try { await unlink(join(UPLOADS_DIR, photo.storagePath)) } catch { /* já apagada */ }
    await app.prisma.orderPhoto.delete({ where: { id: photoId } })
    return reply.status(204).send()
  })

  // GET /api/v1/orders/auth/:authCode — verificação pública por código
  app.get('/auth/:authCode', async (req, reply) => {
    const { authCode } = req.params as { authCode: string }
    const order = await app.prisma.serviceOrder.findUnique({
      where: { authCode },
      include: {
        stages: { orderBy: { stageNumber: 'asc' }, include: { operator: { select: { name: true } }, photos: true } },
        items: { include: { material: true } },
        client: { select: { name: true } },
        project: { select: { name: true, code: true } },
      },
    })
    if (!order) return reply.status(404).send({ error: 'Código de autenticidade inválido' })
    return order
  })
}
