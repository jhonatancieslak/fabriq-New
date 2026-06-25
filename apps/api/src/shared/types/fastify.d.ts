// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { PrismaClient } from '@prisma/client'
import type Redis from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    redis: Redis
  }

  interface FastifyRequest {
    tenantId?: string
    userId?: string
    operatorId?: string
    userRole?: string
  }
}
