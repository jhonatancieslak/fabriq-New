// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'
import { WhatsAppAdmin } from '../../shared/services/whatsapp-admin.service.js'

function evolutionInstanceFor(tenantId: string): string {
  return `fabriq-${tenantId}`
}

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

  // GET /api/v1/settings/whatsapp — configuração Evolution API do tenant
  app.get('/whatsapp', { preHandler: [requireAuth, requireRole('admin')] }, async (req) => {
    const tenant = await app.prisma.tenant.findUnique({
      where: { id: req.tenantId! },
      select: { evolutionApiUrl: true, evolutionApiKey: true, evolutionInstance: true },
    })
    return {
      apiUrl:    tenant?.evolutionApiUrl ?? null,
      apiKey:    tenant?.evolutionApiKey ? '••••••••' : null,
      instance:  tenant?.evolutionInstance ?? null,
      configured: !!(tenant?.evolutionApiUrl && tenant?.evolutionApiKey && tenant?.evolutionInstance),
    }
  })

  // PATCH /api/v1/settings/whatsapp — guardar credenciais Evolution API
  app.patch('/whatsapp', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { apiUrl, apiKey, instance } = req.body as { apiUrl?: string; apiKey?: string; instance?: string }

    const data: Record<string, string | null> = {}
    if (apiUrl  !== undefined) data.evolutionApiUrl      = apiUrl  || null
    if (instance !== undefined) data.evolutionInstance   = instance || null
    // só actualiza a key se não for placeholder
    if (apiKey !== undefined && apiKey !== '••••••••') data.evolutionApiKey = apiKey || null

    await app.prisma.tenant.update({ where: { id: req.tenantId! }, data })
    return { ok: true }
  })

  // POST /api/v1/settings/whatsapp/test — enviar mensagem de teste
  app.post('/whatsapp/test', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { phone } = req.body as { phone: string }
    if (!phone) return reply.status(400).send({ error: 'Número de telefone obrigatório' })

    const tenant = await app.prisma.tenant.findUnique({
      where: { id: req.tenantId! },
      select: { evolutionApiUrl: true, evolutionApiKey: true, evolutionInstance: true, name: true },
    })

    if (!tenant?.evolutionApiUrl || !tenant?.evolutionApiKey || !tenant?.evolutionInstance) {
      return reply.status(400).send({ error: 'Evolution API não configurada' })
    }

    try {
      const res = await fetch(`${tenant.evolutionApiUrl}/message/sendText/${tenant.evolutionInstance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': tenant.evolutionApiKey },
        body: JSON.stringify({ number: phone, text: `✅ FABRIQ.IA — Teste de WhatsApp da empresa ${tenant.name}. A integração está a funcionar!` }),
      })
      if (!res.ok) {
        const err = await res.text()
        return reply.status(400).send({ error: `Evolution API: ${err}` })
      }
      return { ok: true }
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Erro ao contactar Evolution API' })
    }
  })

  // POST /api/v1/settings/whatsapp/connect — garante a instância Evolution do tenant e devolve o QR code
  app.post('/whatsapp/connect', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const tenantId = req.tenantId!
    const instance = evolutionInstanceFor(tenantId)

    try {
      const qr = await WhatsAppAdmin.createInstance(instance)

      await app.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          evolutionApiUrl: process.env.EVOLUTION_API_URL,
          evolutionApiKey: process.env.EVOLUTION_API_KEY,
          evolutionInstance: instance,
        },
      })

      await audit({ prisma: app.prisma, req, tenantId, userId: req.userId,
        action: 'whatsapp.connect', entityType: 'tenant', entityId: tenantId })

      const state = await WhatsAppAdmin.connectionState(instance)
      return { instance, state, qrcode: qr.base64 ?? null, pairingCode: qr.code ?? null }
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Erro ao ligar WhatsApp' })
    }
  })

  // GET /api/v1/settings/whatsapp/state — estado da conexão da instância do tenant
  app.get('/whatsapp/state', { preHandler: [requireAuth, requireRole('admin')] }, async (req) => {
    const tenant = await app.prisma.tenant.findUnique({
      where: { id: req.tenantId! },
      select: { evolutionInstance: true },
    })
    const instance = tenant?.evolutionInstance
    if (!instance) return { instance: null, state: 'close', connected: false }

    const state = await WhatsAppAdmin.connectionState(instance)
    return { instance, state, connected: state === 'open' }
  })

  // POST /api/v1/settings/whatsapp/disconnect — desliga (logout) sem apagar a instância
  app.post('/whatsapp/disconnect', { preHandler: [requireAuth, requireRole('admin')] }, async (req) => {
    const tenant = await app.prisma.tenant.findUnique({
      where: { id: req.tenantId! },
      select: { evolutionInstance: true },
    })
    if (tenant?.evolutionInstance) {
      await WhatsAppAdmin.logout(tenant.evolutionInstance)
      await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
        action: 'whatsapp.disconnect', entityType: 'tenant', entityId: req.tenantId! })
    }
    return { ok: true }
  })
}
