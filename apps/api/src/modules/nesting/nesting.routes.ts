// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { spawn } from 'child_process'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import { UPLOADS_DIR } from '../../shared/config.js'

const nestInputSchema = z.object({
  sheetWidthMm: z.number().positive().max(10_000),
  sheetLengthMm: z.number().positive().max(20_000),
  gapMm: z.number().min(0).max(50).default(2),
})

interface NestResult {
  ok: boolean
  sheetsNeeded: number
  utilizationPct: number
  unplacedPieces: number
  piecesCount: number
  piecesPerSheet: number
  layout: Array<{ sheet: number; x: number; y: number; w: number; h: number; label: string; id: string }>
}

function runNestPy(input: object, previewPath: string): Promise<NestResult> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ ...input, previewPath })
    const scriptPath = join(process.cwd(), '../../services/dxf-processor/nest.py')
    const py = spawn('python3', [scriptPath, payload])

    let stdout = ''
    py.stdout.on('data', (d) => { stdout += d })
    py.stderr.on('data', () => { /* drain */ })

    const timer = setTimeout(() => { py.kill(); reject(new Error('Nesting timeout')) }, 30_000)

    py.on('close', () => {
      clearTimeout(timer)
      try {
        const result = JSON.parse(stdout.trim())
        if (!result.ok) reject(new Error(result.error || 'Erro no nesting'))
        else resolve(result as NestResult)
      } catch {
        reject(new Error(`Parse error: ${stdout.slice(0, 200)}`))
      }
    })
  })
}

export async function nestingRoutes(app: FastifyInstance) {
  // POST — calcula nesting e guarda resultado
  app.post<{ Params: { orderId: string }; Body: z.infer<typeof nestInputSchema> }>(
    '/orders/:orderId/nesting',
    { preHandler: [requireAuth, requireRole('admin', 'operator')] },
    async (req, reply) => {
      const tenantId = req.tenantId!
      const { orderId } = req.params
      const body = nestInputSchema.parse(req.body)

      const order = await app.prisma.serviceOrder.findFirst({
        where: { id: orderId, tenantId },
        include: {
          items: {
            include: { files: { where: { processed: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
      if (!order) return reply.code(404).send({ error: 'Ordem não encontrada' })

      const pieces: Array<{ w: number; h: number; qty: number; label: string; id: string }> = []
      for (const item of order.items) {
        const dxf = item.files[0]
        const w = dxf?.bboxWidthMm ? Number(dxf.bboxWidthMm) : Number(item.widthMm ?? 0)
        const h = dxf?.bboxHeightMm ? Number(dxf.bboxHeightMm) : Number(item.heightMm ?? 0)
        if (w > 0 && h > 0) {
          pieces.push({ w, h, qty: item.quantityPlanned, label: item.description ?? item.id, id: item.id })
        }
      }

      if (pieces.length === 0) {
        return reply.code(422).send({
          error: 'Nenhuma peça com dimensões válidas. Carregue ficheiros DXF ou preencha largura/altura.',
        })
      }

      const previewDir = join(UPLOADS_DIR, 'nesting', tenantId)
      await mkdir(previewDir, { recursive: true })
      const previewFile = `${randomUUID()}.png`
      const previewPath = join(previewDir, previewFile)

      const result = await runNestPy(
        { pieces, sheetW: body.sheetWidthMm, sheetH: body.sheetLengthMm, gap: body.gapMm },
        previewPath,
      )

      await app.prisma.nestingJob.deleteMany({ where: { serviceOrderId: orderId, tenantId } })

      const job = await app.prisma.nestingJob.create({
        data: {
          tenantId,
          serviceOrderId: orderId,
          sheetWidthMm: body.sheetWidthMm,
          sheetLengthMm: body.sheetLengthMm,
          gapMm: body.gapMm,
          piecesCount: result.piecesCount,
          sheetsNeeded: result.sheetsNeeded,
          piecesPerSheet: result.piecesPerSheet,
          unplacedPieces: result.unplacedPieces,
          utilizationPct: result.utilizationPct,
          previewPath: `nesting/${tenantId}/${previewFile}`,
          layoutJson: result.layout as object,
        },
      })

      return reply.send({
        id: job.id,
        sheetsNeeded: result.sheetsNeeded,
        utilizationPct: result.utilizationPct,
        unplacedPieces: result.unplacedPieces,
        piecesCount: result.piecesCount,
        piecesPerSheet: result.piecesPerSheet,
        previewUrl: `/uploads/nesting/${tenantId}/${previewFile}`,
        layout: result.layout,
        sheetWidthMm: body.sheetWidthMm,
        sheetLengthMm: body.sheetLengthMm,
        gapMm: body.gapMm,
      })
    },
  )

  // GET — busca o último job desta ordem
  app.get<{ Params: { orderId: string } }>(
    '/orders/:orderId/nesting',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const tenantId = req.tenantId!
      const { orderId } = req.params

      const job = await app.prisma.nestingJob.findFirst({
        where: { serviceOrderId: orderId, tenantId },
        orderBy: { createdAt: 'desc' },
      })
      if (!job) return reply.code(404).send({ error: 'Nenhum job de nesting encontrado' })

      return reply.send({
        id: job.id,
        sheetsNeeded: Number(job.sheetsNeeded),
        utilizationPct: Number(job.utilizationPct),
        unplacedPieces: job.unplacedPieces,
        piecesCount: job.piecesCount,
        piecesPerSheet: job.piecesPerSheet,
        previewUrl: job.previewPath ? `/uploads/${job.previewPath}` : null,
        layout: job.layoutJson,
        sheetWidthMm: Number(job.sheetWidthMm),
        sheetLengthMm: Number(job.sheetLengthMm),
        gapMm: Number(job.gapMm),
        createdAt: job.createdAt,
      })
    },
  )
}
