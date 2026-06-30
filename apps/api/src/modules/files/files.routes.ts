// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../../shared/middleware/auth.js'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { spawn } from 'child_process'
import { join, extname, dirname, resolve } from 'path'
import { randomUUID } from 'crypto'
import { UPLOADS_DIR } from '../../shared/config.js'

const cleanBodySchema = z.object({
  handles: z.array(z.string().max(64)).max(10_000),
})

const DXF_PROCESSOR      = resolve('/var/www/fabriq/services/dxf-processor/process_dxf.py')
const DXF_EXPORT_SCRIPT  = resolve('/var/www/fabriq/services/dxf-processor/export_entities.py')
const DXF_CLEAN_SCRIPT   = resolve('/var/www/fabriq/services/dxf-processor/clean_dxf.py')
const ALLOWED_EXTS  = new Set(['.dxf', '.dwg', '.pdf', '.png', '.jpg', '.jpeg'])
const MAX_BYTES     = 50 * 1024 * 1024  // 50 MB

function fileType(ext: string): string {
  if (ext === '.dxf') return 'dxf'
  if (ext === '.dwg') return 'dwg'
  if (ext === '.pdf') return 'pdf'
  return 'image'
}

function runPython(args: string[], timeoutMs = 60_000): Promise<unknown> {
  return new Promise((res) => {
    const py = spawn('python3', args)
    let out = '', err = ''
    py.stdout.on('data', (d: Buffer) => (out += d))
    py.stderr.on('data', (d: Buffer) => (err += d))  // drain stderr so Python never blocks
    const timer = setTimeout(() => { py.kill(); res({ ok: false, error: 'Timeout' }) }, timeoutMs)
    py.on('close', () => {
      clearTimeout(timer)
      try { res(JSON.parse(out.trim())) }
      catch { res({ ok: false, error: err.trim() || 'Resposta inválida' }) }
    })
    py.on('error', e => { clearTimeout(timer); res({ ok: false, error: e.message }) })
  })
}

function runProcessor(inputPath: string, previewPath: string): Promise<DxfResult> {
  return runPython([DXF_PROCESSOR, inputPath, previewPath]) as Promise<DxfResult>
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

  // ── Editor DXF ─────────────────────────────────────────────────────────────

  // GET /api/v1/files/:fileId/entities — exporta entidades do DXF para o editor
  app.get<{ Params: { fileId: string } }>(
    '/files/:fileId/entities',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const file = await app.prisma.orderFile.findFirst({
        where: { id: req.params.fileId, tenantId: req.tenantId! },
      })
      if (!file) return reply.status(404).send({ error: 'Ficheiro não encontrado' })
      if (file.fileType !== 'dxf' && file.fileType !== 'dwg') {
        return reply.status(400).send({ error: 'Apenas ficheiros DXF/DWG são editáveis' })
      }

      const absPath = join(UPLOADS_DIR, file.storagePath)
      const result  = await runPython([DXF_EXPORT_SCRIPT, absPath]) as any
      if (!result.ok) return reply.status(500).send({ error: result.error })
      return result
    }
  )

  // POST /api/v1/files/:fileId/clean — remove entidades pelo handle e gera DXF limpo
  app.post<{ Params: { fileId: string }; Body: { handles: string[] } }>(
    '/files/:fileId/clean',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const parsed = cleanBodySchema.safeParse(req.body ?? {})
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
      const { handles } = parsed.data
      if (!handles.length) return reply.status(400).send({ error: 'Nenhum handle fornecido' })

      const file = await app.prisma.orderFile.findFirst({
        where: { id: req.params.fileId, tenantId: req.tenantId! },
      })
      if (!file) return reply.status(404).send({ error: 'Ficheiro não encontrado' })
      if (file.fileType !== 'dxf' && file.fileType !== 'dwg') {
        return reply.status(400).send({ error: 'Apenas DXF/DWG podem ser limpos' })
      }

      const inputPath   = join(UPLOADS_DIR, file.storagePath)
      const cleanedName = `${randomUUID()}_clean.dxf`
      const cleanedDir  = join(UPLOADS_DIR, 'dxf', req.tenantId!)
      const cleanedPath = join(cleanedDir, cleanedName)

      await mkdir(cleanedDir, { recursive: true })
      const result = await runPython([DXF_CLEAN_SCRIPT, inputPath, cleanedPath, ...handles]) as any
      if (!result.ok) return reply.status(500).send({ error: result.error })

      // regenerar preview em background (não bloqueia resposta)
      const previewName = `${randomUUID()}_clean.png`
      const previewPath = join(UPLOADS_DIR, 'previews', req.tenantId!, previewName)
      await mkdir(join(UPLOADS_DIR, 'previews', req.tenantId!), { recursive: true })
      const procResult  = await runProcessor(cleanedPath, previewPath) as DxfResult

      // actualizar registo com o ficheiro limpo
      const updated = await app.prisma.orderFile.update({
        where: { id: file.id },
        data: {
          storagePath:  `dxf/${req.tenantId!}/${cleanedName}`,
          previewPath:  procResult.ok ? `previews/${req.tenantId!}/${previewName}` : file.previewPath,
          areaM2:       procResult.areaM2       ?? file.areaM2,
          bboxWidthMm:  procResult.bboxWidthMm  ?? file.bboxWidthMm,
          bboxHeightMm: procResult.bboxHeightMm ?? file.bboxHeightMm,
          perimeterMm:  procResult.perimeterMm  ?? file.perimeterMm,
        },
      })

      // remover ficheiro original do disco (agora substituído pelo limpo)
      unlink(inputPath).catch(() => {})

      return {
        ok:        true,
        removed:   result.removed,
        remaining: result.remaining,
        fileId:    updated.id,
        previewUrl: updated.previewPath ? `/uploads/${updated.previewPath}` : null,
        areaM2:    updated.areaM2    ? Number(updated.areaM2)    : null,
        perimeterMm: updated.perimeterMm ? Number(updated.perimeterMm) : null,
      }
    }
  )
}
