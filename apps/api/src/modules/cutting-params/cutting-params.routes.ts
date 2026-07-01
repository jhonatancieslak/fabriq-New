// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOperator, requireRole } from '../../shared/middleware/auth.js'
import { audit } from '../../shared/utils/audit.js'

const MATERIAL_TYPES = ['steel', 'stainless', 'aluminum', 'copper', 'brass', 'other'] as const
const MACHINE_TYPES = [
  'laser_cnc', 'cnc_router', 'plasma', 'waterjet',
  'bending', 'guillotine', 'welding', 'turning', 'milling', 'other',
] as const
const GAS_TYPES = ['nitrogen', 'oxygen', 'air'] as const
const CUTTING_MACHINE_TYPES = ['laser_cnc', 'cnc_router', 'plasma', 'waterjet'] as const

const paramSchema = z.object({
  materialType: z.enum(MATERIAL_TYPES),
  thicknessMm: z.number().positive(),
  machineType: z.enum(MACHINE_TYPES),
  notes: z.string().optional(),
  speedMmMin: z.number().int().positive().optional(),
  powerPercent: z.number().positive().optional(),
  gasPressureBar: z.number().positive().optional(),
  gasType: z.enum(GAS_TYPES).optional(),
  nozzleMm: z.number().positive().optional(),
  frequency: z.number().int().positive().optional(),
  tonnageT: z.number().positive().optional(),
  bendAngleDeg: z.number().positive().optional(),
  bendRadiusMm: z.number().positive().optional(),
  backGaugeMm: z.number().positive().optional(),
  bladeClearanceMm: z.number().positive().optional(),
  maxSheetThicknessMm: z.number().positive().optional(),
})

function validateProcessFields(data: z.infer<typeof paramSchema>): string | null {
  if ((CUTTING_MACHINE_TYPES as readonly string[]).includes(data.machineType)) {
    if (data.speedMmMin == null || data.powerPercent == null || data.gasPressureBar == null
      || data.gasType == null || data.nozzleMm == null) {
      return 'Para corte (laser/router/plasma/água) são obrigatórios: speedMmMin, powerPercent, gasPressureBar, gasType, nozzleMm'
    }
  } else if (data.machineType === 'bending') {
    if (data.tonnageT == null || data.bendAngleDeg == null || data.bendRadiusMm == null) {
      return 'Para quinagem são obrigatórios: tonnageT, bendAngleDeg, bendRadiusMm'
    }
  } else if (data.machineType === 'guillotine') {
    if (data.bladeClearanceMm == null) {
      return 'Para guilhotina é obrigatório: bladeClearanceMm'
    }
  }
  return null
}

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
        speedMmMin: lerp(Number(below.speedMmMin), Number(above.speedMmMin)),
        powerPercent: lerp(Number(below.powerPercent), Number(above.powerPercent)),
        gasPressureBar: lerp(Number(below.gasPressureBar), Number(above.gasPressureBar)),
        confidence: Math.min(Number(below.confidence), Number(above.confidence)) * 0.9,
      },
    }
  })

  // GET /api/v1/cutting-params/list — listagem admin (paginação/filtros)
  app.get('/list', { preHandler: [requireAuth, requireRole('admin')] }, async (req) => {
    const { search, machineType, materialType, page = '1', limit = '20' } = req.query as Record<string, string>
    const skip = (Number(page) - 1) * Number(limit)

    const where = {
      tenantId: { in: [req.tenantId!, null as never] },
      ...(machineType ? { machineType: machineType as never } : {}),
      ...(materialType ? { materialType: materialType as never } : {}),
      ...(search ? { notes: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [params, total] = await Promise.all([
      app.prisma.cuttingParam.findMany({
        where,
        orderBy: [{ machineType: 'asc' }, { materialType: 'asc' }, { thicknessMm: 'asc' }],
        skip,
        take: Number(limit),
      }),
      app.prisma.cuttingParam.count({ where }),
    ])

    return { params, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
  })

  // POST /api/v1/cutting-params
  app.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const body = paramSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const validationError = validateProcessFields(body.data)
    if (validationError) return reply.status(400).send({ error: validationError })

    const param = await app.prisma.cuttingParam.create({
      data: { ...body.data, tenantId: req.tenantId!, source: 'admin_manual' },
    })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'cutting_param.created', entityType: 'cutting_param', entityId: param.id,
      payload: { materialType: param.materialType, thicknessMm: param.thicknessMm, machineType: param.machineType } })

    return reply.status(201).send(param)
  })

  // PATCH /api/v1/cutting-params/:id
  app.patch('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = paramSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const exists = await app.prisma.cuttingParam.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Parâmetro não encontrado' })

    const merged = { ...exists, ...body.data } as unknown as z.infer<typeof paramSchema>
    const validationError = validateProcessFields(merged)
    if (validationError) return reply.status(400).send({ error: validationError })

    const param = await app.prisma.cuttingParam.update({ where: { id }, data: body.data })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'cutting_param.updated', entityType: 'cutting_param', entityId: id })

    return param
  })

  // DELETE /api/v1/cutting-params/:id
  app.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const exists = await app.prisma.cuttingParam.findFirst({ where: { id, tenantId: req.tenantId! } })
    if (!exists) return reply.status(404).send({ error: 'Parâmetro não encontrado' })

    await app.prisma.cuttingParam.delete({ where: { id } })
    await audit({ prisma: app.prisma, req, tenantId: req.tenantId!, userId: req.userId,
      action: 'cutting_param.deleted', entityType: 'cutting_param', entityId: id })

    return { ok: true }
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
