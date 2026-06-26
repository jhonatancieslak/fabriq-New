// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { PrismaClient } from '@prisma/client'
import type { FastifyRequest } from 'fastify'

// Brute-force: bloqueia automaticamente após N falhas em X minutos
const BRUTE_FORCE_MAX_ATTEMPTS = 10
const BRUTE_FORCE_WINDOW_MIN   = 15
const AUTO_BLOCK_DURATION_MIN  = 60

export async function recordLoginAttempt(
  prisma: PrismaClient,
  req: FastifyRequest,
  params: {
    email:         string
    success:       boolean
    tenantId?:     string
    userId?:       string
    failureReason?: string
  },
): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email:         params.email,
      success:       params.success,
      tenantId:      params.tenantId ?? null,
      userId:        params.userId   ?? null,
      ipAddress:     req.ip,
      userAgent:     req.headers['user-agent'] ?? null,
      failureReason: params.failureReason ?? null,
    },
  })

  // Auto-bloqueio por brute-force se tentativa falhada
  if (!params.success && req.ip) {
    await checkAndAutoBlock(prisma, req.ip)
  }
}

async function checkAndAutoBlock(prisma: PrismaClient, ip: string): Promise<void> {
  const since = new Date(Date.now() - BRUTE_FORCE_WINDOW_MIN * 60 * 1000)

  const failures = await prisma.loginAttempt.count({
    where: { ipAddress: ip, success: false, createdAt: { gte: since } },
  })

  if (failures >= BRUTE_FORCE_MAX_ATTEMPTS) {
    const expiresAt = new Date(Date.now() + AUTO_BLOCK_DURATION_MIN * 60 * 1000)
    await prisma.blockedIp.upsert({
      where:  { ipAddress: ip },
      create: {
        ipAddress:   ip,
        reason:      `Auto-bloqueio: ${failures} tentativas falhadas em ${BRUTE_FORCE_WINDOW_MIN} min`,
        isAutoBlock: true,
        expiresAt,
      },
      update: {
        reason:      `Auto-bloqueio: ${failures} tentativas falhadas em ${BRUTE_FORCE_WINDOW_MIN} min`,
        isAutoBlock: true,
        expiresAt,
      },
    })
  }
}

export async function isIpBlocked(prisma: PrismaClient, ip: string): Promise<{ blocked: boolean; reason?: string }> {
  const block = await prisma.blockedIp.findUnique({ where: { ipAddress: ip } })
  if (!block) return { blocked: false }

  // Verificar se expirou
  if (block.expiresAt && block.expiresAt < new Date()) {
    await prisma.blockedIp.delete({ where: { ipAddress: ip } })
    return { blocked: false }
  }

  return { blocked: true, reason: block.reason ?? 'IP bloqueado' }
}
