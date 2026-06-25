// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { randomBytes } from 'crypto'
import type { PrismaClient } from '@prisma/client'
import type { CreateOrderInput, CompleteStageInput } from './orders.schema.js'

function generateOrderNumber(tenantSlug: string): string {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const rand = randomBytes(2).toString('hex').toUpperCase()
  return `OS-${ym}-${rand}`
}

function generateAuthCode(orderNumber: string): string {
  const rand = randomBytes(3).toString('hex').toUpperCase()
  return `FBRQ-${orderNumber.replace('OS-', '')}-${rand}`
}

export async function createOrder(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: CreateOrderInput,
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } })
  const orderNumber = generateOrderNumber(tenant?.slug ?? 'FBRQ')
  const authCode = generateAuthCode(orderNumber)

  const order = await prisma.serviceOrder.create({
    data: {
      tenantId,
      orderNumber,
      authCode,
      projectId: input.projectId,
      clientId: input.clientId,
      requesterId: input.requesterId,
      notes: input.notes,
      createdById: userId,
      status: 'pending',
      stages: {
        create: input.stages.map((s, i) => ({
          tenantId,
          stageNumber: i + 1,
          type: s.type,
          machineId: s.machineId,
          operatorId: s.operatorId,
          status: i === 0 ? 'pending' : 'pending',
        })),
      },
      items: {
        create: input.items.map((item, i) => ({
          tenantId,
          description: item.description,
          filename: item.filename,
          materialId: item.materialId,
          thicknessMm: item.thicknessMm,
          quantityPlanned: item.quantityPlanned,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          areaM2: item.widthMm && item.heightMm
            ? (item.widthMm / 1000) * (item.heightMm / 1000) * item.quantityPlanned
            : undefined,
          sortOrder: i,
        })),
      },
    },
    include: {
      stages: { orderBy: { stageNumber: 'asc' } },
      items: { include: { material: true } },
      project: true,
      client: true,
      requester: true,
    },
  })

  return order
}

export async function startStage(
  prisma: PrismaClient,
  tenantId: string,
  stageId: string,
  operatorId: string,
) {
  const stage = await prisma.orderStage.findFirst({
    where: { id: stageId, tenantId },
    include: { serviceOrder: true },
  })

  if (!stage) throw new Error('STAGE_NOT_FOUND')
  if (stage.status !== 'pending') throw new Error('STAGE_ALREADY_STARTED')
  if (stage.serviceOrder.status === 'cancelled') throw new Error('ORDER_CANCELLED')

  // stagger: only start if previous stage is completed
  if (stage.stageNumber > 1) {
    const prev = await prisma.orderStage.findFirst({
      where: { serviceOrderId: stage.serviceOrderId, stageNumber: stage.stageNumber - 1 },
    })
    if (prev?.status !== 'completed') throw new Error('PREVIOUS_STAGE_NOT_COMPLETED')
  }

  const [updatedStage] = await prisma.$transaction([
    prisma.orderStage.update({
      where: { id: stageId },
      data: { status: 'in_progress', startedAt: new Date(), operatorId },
    }),
    prisma.serviceOrder.update({
      where: { id: stage.serviceOrderId },
      data: { status: 'in_progress' },
    }),
  ])

  return updatedStage
}

export async function completeStage(
  prisma: PrismaClient,
  tenantId: string,
  stageId: string,
  input: CompleteStageInput,
) {
  const stage = await prisma.orderStage.findFirst({
    where: { id: stageId, tenantId },
    include: {
      serviceOrder: {
        include: { stages: { orderBy: { stageNumber: 'asc' } } },
      },
    },
  })

  if (!stage) throw new Error('STAGE_NOT_FOUND')
  if (stage.status !== 'in_progress') throw new Error('STAGE_NOT_IN_PROGRESS')

  const completedAt = new Date()
  await prisma.orderStage.update({
    where: { id: stageId },
    data: {
      status: 'completed',
      completedAt,
      cuttingTime: input.cuttingTime,
      notes: input.notes,
      operatorSignature: input.operatorSignature,
    },
  })

  // update items quantity done on last stage
  const isLastStage = stage.stageNumber === stage.serviceOrder.stages.length
  if (isLastStage) {
    await prisma.serviceOrder.update({
      where: { id: stage.serviceOrderId },
      data: { status: 'completed', completedAt },
    })

    // create invoicing record ready to approve
    await prisma.invoicing.create({
      data: {
        tenantId,
        serviceOrderId: stage.serviceOrderId,
        type: 'material_and_labor',
        status: 'pending',
      },
    })
  }

  return prisma.serviceOrder.findUnique({
    where: { id: stage.serviceOrderId },
    include: { stages: { orderBy: { stageNumber: 'asc' } }, items: true },
  })
}

export async function cancelOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  reason: string,
) {
  const order = await prisma.serviceOrder.findFirst({ where: { id: orderId, tenantId } })
  if (!order) throw new Error('ORDER_NOT_FOUND')
  if (['completed', 'invoiced'].includes(order.status)) throw new Error('ORDER_CANNOT_BE_CANCELLED')

  return prisma.serviceOrder.update({
    where: { id: orderId },
    data: { status: 'cancelled', cancelReason: reason },
  })
}

export async function getOrderByToken(prisma: PrismaClient, accessToken: string) {
  const order = await prisma.serviceOrder.findUnique({
    where: { accessToken },
    include: {
      stages: { orderBy: { stageNumber: 'asc' }, include: { operator: { select: { name: true } }, photos: true } },
      items: { include: { material: true } },
      client: { select: { name: true } },
      project: { select: { name: true, code: true } },
    },
  })
  if (!order) throw new Error('ORDER_NOT_FOUND')
  return order
}
