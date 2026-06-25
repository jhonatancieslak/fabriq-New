// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

import { authRoutes } from './modules/auth/auth.routes.js'
import { clientsRoutes } from './modules/clients/clients.routes.js'
import { projectsRoutes } from './modules/projects/projects.routes.js'
import { operatorsRoutes } from './modules/operators/operators.routes.js'
import { ordersRoutes } from './modules/orders/orders.routes.js'
import { machinesRoutes } from './modules/machines/machines.routes.js'
import { materialsRoutes } from './modules/materials/materials.routes.js'
import { resolveTenant } from './shared/middleware/tenant.js'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/2')

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
})

async function bootstrap() {
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3190'],
    credentials: true,
  })
  await app.register(rateLimit, { global: true, max: 100, timeWindow: '1 minute', redis })
  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret-change-me',
  })

  app.decorate('prisma', prisma)
  app.decorate('redis', redis)
  app.addHook('preHandler', resolveTenant)

  app.get('/health', async () => ({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }))

  await app.register(authRoutes,      { prefix: '/api/v1/auth' })
  await app.register(clientsRoutes,   { prefix: '/api/v1/clients' })
  await app.register(projectsRoutes,  { prefix: '/api/v1/projects' })
  await app.register(operatorsRoutes, { prefix: '/api/v1/operators' })
  await app.register(ordersRoutes,    { prefix: '/api/v1/orders' })
  await app.register(machinesRoutes,  { prefix: '/api/v1/machines' })
  await app.register(materialsRoutes, { prefix: '/api/v1/materials' })

  const port = Number(process.env.PORT ?? 8190)
  const host = process.env.HOST ?? '127.0.0.1'
  await app.listen({ port, host })
  console.log(`FABRIQ.IA API em execução — http://${host}:${port}`)
}

bootstrap().catch((err) => { console.error(err); process.exit(1) })

declare module 'fastify' {
  interface FastifyInstance { prisma: PrismaClient; redis: Redis }
  interface FastifyRequest { tenantId?: string; userId?: string; operatorId?: string; userRole?: string }
}
