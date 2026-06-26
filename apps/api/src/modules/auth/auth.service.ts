// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { createHash, randomBytes } from 'crypto'
import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { verifyPassword } from '../../shared/utils/crypto.js'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export async function loginUser(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<{ tokens: TokenPair; user: { id: string; name: string; role: string }; tenant: { id: string; slug: string; name: string } }> {
  // Encontra o utilizador pelo email (globalmente — um email pertence a um tenant)
  const user = await app.prisma.user.findFirst({
    where: { email, isActive: true },
    include: { tenant: { select: { id: true, slug: true, name: true, isActive: true } } },
  })

  if (!user || !user.tenant.isActive || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error('INVALID_CREDENTIALS')
  }

  const tokens = await generateTokenPair(app, { userId: user.id, tenantId: user.tenantId, role: user.role })

  await app.prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  return {
    tokens,
    user:   { id: user.id, name: user.name, role: user.role },
    tenant: { id: user.tenant.id, slug: user.tenant.slug, name: user.tenant.name },
  }
}

export async function loginOperator(
  app: FastifyInstance,
  username: string,
  password: string,
  tenantSlug: string,
): Promise<{ tokens: TokenPair; operator: { id: string; name: string } }> {
  const tenant = await app.prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: { id: true },
  })

  if (!tenant) throw new Error('TENANT_NOT_FOUND')

  const operator = await app.prisma.operator.findFirst({
    where: { username, tenantId: tenant.id, isActive: true },
  })

  if (!operator || !(await verifyPassword(password, operator.passwordHash))) {
    throw new Error('INVALID_CREDENTIALS')
  }

  const tokens = await generateTokenPair(app, {
    operatorId: operator.id,
    tenantId: tenant.id,
    role: 'operator',
  })

  return { tokens, operator: { id: operator.id, name: operator.name } }
}

export async function refreshAccessToken(
  app: FastifyInstance,
  rawRefreshToken: string,
): Promise<TokenPair> {
  const tokenHash = hashToken(rawRefreshToken)

  const stored = await app.prisma.refreshToken.findUnique({
    where: { tokenHash },
  })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  // revoke old, issue new (rotation)
  await app.prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  })

  let payload: Record<string, string>
  if (stored.userId) {
    const user = await app.prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user || !user.isActive) throw new Error('INVALID_REFRESH_TOKEN')
    payload = { userId: user.id, tenantId: user.tenantId, role: user.role }
  } else if (stored.operatorId) {
    const operator = await app.prisma.operator.findUnique({ where: { id: stored.operatorId! } })
    if (!operator || !operator.isActive) throw new Error('INVALID_REFRESH_TOKEN')
    payload = { operatorId: operator.id, tenantId: operator.tenantId, role: 'operator' }
  } else {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  return generateTokenPair(app, payload)
}

export async function revokeRefreshToken(app: FastifyInstance, rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken)
  await app.prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  })
}

async function generateTokenPair(
  app: FastifyInstance,
  payload: Record<string, string>,
): Promise<TokenPair> {
  const accessToken = app.jwt.sign(payload, { expiresIn: '15m' })

  const rawRefresh = randomBytes(48).toString('hex')
  const tokenHash = hashToken(rawRefresh)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30d

  await app.prisma.refreshToken.create({
    data: {
      tokenHash,
      expiresAt,
      userId: payload.userId ?? null,
      operatorId: payload.operatorId ?? null,
    },
  })

  return { accessToken, refreshToken: rawRefresh }
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
