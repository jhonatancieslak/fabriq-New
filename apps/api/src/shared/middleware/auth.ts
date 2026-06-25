// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify()
    const payload = req.user as Record<string, string>
    req.tenantId = payload.tenantId
    req.userId = payload.userId
    req.operatorId = payload.operatorId
    req.userRole = payload.role
  } catch {
    return reply.status(401).send({ error: 'Não autorizado' })
  }
}

export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }
  }
}

export async function requireOperator(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify()
    const payload = req.user as Record<string, string>
    if (payload.role !== 'operator') {
      return reply.status(403).send({ error: 'Acesso apenas para operadores' })
    }
    req.tenantId = payload.tenantId
    req.operatorId = payload.operatorId
    req.userRole = 'operator'
  } catch {
    return reply.status(401).send({ error: 'Não autorizado' })
  }
}
