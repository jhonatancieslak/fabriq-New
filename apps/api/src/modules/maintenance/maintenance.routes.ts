// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireOperator } from '../../shared/middleware/auth.js'

// Calcula total de horas de corte da máquina (via etapas concluídas)
async function machineHours(prisma: any, machineId: string): Promise<number> {
  const result = await prisma.orderStage.aggregate({
    where: { machineId, status: 'completed', cuttingTime: { not: null } },
    _sum: { cuttingTime: true },
  })
  return Math.round((result._sum.cuttingTime ?? 0) / 3600 * 10) / 10
}

async function machineOrders(prisma: any, machineId: string): Promise<number> {
  return prisma.orderStage.count({ where: { machineId, status: 'completed' } })
}

// Calcula estado da tarefa: 'overdue' | 'urgent' | 'soon' | 'ok'
function taskStatus(task: any, lastRecord: any, hours: number, orders: number): {
  status: 'overdue' | 'urgent' | 'soon' | 'ok'
  nextDue: Date | number | null
  progressPct: number | null
} {
  const ref = lastRecord?.executedAt ?? task.createdAt
  const interval = task.interval

  if (task.periodicity === 'hours') {
    const baseH = lastRecord?.machineHours ? Number(lastRecord.machineHours) : 0
    const nextH = baseH + interval
    const diff  = nextH - hours
    const progressPct = Math.min(Math.round(((hours - baseH) / interval) * 100), 100)
    return {
      status: diff <= 0 ? 'overdue' : diff <= 20 ? 'urgent' : 'ok',
      nextDue: nextH,
      progressPct,
    }
  }
  if (task.periodicity === 'orders') {
    const baseO = lastRecord?.ordersCompleted ?? 0
    const nextO = baseO + interval
    const diff  = nextO - orders
    const progressPct = Math.min(Math.round(((orders - baseO) / interval) * 100), 100)
    return {
      status: diff <= 0 ? 'overdue' : diff <= 10 ? 'urgent' : 'ok',
      nextDue: nextO,
      progressPct,
    }
  }

  // time-based
  const MS: Record<string, number> = {
    days: 86400000, weeks: 7 * 86400000, months: 30.44 * 86400000,
  }
  const ms = MS[task.periodicity] ?? MS.days
  const nextDue = new Date(new Date(ref).getTime() + interval * ms)
  const now = Date.now()
  const diff = nextDue.getTime() - now
  const total = nextDue.getTime() - new Date(ref).getTime()
  const progressPct = Math.min(Math.round(((now - new Date(ref).getTime()) / total) * 100), 100)

  let status: 'overdue' | 'urgent' | 'soon' | 'ok'
  if (diff <= 0)                       status = 'overdue'
  else if (diff <= 7 * 86400000)       status = 'urgent'
  else if (diff <= 14 * 86400000)      status = 'soon'
  else                                 status = 'ok'

  return { status, nextDue, progressPct }
}

export async function maintenanceRoutes(app: FastifyInstance) {
  // ── TAREFAS ──────────────────────────────────────────────────────────────

  // GET /api/v1/maintenance — listar tarefas com estado calculado
  app.get('/maintenance', async (req: any) => {
    const tenantId = req.tenantId!
    const { machineId } = req.query as { machineId?: string }

    const tasks = await app.prisma.maintenanceTask.findMany({
      where: { tenantId, isActive: true, ...(machineId ? { machineId } : {}) },
      include: {
        machine: { select: { id: true, name: true } },
        records: { orderBy: { executedAt: 'desc' }, take: 1 },
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    })

    // agrupar por máquina + calcular estado
    const machineCache: Record<string, { hours: number; orders: number }> = {}
    const result = await Promise.all(tasks.map(async (t: any) => {
      if (!machineCache[t.machineId]) {
        machineCache[t.machineId] = {
          hours:  await machineHours(app.prisma, t.machineId),
          orders: await machineOrders(app.prisma, t.machineId),
        }
      }
      const { hours, orders } = machineCache[t.machineId]
      const last = t.records[0] ?? null
      const { status, nextDue, progressPct } = taskStatus(t, last, hours, orders)
      return {
        ...t, records: undefined,
        lastRecord: last,
        status, nextDue, progressPct,
        machineHours: hours, machineOrders: orders,
      }
    }))
    return result
  })

  // POST /api/v1/maintenance — criar tarefa
  app.post('/maintenance', async (req: any, reply) => {
    const tenantId = req.tenantId!
    const { machineId, title, category, description, periodicity, interval } = req.body as any
    if (!machineId || !title) return reply.status(400).send({ error: 'machineId e title obrigatórios' })
    const task = await app.prisma.maintenanceTask.create({
      data: { tenantId, machineId, title, category: category ?? 'other', description, periodicity: periodicity ?? 'days', interval: interval ?? 30 },
    })
    return task
  })

  // PATCH /api/v1/maintenance/:id — editar tarefa
  app.patch('/maintenance/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const t = await app.prisma.maintenanceTask.findFirst({ where: { id, tenantId } })
    if (!t) return reply.status(404).send({ error: 'Tarefa não encontrada' })
    const updated = await app.prisma.maintenanceTask.update({ where: { id }, data: req.body as any })
    return updated
  })

  // DELETE /api/v1/maintenance/:id
  app.delete('/maintenance/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const t = await app.prisma.maintenanceTask.findFirst({ where: { id, tenantId } })
    if (!t) return reply.status(404).send({ error: 'Tarefa não encontrada' })
    await app.prisma.maintenanceTask.delete({ where: { id } })
    return { ok: true }
  })

  // POST /api/v1/maintenance/:id/execute — registar execução
  app.post('/maintenance/:id/execute', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const t = await app.prisma.maintenanceTask.findFirst({ where: { id, tenantId }, include: { machine: true } })
    if (!t) return reply.status(404).send({ error: 'Tarefa não encontrada' })

    const hours  = await machineHours(app.prisma, t.machineId)
    const orders = await machineOrders(app.prisma, t.machineId)
    const { notes, operatorId } = req.body as any

    const record = await app.prisma.maintenanceRecord.create({
      data: {
        tenantId,
        taskId: id,
        notes: notes || null,
        machineHours: hours,
        ordersCompleted: orders,
        operatorId: operatorId ?? null,
        userId: req.userId ?? null,
      },
    })
    return record
  })

  // GET /api/v1/maintenance/:id/history — histórico de execuções
  app.get('/maintenance/:id/history', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const t = await app.prisma.maintenanceTask.findFirst({ where: { id, tenantId } })
    if (!t) return reply.status(404).send({ error: 'Tarefa não encontrada' })
    return app.prisma.maintenanceRecord.findMany({
      where: { taskId: id },
      include: { operator: { select: { id: true, name: true } } },
      orderBy: { executedAt: 'desc' },
      take: 50,
    })
  })

  // ── AVARIAS ──────────────────────────────────────────────────────────────

  // GET /api/v1/breakdowns
  app.get('/breakdowns', async (req: any) => {
    const tenantId = req.tenantId!
    const { machineId, status } = req.query as any
    return app.prisma.breakdown.findMany({
      where: { tenantId, ...(machineId ? { machineId } : {}), ...(status ? { status } : {}) },
      include: {
        machine:  { select: { id: true, name: true } },
        operator: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { reportedAt: 'desc' }],
    })
  })

  // POST /api/v1/breakdowns — reportar avaria (admin ou operador via PWA)
  app.post('/breakdowns', async (req: any, reply) => {
    const tenantId = req.tenantId!
    const { machineId, component, severity, title, description, operatorId } = req.body as any
    if (!machineId || !title) return reply.status(400).send({ error: 'machineId e title obrigatórios' })

    const b = await app.prisma.breakdown.create({
      data: {
        tenantId, machineId,
        component: component ?? 'other',
        severity: severity ?? 'medium',
        title,
        description: description || null,
        operatorId: operatorId ?? null,
      },
      include: { machine: { select: { id: true, name: true } } },
    })
    return b
  })

  // PATCH /api/v1/breakdowns/:id — actualizar avaria (solução, estado, downtime)
  app.patch('/breakdowns/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const b = await app.prisma.breakdown.findFirst({ where: { id, tenantId } })
    if (!b) return reply.status(404).send({ error: 'Avaria não encontrada' })

    const data: any = { ...req.body as any }
    if (data.status === 'resolved' && !b.resolvedAt) {
      data.resolvedAt = new Date()
      data.resolvedById = req.userId ?? null
    }
    const updated = await app.prisma.breakdown.update({ where: { id }, data })
    return updated
  })

  // DELETE /api/v1/breakdowns/:id
  app.delete('/breakdowns/:id', async (req: any, reply) => {
    const { id } = req.params
    const tenantId = req.tenantId!
    const b = await app.prisma.breakdown.findFirst({ where: { id, tenantId } })
    if (!b) return reply.status(404).send({ error: 'Avaria não encontrada' })
    await app.prisma.breakdown.delete({ where: { id } })
    return { ok: true }
  })

  // POST /api/v1/breakdowns/operator — reportar avaria via PWA (operador)
  app.post('/breakdowns/operator', { preHandler: [requireOperator] }, async (req: any, reply) => {
    const tenantId = req.tenantId!
    const operatorId = req.operatorId!
    const { machineId, component, severity, title, description } = req.body as any
    if (!machineId || !title) return reply.status(400).send({ error: 'machineId e title obrigatórios' })

    // Encontrar máquina do operador se machineId não enviado
    const resolvedMachineId = machineId ?? (
      await app.prisma.operator.findUnique({ where: { id: operatorId }, select: { machineId: true } })
    )?.machineId

    if (!resolvedMachineId) return reply.status(400).send({ error: 'Máquina não encontrada' })

    const b = await app.prisma.breakdown.create({
      data: {
        tenantId, machineId: resolvedMachineId,
        component: component ?? 'other',
        severity: severity ?? 'medium',
        title, description: description || null,
        operatorId,
      },
    })
    return { ok: true, id: b.id }
  })

  // GET /api/v1/maintenance/summary — KPIs para dashboard
  app.get('/maintenance/summary', async (req: any) => {
    const tenantId = req.tenantId!

    const tasks = await app.prisma.maintenanceTask.findMany({
      where: { tenantId, isActive: true },
      include: {
        machine: { select: { id: true, name: true } },
        records: { orderBy: { executedAt: 'desc' }, take: 1 },
      },
    })

    const machineCache: Record<string, { hours: number; orders: number }> = {}
    let overdue = 0, urgent = 0, soon = 0, ok = 0

    for (const t of tasks) {
      if (!machineCache[t.machineId]) {
        machineCache[t.machineId] = {
          hours:  await machineHours(app.prisma, t.machineId),
          orders: await machineOrders(app.prisma, t.machineId),
        }
      }
      const { hours, orders } = machineCache[t.machineId]
      const { status } = taskStatus(t, t.records[0] ?? null, hours, orders)
      if (status === 'overdue') overdue++
      else if (status === 'urgent') urgent++
      else if (status === 'soon') soon++
      else ok++
    }

    const openBreakdowns = await app.prisma.breakdown.count({
      where: { tenantId, status: { in: ['open', 'in_progress'] } },
    })

    return { overdue, urgent, soon, ok, total: tasks.length, openBreakdowns }
  })
}
