// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../shared/middleware/auth.js'
import { writeFile, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import { join, extname, dirname, resolve } from 'path'
import { randomUUID } from 'crypto'
import { UPLOADS_DIR } from '../../shared/config.js'

const DXF_PROCESSOR = resolve('/var/www/fabriq/services/dxf-processor/process_dxf.py')
const ALLOWED_EXTS  = new Set(['.dxf', '.dwg', '.pdf', '.png', '.jpg', '.jpeg'])
const MAX_BYTES     = 50 * 1024 * 1024  // 50 MB

function fileType(ext: string): string {
  if (ext === '.dxf') return 'dxf'
  if (ext === '.dwg') return 'dwg'
  if (ext === '.pdf') return 'pdf'
  return 'image'
}

function runProcessor(inputPath: string, previewPath: string): Promise<DxfResult> {
  return new Promise((resolve) => {
    const py = spawn('python3', [DXF_PROCESSOR, inputPath, previewPath])
    let out = ''
    py.stdout.on('data', d => (out += d))
    py.on('close', () => {
      try { resolve(JSON.parse(out.trim())) }
      catch { resolve({ ok: false, error: 'Resposta inválida do processador' }) }
    })
    py.on('error', e => resolve({ ok: false, error: e.message }))
    setTimeout(() => {
      py.kill()
      resolve({ ok: false, error: 'Timeout no processamento DXF' })
    }, 60_000)
  })
}

interface DxfResult {
  ok: boolean
  error?: string
  areaM2?: number
  bboxWidthMm?: number
  bboxHeightMm?: number
  perimeterMm?: number
}

export async function filesRoutes(app: FastifyInstance) {

  // POST /api/v1/orders/:orderId/items/:itemId/files
  // Upload de ficheiro DXF/DWG/PDF/imagem para um item de ordem
  app.post<{ Params: { orderId: string; itemId: string } }>(
    '/orders/:orderId/items/:itemId/files',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { orderId, itemId } = req.params

      // verificar que o item pertence à ordem e ao tenant
      const item = await app.prisma.orderItem.findFirst({
        where: { id: itemId, serviceOrderId: orderId, tenantId: req.tenantId! },
      })
      if (!item) return reply.status(404).send({ error: 'Item não encontrado' })

      const data = await req.file({ limits: { fileSize: MAX_BYTES } })
      if (!data) return reply.status(400).send({ error: 'Nenhum ficheiro enviado' })

      const ext = extname(data.filename).toLowerCase()
      if (!ALLOWED_EXTS.has(ext)) {
        return reply.status(400).send({ error: `Formato não suportado: ${ext}` })
      }

      const uid      = randomUUID()
      const fileName = `${uid}${ext}`
      const dxfDir   = join(UPLOADS_DIR, 'dxf', req.tenantId!)
      const filePath = join(dxfDir, fileName)

      await mkdir(dxfDir, { recursive: true })
      const buffer = await data.toBuffer()
      if (buffer.length > MAX_BYTES) {
        return reply.status(400).send({ error: 'Ficheiro demasiado grande (máx 50MB)' })
      }
      await writeFile(filePath, buffer)

      // criar registo no DB
      const file = await app.prisma.orderFile.create({
        data: {
          tenantId:    req.tenantId!,
          orderItemId: itemId,
          originalName: data.filename,
          storagePath: `dxf/${req.tenantId!}/${fileName}`,
          sizeBytes:   buffer.length,
          mimeType:    data.mimetype,
          fileType:    fileType(ext),
          processed:   false,
        },
      })

      // processar DXF de forma assíncrona (não bloquear a resposta)
      if (ext === '.dxf' || ext === '.dwg') {
        const previewName = `${uid}.png`
        const previewPath = join(UPLOADS_DIR, 'previews', req.tenantId!, previewName)
        await mkdir(dirname(previewPath), { recursive: true })

        // processar em background
        runProcessor(filePath, previewPath).then(async (result) => {
          const updateData: Record<string, unknown> = { processed: true }
          if (result.ok) {
            updateData.areaM2       = result.areaM2
            updateData.bboxWidthMm  = result.bboxWidthMm
            updateData.bboxHeightMm = result.bboxHeightMm
            updateData.perimeterMm  = result.perimeterMm
            updateData.previewPath  = `previews/${req.tenantId!}/${previewName}`

            // actualizar item com geometria (se ainda não tiver)
            if (result.areaM2 && !item.areaM2) {
              await app.prisma.orderItem.update({
                where: { id: itemId },
                data: {
                  areaM2:      result.areaM2,
                  widthMm:     result.bboxWidthMm,
                  heightMm:    result.bboxHeightMm,
                  perimeterMm: result.perimeterMm,
                },
              })
            }
          }
          await app.prisma.orderFile.update({ where: { id: file.id }, data: updateData })
        }).catch(() => {
          app.prisma.orderFile.update({ where: { id: file.id }, data: { processed: true } }).catch(() => {})
        })
      } else {
        // para PDF e imagens, marcar como processado imediatamente
        await app.prisma.orderFile.update({ where: { id: file.id }, data: { processed: true } })
      }

      return reply.status(201).send({
        id:          file.id,
        originalName: file.originalName,
        storagePath: file.storagePath,
        fileType:    file.fileType,
        sizeBytes:   file.sizeBytes,
        processed:   false, // processamento em background
        previewUrl:  null,  // disponível após processamento
      })
    }
  )

  // GET /api/v1/orders/:orderId/items/:itemId/files
  // Listar ficheiros de um item
  app.get<{ Params: { orderId: string; itemId: string } }>(
    '/orders/:orderId/items/:itemId/files',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { orderId, itemId } = req.params

      const item = await app.prisma.orderItem.findFirst({
        where: { id: itemId, serviceOrderId: orderId, tenantId: req.tenantId! },
      })
      if (!item) return reply.status(404).send({ error: 'Item não encontrado' })

      const files = await app.prisma.orderFile.findMany({
        where: { orderItemId: itemId, tenantId: req.tenantId! },
        orderBy: { createdAt: 'asc' },
      })

      return files.map(f => ({
        id:           f.id,
        originalName: f.originalName,
        storagePath:  f.storagePath,
        previewPath:  f.previewPath,
        fileType:     f.fileType,
        sizeBytes:    f.sizeBytes,
        processed:    f.processed,
        areaM2:       f.areaM2 ? Number(f.areaM2) : null,
        bboxWidthMm:  f.bboxWidthMm ? Number(f.bboxWidthMm) : null,
        bboxHeightMm: f.bboxHeightMm ? Number(f.bboxHeightMm) : null,
        perimeterMm:  f.perimeterMm ? Number(f.perimeterMm) : null,
        previewUrl:   f.previewPath ? `/uploads/${f.previewPath}` : null,
      }))
    }
  )

  // DELETE /api/v1/orders/:orderId/items/:itemId/files/:fileId
  app.delete<{ Params: { orderId: string; itemId: string; fileId: string } }>(
    '/orders/:orderId/items/:itemId/files/:fileId',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { orderId, itemId, fileId } = req.params

      const file = await app.prisma.orderFile.findFirst({
        where: { id: fileId, orderItemId: itemId, tenantId: req.tenantId! },
      })
      if (!file) return reply.status(404).send({ error: 'Ficheiro não encontrado' })
      // verify item belongs to order
      const ownerItem = await app.prisma.orderItem.findFirst({
        where: { id: itemId, serviceOrderId: orderId, tenantId: req.tenantId! },
      })
      if (!ownerItem) return reply.status(404).send({ error: 'Item não encontrado' })

      await app.prisma.orderFile.delete({ where: { id: fileId } })
      return { ok: true }
    }
  )
}
