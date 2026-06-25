// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { PrismaClient } from '@prisma/client'
import type { FastifyRequest } from 'fastify'

interface AuditParams {
  prisma: PrismaClient
  req: FastifyRequest
  tenantId?: string
  userId?: string
  operatorId?: string
  action: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
}

export async function audit(params: AuditParams): Promise<void> {
  const { prisma, req, action, tenantId, userId, operatorId, entityType, entityId, payload } = params
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      operatorId,
      action,
      entityType,
      entityId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      payload: payload as never,
    },
  })
}
