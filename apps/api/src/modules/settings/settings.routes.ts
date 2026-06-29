// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'

export interface OrderNumberingConfig {
  prefix: string          // 'OS', 'ORD', 'FAB', '' — máx 10 chars
  separator: string       // '-', '/', '.', '_', ''
  includeYear: boolean    // incluir ano
  includeMonth: boolean   // incluir mês (só se includeYear = true)
  padding: number         // 3, 4 ou 5 dígitos de sequencial
  resetYearly: boolean    // reiniciar sequencial a 1 em Jan de cada ano
  nextSeq: number         // próximo número sequencial
  lastResetYear: number   // ano em que foi feito o último reset
}

export const DEFAULT_CONFIG: OrderNumberingConfig = {
  prefix: 'OS',
  separator: '-',
  includeYear: true,
  includeMonth: false,
  padding: 4,
  resetYearly: false,
  nextSeq: 1,
  lastResetYear: new Date().getFullYear(),
}

export function generateOrderNumber(config: OrderNumberingConfig): string {
  const now   = new Date()
  const year  = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const seq   = String(config.nextSeq).padStart(config.padding, '0')
  const sep   = config.separator

  const parts: string[] = []
  if (config.prefix) parts.push(config.prefix)
  if (config.includeYear) {
    parts.push(year)
    if (config.includeMonth) parts.push(month)
  }
  parts.push(seq)

  return parts.join(sep)
}

export function getNumberingConfig(settings: Record<string, unknown>): OrderNumberingConfig {
  const raw = (settings?.orderNumbering ?? {}) as Partial<OrderNumberingConfig>
  return { ...DEFAULT_CONFIG, ...raw }
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/v1/settings/order-numbering
  app.get('/order-numbering', { preHandler: [requireAuth, requireRole('admin')] }, async (req) => {
    const tenant = await app.prisma.tenant.findUnique({
      where: { id: req.tenantId! },
      select: { settings: true },
    })
    const settings = (tenant?.settings ?? {}) as Record<string, unknown>
    const config   = getNumberingConfig(settings)

    // auto-reset yearly if applicable
    const currentYear = new Date().getFullYear()
    if (config.resetYearly && config.lastResetYear < currentYear) {
      config.nextSeq      = 1
      config.lastResetYear = currentYear
    }

    // preview of the next order number
    const preview = generateOrderNumber(config)

    return { config, preview }
  })

  // PATCH /api/v1/settings/order-numbering
  app.patch('/order-numbering', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const body = req.body as Partial<OrderNumberingConfig>

    // validate
    if (body.prefix !== undefined && body.prefix.length > 10) {
      return reply.status(400).send({ error: 'Prefixo máximo 10 caracteres' })
    }
    if (body.padding !== undefined && ![3, 4, 5].includes(body.padding)) {
      return reply.status(400).send({ error: 'Padding deve ser 3, 4 ou 5' })
    }
    if (body.nextSeq !== undefined && (body.nextSeq < 1 || body.nextSeq > 999999)) {
      return reply.status(400).send({ error: 'Próximo número deve ser entre 1 e 999999' })
    }
    if (!['', '-', '/', '.', '_'].includes(body.separator ?? '-')) {
      return reply.status(400).send({ error: 'Separador inválido' })
    }

    const tenant   = await app.prisma.tenant.findUnique({ where: { id: req.tenantId! }, select: { settings: true } })
    const current  = getNumberingConfig((tenant?.settings ?? {}) as Record<string, unknown>)
    const updated  = { ...current, ...body, lastResetYear: new Date().getFullYear() }

    await app.prisma.tenant.update({
      where: { id: req.tenantId! },
      data: { settings: { ...(tenant?.settings as object ?? {}), orderNumbering: updated } },
    })

    const preview = generateOrderNumber(updated)
    return { config: updated, preview }
  })
}
