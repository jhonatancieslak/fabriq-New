// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
/**
 * Relatório de Produção — espelha /relatorios/producao do NestCut.
 *
 * KPIs:
 *   1. Produção por operador  (ordens, peças, área, tempo, desvio estimado)
 *   2. Ocupação da máquina por semana  (% de horas disponíveis)
 *   3. Consumo de chapa por material+espessura (m²)
 *   4. Ordens fora do tempo estimado  (desvio em %, lista ranking)
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { calculateOrderCost } from '../../shared/services/cost.service.js'

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  operatorId: z.string().optional(),
  machineId:  z.string().optional(),
})

// horas disponíveis por semana (5 dias × 8 h)
const AVAILABLE_SECS_PER_WEEK = 5 * 8 * 3600

function fmtHMS(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function isoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export async function productionRoutes(app: FastifyInstance) {
  // GET /api/v1/production — relatório principal
  app.get('/production', { preHandler: [requireAuth, requireRole('admin', 'financial')] },
    async (req, reply) => {
      const tenantId = req.tenantId!
      const q = querySchema.parse(req.query)

      const now = new Date()
      const from = q.from ? new Date(q.from) : new Date(now.getFullYear(), now.getMonth(), 1)
      const to   = q.to   ? new Date(q.to + 'T23:59:59') : now

      // Filtros base
      const where: Record<string, unknown> = {
        tenantId,
        status: 'completed',
        completedAt: { gte: from, lte: to },
      }
      if (q.operatorId) where['stages'] = { some: { operatorId: q.operatorId } }
      if (q.machineId)  where['stages'] = { some: { machineId: q.machineId } }

      const orders = await app.prisma.serviceOrder.findMany({
        where: where as any,
        include: {
          stages: { include: { operator: true, machine: true } },
          items:  { include: { material: true } },
          client: { select: { name: true } },
          project: { select: { name: true, code: true } },
        },
        orderBy: { completedAt: 'asc' },
      })

      // ── helpers locais ────────────────────────────────────────────────────
      const totalSecs = (o: typeof orders[0]) =>
        o.stages.reduce((s, st) => s + (st.cuttingTime ?? 0), 0)

      const totalAreaM2 = (o: typeof orders[0]) =>
        o.items.reduce((s, i) => s + (i.areaM2 ? Number(i.areaM2) * i.quantityPlanned : 0), 0)

      const totalPieces = (o: typeof orders[0]) =>
        o.items.reduce((s, i) => s + i.quantityPlanned, 0)

      // ── 1. Por operador ───────────────────────────────────────────────────
      const byOperator: Record<string, {
        name: string; orders: number; pieces: number
        secs: number; area: number; ordersOverTime: number
      }> = {}

      for (const o of orders) {
        const mainOp = o.stages.find(s => s.operator)?.operator
        const key    = mainOp?.id ?? '__none__'
        const name   = mainOp?.name ?? 'Sem operador'
        if (!byOperator[key]) byOperator[key] = { name, orders: 0, pieces: 0, secs: 0, area: 0, ordersOverTime: 0 }
        const entry = byOperator[key]
        entry.orders++
        entry.pieces += totalPieces(o)
        entry.secs   += totalSecs(o)
        entry.area   += totalAreaM2(o)
        const tc = totalSecs(o)
        const te = o.estimatedTimeSecs ?? 0
        if (tc > 0 && te > 0 && tc > te) entry.ordersOverTime++
      }

      const operatorStats = Object.values(byOperator).map(e => ({
        ...e,
        area: Math.round(e.area * 1000) / 1000,
        avgSecsPer: e.orders ? Math.floor(e.secs / e.orders) : 0,
        timeFormatted: fmtHMS(e.secs),
        avgTimeFormatted: fmtHMS(e.orders ? Math.floor(e.secs / e.orders) : 0),
        overTimeRate: e.orders ? Math.round(e.ordersOverTime / e.orders * 100) : 0,
      })).sort((a, b) => b.orders - a.orders)

      // ── 2. Ocupação por semana ────────────────────────────────────────────
      const byWeek: Record<string, { secs: number; orders: number; label: string }> = {}
      for (const o of orders) {
        if (!o.completedAt) continue
        const week = isoWeek(o.completedAt)
        const year = o.completedAt.getFullYear()
        const key  = `${year}-W${String(week).padStart(2, '0')}`
        if (!byWeek[key]) byWeek[key] = { secs: 0, orders: 0, label: `Sem ${week}` }
        byWeek[key].secs   += totalSecs(o)
        byWeek[key].orders += 1
      }
      const weekOccupation = Object.entries(byWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => ({
          ...v,
          pct: Math.min(Math.round(v.secs / AVAILABLE_SECS_PER_WEEK * 100), 100),
          timeFormatted: fmtHMS(v.secs),
        }))

      // ── 3. Consumo por material + espessura ───────────────────────────────
      const byMaterial: Record<string, { name: string; type: string; thicknessMm: number; area: number; orders: number; pieces: number }> = {}
      for (const o of orders) {
        for (const item of o.items) {
          const mat  = item.material
          const esp  = item.thicknessMm ? Number(item.thicknessMm) : 0
          const key  = `${mat?.id ?? 'none'}_${esp}`
          const name = mat?.name ?? 'Sem material'
          if (!byMaterial[key]) byMaterial[key] = { name, type: mat?.type ?? '', thicknessMm: esp, area: 0, orders: 0, pieces: 0 }
          const e = byMaterial[key]
          e.area   += item.areaM2 ? Number(item.areaM2) * item.quantityPlanned : 0
          e.orders += 1
          e.pieces += item.quantityPlanned
        }
      }
      const materialConsumption = Object.values(byMaterial)
        .map(e => ({ ...e, area: Math.round(e.area * 1000) / 1000 }))
        .sort((a, b) => b.area - a.area)

      // ── 4. Ordens fora do tempo estimado ─────────────────────────────────
      const overTime: Array<{
        orderId: string; orderNumber: string
        client: string; project: string
        realSecs: number; estimatedSecs: number
        deviationSecs: number; deviationPct: number
        realFmt: string; estFmt: string; devFmt: string
      }> = []

      for (const o of orders) {
        const tc = totalSecs(o)
        const te = o.estimatedTimeSecs ?? 0
        if (tc > 0 && te > 0 && tc > te) {
          const dev = tc - te
          overTime.push({
            orderId: o.id,
            orderNumber: o.orderNumber,
            client: o.client?.name ?? '—',
            project: o.project ? `${o.project.code} ${o.project.name}` : '—',
            realSecs: tc,
            estimatedSecs: te,
            deviationSecs: dev,
            deviationPct: Math.round(dev / te * 100),
            realFmt: fmtHMS(tc),
            estFmt: fmtHMS(te),
            devFmt: fmtHMS(dev),
          })
        }
      }
      overTime.sort((a, b) => b.deviationPct - a.deviationPct)

      // ── 5. Totais gerais ──────────────────────────────────────────────────
      const totalOrders = orders.length
      const totalSecsAll = orders.reduce((s, o) => s + totalSecs(o), 0)
      const totalAreaAll = orders.reduce((s, o) => s + totalAreaM2(o), 0)
      const totalPiecesAll = orders.reduce((s, o) => s + totalPieces(o), 0)
      const ordersWithEstimate = orders.filter(o => o.estimatedTimeSecs && totalSecs(o) > 0)
      const avgDevPct = ordersWithEstimate.length
        ? Math.round(ordersWithEstimate.reduce((s, o) => {
            const tc = totalSecs(o), te = o.estimatedTimeSecs!
            return s + (tc - te) / te * 100
          }, 0) / ordersWithEstimate.length)
        : null

      // ── 6. Custo total do período (usando motor de custo) ─────────────────
      let totalCostPeriod = 0
      for (const o of orders) {
        const cost = await calculateOrderCost(tenantId, o.id)
        if (cost) totalCostPeriod += cost.totalCost
      }

      return reply.send({
        period: { from: from.toISOString(), to: to.toISOString() },
        summary: {
          totalOrders,
          totalPieces: totalPiecesAll,
          totalAreaM2: Math.round(totalAreaAll * 1000) / 1000,
          totalTimeSecs: totalSecsAll,
          totalTimeFormatted: fmtHMS(totalSecsAll),
          totalCost: Math.round(totalCostPeriod * 100) / 100,
          ordersWithEstimate: ordersWithEstimate.length,
          ordersOverTime: overTime.length,
          avgDeviationPct: avgDevPct,
        },
        operatorStats,
        weekOccupation,
        materialConsumption,
        overTime: overTime.slice(0, 50),  // top 50
      })
    },
  )

  // GET /api/v1/production/operators — lista operadores para filtro
  app.get('/production/operators', { preHandler: [requireAuth] }, async (req, reply) => {
    const ops = await app.prisma.operator.findMany({
      where: { tenantId: req.tenantId!, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return reply.send(ops)
  })
}
