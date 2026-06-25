// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyRequest, FastifyReply } from 'fastify'

// Resolve tenant from subdomain or X-Tenant-Slug header
export async function resolveTenant(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const host = req.hostname ?? ''
  const headerSlug = req.headers['x-tenant-slug'] as string | undefined

  let slug = headerSlug

  if (!slug) {
    // extract subdomain only from real hostnames (not IPs or localhost)
    const isIp = /^[\d.]+$/.test(host.split(':')[0])
    const isLocalhost = host.startsWith('localhost')
    if (!isIp && !isLocalhost) {
      const parts = host.split('.')
      if (parts.length >= 3) slug = parts[0]
    }
  }

  // apenas ignorar subdomínios de infra, nunca slugs de tenant reais
  const infraSubdomains = ['app', 'api', 'www', 'mail', 'smtp']
  if (!slug || infraSubdomains.includes(slug)) {
    return
  }

  const cacheKey = `tenant:slug:${slug}`
  const cached = await req.server.redis.get(cacheKey)

  if (cached) {
    req.tenantId = cached
    return
  }

  const tenant = await req.server.prisma.tenant.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  })

  if (!tenant) {
    return reply.status(404).send({ error: 'Tenant not found' })
  }

  await req.server.redis.setex(cacheKey, 300, tenant.id) // cache 5min
  req.tenantId = tenant.id
}

// Guard: require tenant to be resolved
export async function requireTenant(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.tenantId) {
    return reply.status(400).send({ error: 'Tenant not identified' })
  }
}
