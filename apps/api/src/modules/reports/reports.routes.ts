// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
  app.get('/', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req) => {
    const tenantId = req.tenantId!
    const query = req.query as Record<string, string>

    const now = new Date()
    const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to   = query.to   ? new Date(query.to + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const [orders, invoicing, clients, machines] = await Promise.all([
      // Ordens do período
      app.prisma.serviceOrder.findMany({
        where: { tenantId, createdAt: { gte: from, lte: to } },
        include: {
          client: { select: { name: true } },
          project: { select: { name: true } },
          stages: { select: { cuttingTime: true, status: true } },
          invoicing: { select: { costValue: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Receita do período (faturado)
      app.prisma.invoicing.aggregate({
        where: { tenantId, status: 'invoiced', invoiceDate: { gte: from, lte: to } },
        _sum: { costValue: true },
        _count: true,
      }),

      // Top clientes (ordens no período)
      app.prisma.serviceOrder.groupBy({
        by: ['clientId'],
        where: { tenantId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),

      // Ordens por máquina
      app.prisma.orderStage.groupBy({
        by: ['machineId'],
        where: { tenantId: tenantId, machine: { tenantId } },
        _count: { id: true },
        _sum: { cuttingTime: true },
      }),
    ])

    // Calcular stats por status
    const byStatus = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Total de tempo de corte
    const totalCuttingTime = orders.reduce((sum, o) =>
      sum + o.stages.reduce((s, st) => s + (st.cuttingTime ?? 0), 0), 0)

    // Receita pendente (ordens completed sem fatura)
    const pendingRevenue = orders
      .filter(o => o.status === 'completed' && o.invoicing?.status === 'pending')
      .reduce((sum, o) => sum + Number(o.invoicing?.costValue ?? 0), 0)

    // Ordens por dia (timeline)
    const byDay: Record<string, number> = {}
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + 1
    }

    // Top clientes — enriquecer com nome
    const clientIds = [...new Set(orders.map(o => o.clientId).filter((id): id is string => !!id))]
    const clientsData = await app.prisma.client.findMany({
      where: { id: { in: clientIds }, tenantId },
      select: { id: true, name: true },
    })
    const clientMap = Object.fromEntries(clientsData.map(c => [c.id, c.name]))
    const topClients = clients
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 5)
      .map(c => ({ name: c.clientId ? (clientMap[c.clientId] ?? 'Desconhecido') : 'Avulso', orders: c._count.id }))

    // Top máquinas
    const machineIds = machines.filter(m => m.machineId).map(m => m.machineId!)
    const machinesData = await app.prisma.machine.findMany({
      where: { id: { in: machineIds }, tenantId },
      select: { id: true, name: true },
    })
    const machineMap = Object.fromEntries(machinesData.map(m => [m.id, m.name]))
    const topMachines = machines
      .filter(m => m.machineId)
      .sort((a, b) => (b._sum.cuttingTime ?? 0) - (a._sum.cuttingTime ?? 0))
      .slice(0, 5)
      .map(m => ({
        name: machineMap[m.machineId!] ?? 'Desconhecida',
        stages: m._count.id,
        cuttingTime: m._sum.cuttingTime ?? 0,
      }))

    // Lista de ordens (resumida para tabela)
    const orderList = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      title: o.notes ? o.notes.slice(0, 60) : '—',
      client: o.client?.name ?? '—',
      project: o.project?.name ?? '—',
      status: o.status,
      cuttingTime: o.stages.reduce((s, st) => s + (st.cuttingTime ?? 0), 0),
      value: Number(o.invoicing?.costValue ?? 0),
      invoicingStatus: o.invoicing?.status ?? null,
      createdAt: o.createdAt.toISOString(),
    }))

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalOrders: orders.length,
        byStatus,
        totalCuttingTime,
        revenue: Number(invoicing._sum.costValue ?? 0),
        invoicedCount: invoicing._count,
        pendingRevenue,
      },
      topClients,
      topMachines,
      byDay,
      orders: orderList,
    }
  })
}
