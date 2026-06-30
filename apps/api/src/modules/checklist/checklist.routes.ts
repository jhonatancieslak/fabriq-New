// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireOperator } from '../../shared/middleware/auth.js'

// Itens padrão do sistema antigo NestCut (Pipesolutions)
const DEFAULT_ITEMS = [
  { type: 'daily',     name: 'Temperatura do Chiller',                                              ref: 'Valor de referência: 20ºC (±1º)', order: 1 },
  { type: 'daily',     name: 'Circuito de Água (vedação, circuito e pressão)',                      ref: null, order: 2 },
  { type: 'daily',     name: 'Ambiente de Trabalho do Chiller (Seco, limpo, ventilado)',            ref: null, order: 3 },
  { type: 'daily',     name: 'Limpeza da Superfície do Chiller',                                   ref: null, order: 4 },
  { type: 'daily',     name: 'Verificar Condensador',                                              ref: null, order: 5 },
  { type: 'daily',     name: 'Verificar Funcionamento da Água de Refrigeração Laser e Cabeça Laser', ref: null, order: 6 },
  { type: 'daily',     name: 'Confirmar Funcionamento do Chiller',                                 ref: null, order: 7 },
  { type: 'daily',     name: 'Verificar Tensão Elétrica',                                          ref: null, order: 8 },
  { type: 'biweekly',  name: 'Limpeza do Filtro de Ar',                                           ref: null, order: 1 },
  { type: 'biweekly',  name: 'Verificar Qualidade da Água',                                       ref: null, order: 2 },
  { type: 'biweekly',  name: 'Verificar Fugas na Tubagem do Chiller',                             ref: null, order: 3 },
  { type: 'quarterly', name: 'Verificar Componentes Elétricos',                                   ref: null, order: 1 },
  { type: 'quarterly', name: 'Substituir Água Destilada',                                         ref: null, order: 2 },
  { type: 'quarterly', name: 'Limpeza do Depósito e Filtro Metálico',                             ref: null, order: 3 },
]

async function seedIfEmpty(prisma: any, tenantId: string) {
  const count = await prisma.checklistItem.count({ where: { tenantId } })
  if (count > 0) return
  await prisma.checklistItem.createMany({
    data: DEFAULT_ITEMS.map(i => ({
      tenantId,
      name: i.name,
      type: i.type as any,
      referenceValue: i.ref ?? undefined,
      order: i.order,
      isActive: true,
    })),
  })
}

// Verifica quais tipos de checklist estão em dívida hoje
async function pendingTypes(prisma: any, tenantId: string): Promise<string[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due: string[] = []

  // Diária — em dívida se ninguém concluiu hoje
  const dailyDone = await prisma.checklistRecord.findFirst({
    where: { tenantId, type: 'daily', date: today, completedAt: { not: null } },
  })
  if (!dailyDone) due.push('daily')

  // Quinzenal — ninguém concluiu nos últimos 15 dias
  const biweeklyDone = await prisma.checklistRecord.findFirst({
    where: {
      tenantId, type: 'biweekly',
      date: { gte: new Date(Date.now() - 15 * 24 * 3600 * 1000) },
      completedAt: { not: null },
    },
  })
  if (!biweeklyDone) due.push('biweekly')

  // Trimestral — ninguém concluiu nos últimos 90 dias
  const quarterlyDone = await prisma.checklistRecord.findFirst({
    where: {
      tenantId, type: 'quarterly',
      date: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) },
      completedAt: { not: null },
    },
  })
  if (!quarterlyDone) due.push('quarterly')

  return due
}

export async function checklistRoutes(app: FastifyInstance) {
  // GET /api/v1/checklist/pending — tipos em dívida (operador)
  app.get('/checklist/pending', { preHandler: [requireOperator] }, async (req) => {
    const tenantId = req.tenantId!
    await seedIfEmpty(app.prisma, tenantId)
    const types = await pendingTypes(app.prisma, tenantId)
    if (types.length === 0) return { pending: [], items: {} }

    const items: Record<string, any[]> = {}
    for (const type of types) {
      items[type] = await app.prisma.checklistItem.findMany({
        where: { tenantId, type: type as any, isActive: true },
        orderBy: { order: 'asc' },
        select: { id: true, name: true, referenceValue: true },
      })
    }
    return { pending: types, items }
  })

  // POST /api/v1/checklist/submit — submeter checklist concluída (operador)
  app.post('/checklist/submit', { preHandler: [requireOperator] }, async (req: any, reply) => {
    const tenantId = req.tenantId!
    const operatorId = req.operator!.id
    const { type, items } = req.body as { type: string; items: { itemId: string; name: string; ok: boolean; obs?: string }[] }

    if (!type || !items || !Array.isArray(items)) {
      return reply.status(400).send({ error: 'type e items são obrigatórios' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const record = await app.prisma.checklistRecord.create({
      data: {
        tenantId,
        type: type as any,
        date: today,
        operatorId,
        completedAt: new Date(),
        items: items as any,
      },
    })
    return { ok: true, id: record.id }
  })

  // GET /api/v1/checklist/history — histórico admin
  app.get('/checklist/history', async (req: any, reply) => {
    const tenantId = req.tenantId!
    const { from, to, type } = req.query as { from?: string; to?: string; type?: string }

    const where: any = {
      tenantId,
      completedAt: { not: null },
    }
    if (from) where.date = { ...where.date, gte: new Date(from) }
    if (to)   where.date = { ...where.date, lte: new Date(to) }
    if (type) where.type = type

    const records = await app.prisma.checklistRecord.findMany({
      where,
      include: { operator: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 200,
    })
    return records.map((r: any) => ({
      id: r.id,
      type: r.type,
      date: r.date,
      completedAt: r.completedAt,
      operator: r.operator,
      items: r.items,
      nonConformities: (r.items as any[]).filter(i => !i.ok).length,
    }))
  })

  // GET /api/v1/checklist/items — listar itens (admin)
  app.get('/checklist/items', async (req: any) => {
    const tenantId = req.tenantId!
    await seedIfEmpty(app.prisma, tenantId)
    return app.prisma.checklistItem.findMany({
      where: { tenantId },
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
    })
  })

  // PATCH /api/v1/checklist/items/:id — activar/desactivar item
  app.patch('/checklist/items/:id', async (req: any, reply) => {
    const { id } = req.params
    const { isActive } = req.body as { isActive: boolean }
    const item = await app.prisma.checklistItem.findFirst({
      where: { id, tenantId: req.tenantId! },
    })
    if (!item) return reply.status(404).send({ error: 'Item não encontrado' })
    await app.prisma.checklistItem.update({ where: { id }, data: { isActive } })
    return { ok: true }
  })
}
