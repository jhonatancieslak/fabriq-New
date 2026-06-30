// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { UPLOADS_DIR } from './shared/config.js'

import { authRoutes } from './modules/auth/auth.routes.js'
import { registerRoutes } from './modules/auth/register.routes.js'
import { requestersRoutes } from './modules/requesters/requesters.routes.js'
import { clientsRoutes } from './modules/clients/clients.routes.js'
import { projectsRoutes } from './modules/projects/projects.routes.js'
import { operatorsRoutes } from './modules/operators/operators.routes.js'
import { ordersRoutes } from './modules/orders/orders.routes.js'
import { machinesRoutes } from './modules/machines/machines.routes.js'
import { materialsRoutes } from './modules/materials/materials.routes.js'
import { pdfRoutes } from './modules/pdf/pdf.routes.js'
import { cuttingParamsRoutes } from './modules/cutting-params/cutting-params.routes.js'
import { securityRoutes } from './modules/security/security.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { financialRoutes } from './modules/financial/financial.routes.js'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'
import { billingRoutes } from './modules/billing/billing.routes.js'
import { superadminRoutes } from './modules/superadmin/superadmin.routes.js'
import { settingsRoutes } from './modules/settings/settings.routes.js'
import { reportsRoutes } from './modules/reports/reports.routes.js'
import { filesRoutes } from './modules/files/files.routes.js'
import { nestingRoutes } from './modules/nesting/nesting.routes.js'
import { costTableRoutes } from './modules/cost-table/cost-table.routes.js'
import { productionRoutes } from './modules/production/production.routes.js'
import { checklistRoutes } from './modules/checklist/checklist.routes.js'
import { resolveTenant } from './shared/middleware/tenant.js'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/2')

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
})

// Guardar raw body para verificação de assinatura Stripe
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
  try {
    ;(req as any).rawBody = body
    const str = body.toString()
    done(null, str ? JSON.parse(str) : {})
  } catch (err: any) {
    done(err, undefined)
  }
})

async function bootstrap() {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }) // 50 MB (DXF/DWG)
  await app.register(staticFiles, { root: UPLOADS_DIR, prefix: '/uploads/' })
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3190',
      'http://localhost:3191',
      'https://sistema.fabriq.pt',
      'https://app.fabriq.pt',
      'https://saas.fabriq.pt',
    ],
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
  await app.register(registerRoutes,  { prefix: '/api/v1/auth' })
  await app.register(clientsRoutes,   { prefix: '/api/v1/clients' })
  await app.register(projectsRoutes,  { prefix: '/api/v1/projects' })
await app.register(requestersRoutes, { prefix: '/api/v1/requesters' })
  await app.register(operatorsRoutes, { prefix: '/api/v1/operators' })
  await app.register(ordersRoutes,    { prefix: '/api/v1/orders' })
  await app.register(machinesRoutes,      { prefix: '/api/v1/machines' })
  await app.register(materialsRoutes,     { prefix: '/api/v1/materials' })
  await app.register(pdfRoutes,           { prefix: '/api/v1/pdf' })
  await app.register(cuttingParamsRoutes, { prefix: '/api/v1/cutting-params' })
  await app.register(securityRoutes,     { prefix: '/api/v1/security' })
  await app.register(usersRoutes,        { prefix: '/api/v1/users' })
  await app.register(financialRoutes,    { prefix: '/api/v1/financial' })
  await app.register(dashboardRoutes,        { prefix: '/api/v1/dashboard' })
  await app.register(notificationsRoutes,    { prefix: '/api/v1/notifications' })
  await app.register(billingRoutes,          { prefix: '/api/v1/billing' })
  await app.register(superadminRoutes,       { prefix: '/api/v1/superadmin' })
  await app.register(settingsRoutes,         { prefix: '/api/v1/settings' })
  await app.register(reportsRoutes,          { prefix: '/api/v1/reports' })
  await app.register(filesRoutes,            { prefix: '/api/v1' })
await app.register(nestingRoutes,          { prefix: '/api/v1' })
await app.register(costTableRoutes,        { prefix: '/api/v1' })
await app.register(productionRoutes,       { prefix: '/api/v1' })
await app.register(checklistRoutes,        { prefix: '/api/v1' })

  const port = Number(process.env.PORT ?? 8190)
  const host = process.env.HOST ?? '127.0.0.1'
  await app.listen({ port, host })
  console.log(`FABRIQ.IA API em execução — http://${host}:${port}`)
}

bootstrap().catch((err) => { console.error(err); process.exit(1) })

declare module 'fastify' {
  interface FastifyInstance { prisma: PrismaClient; redis: Redis }
  interface FastifyRequest { tenantId?: string; userId?: string; operatorId?: string; userRole?: string; isSuperAdmin?: boolean }
}
