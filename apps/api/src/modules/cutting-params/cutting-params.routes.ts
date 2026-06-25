// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOperator } from '../../shared/middleware/auth.js'

const feedbackSchema = z.object({
  paramId: z.string().uuid(),
  orderStageId: z.string().uuid(),
  result: z.enum(['worked', 'adjusted', 'failed']),
  actualSpeed: z.number().int().positive().optional(),
  actualPower: z.number().positive().optional(),
  actualPressure: z.number().positive().optional(),
  notes: z.string().optional(),
})

export async function cuttingParamsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/cutting-params?material=steel&thickness=3&machineType=laser_cnc
  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { material, thickness, machineType } = req.query as {
      material?: string; thickness?: string; machineType?: string
    }

    if (!material || !thickness) {
      return reply.status(400).send({ error: 'Parâmetros obrigatórios: material e thickness' })
    }

    const thicknessNum = parseFloat(thickness)

    // Procurar parâmetros específicos do tenant primeiro, depois globais
    const params = await app.prisma.cuttingParam.findMany({
      where: {
        materialType: material as never,
        machineType: (machineType as never) ?? 'laser_cnc',
        tenantId: { in: [req.tenantId!, null as never] },
      },
      orderBy: [
        { tenantId: 'desc' }, // tenant-specific primeiro
        { confidence: 'desc' },
      ],
    })

    if (params.length === 0) {
      return reply.status(404).send({ error: 'Sem parâmetros para este material e espessura' })
    }

    // Encontrar parâmetro com espessura mais próxima
    const exact = params.find(p => Number(p.thicknessMm) === thicknessNum)
    if (exact) return { param: exact, interpolated: false }

    // Interpolação linear entre o mais próximo abaixo e acima
    const below = params.filter(p => Number(p.thicknessMm) < thicknessNum).at(-1)
    const above = params.find(p => Number(p.thicknessMm) > thicknessNum)

    if (!below && above) return { param: above, interpolated: true, note: 'Parâmetro mais próximo disponível' }
    if (below && !above) return { param: below, interpolated: true, note: 'Parâmetro mais próximo disponível' }
    if (!below || !above) return reply.status(404).send({ error: 'Sem parâmetros suficientes para interpolação' })

    const ratio = (thicknessNum - Number(below.thicknessMm)) / (Number(above.thicknessMm) - Number(below.thicknessMm))
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * ratio)

    return {
      interpolated: true,
      note: `Interpolado entre ${below.thicknessMm}mm e ${above.thicknessMm}mm`,
      param: {
        ...below,
        thicknessMm: thicknessNum,
        speedMmMin: lerp(below.speedMmMin, above.speedMmMin),
        powerPercent: lerp(Number(below.powerPercent), Number(above.powerPercent)),
        gasPressureBar: lerp(Number(below.gasPressureBar), Number(above.gasPressureBar)),
        confidence: Math.min(Number(below.confidence), Number(above.confidence)) * 0.9,
      },
    }
  })

  // POST /api/v1/cutting-params/feedback — operador regista resultado
  app.post('/feedback', { preHandler: [requireOperator] }, async (req, reply) => {
    const body = feedbackSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const feedback = await app.prisma.cuttingParamFeedback.create({
      data: {
        tenantId: req.tenantId!,
        paramId: body.data.paramId,
        operatorId: req.operatorId!,
        orderStageId: body.data.orderStageId,
        result: body.data.result,
        actualSpeed: body.data.actualSpeed,
        actualPower: body.data.actualPower,
        actualPressure: body.data.actualPressure,
        notes: body.data.notes,
      },
    })

    // Actualizar confidence do parâmetro
    const delta = body.data.result === 'worked' ? 0.05 : body.data.result === 'adjusted' ? 0.01 : -0.1
    await app.prisma.cuttingParam.update({
      where: { id: body.data.paramId },
      data: {
        confidence: {
          increment: delta,
        },
      },
    })

    return reply.status(201).send(feedback)
  })

  // GET /api/v1/cutting-params/materials — listar materiais disponíveis
  app.get('/materials', { preHandler: [requireAuth] }, async (req) => {
    const results = await app.prisma.cuttingParam.findMany({
      where: { tenantId: { in: [req.tenantId!, null as never] } },
      select: { materialType: true, thicknessMm: true },
      distinct: ['materialType', 'thicknessMm'],
      orderBy: [{ materialType: 'asc' }, { thicknessMm: 'asc' }],
    })

    // Agrupar por material
    const grouped: Record<string, number[]> = {}
    for (const r of results) {
      if (!grouped[r.materialType]) grouped[r.materialType] = []
      grouped[r.materialType].push(Number(r.thicknessMm))
    }

    return grouped
  })
}
