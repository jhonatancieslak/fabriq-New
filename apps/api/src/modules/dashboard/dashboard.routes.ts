// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/stats', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req) => {
    const tenantId = req.tenantId!
    const now = new Date()
    const startOfToday  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [
      totalOrders, pending, inProgress, completed, invoiced, cancelledToday,
      createdToday, createdMonth,
      revenueMonth, revenueLastMonth,
      pendingInvoices,
    ] = await Promise.all([
      app.prisma.serviceOrder.count({ where: { tenantId } }),
      app.prisma.serviceOrder.count({ where: { tenantId, status: 'pending' } }),
      app.prisma.serviceOrder.count({ where: { tenantId, status: 'in_progress' } }),
      app.prisma.serviceOrder.count({ where: { tenantId, status: 'completed' } }),
      app.prisma.serviceOrder.count({ where: { tenantId, status: 'invoiced' } }),
      app.prisma.serviceOrder.count({ where: { tenantId, status: 'cancelled', updatedAt: { gte: startOfToday } } }),
      app.prisma.serviceOrder.count({ where: { tenantId, createdAt: { gte: startOfToday } } }),
      app.prisma.serviceOrder.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      app.prisma.invoicing.aggregate({
        where: { tenantId, status: 'invoiced', invoiceDate: { gte: startOfMonth } },
        _sum: { costValue: true }, _count: true,
      }),
      app.prisma.invoicing.aggregate({
        where: { tenantId, status: 'invoiced', invoiceDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { costValue: true },
      }),
      app.prisma.invoicing.count({ where: { tenantId, status: 'pending' } }),
    ])

    const revMonth = Number(revenueMonth._sum.costValue ?? 0)
    const revLast  = Number(revenueLastMonth._sum.costValue ?? 0)

    return {
      orders: { total: totalOrders, pending, inProgress, completed, invoiced, createdToday, createdMonth },
      financial: {
        revenueMonth: revMonth,
        revenueLastMonth: revLast,
        revenueGrowth: revLast > 0 ? ((revMonth - revLast) / revLast) * 100 : null,
        invoicedThisMonth: revenueMonth._count,
        pendingInvoices,
        cancelledToday,
      },
    }
  })
}
