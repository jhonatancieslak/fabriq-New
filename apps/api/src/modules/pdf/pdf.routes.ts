// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import { generateCuttingSheetHtml } from './pdf.service.js'

export async function pdfRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/pdf/orders/:id/cutting-sheet
  // Devolve HTML da folha de corte (o browser imprime / converte para PDF)
  app.get('/orders/:id/cutting-sheet', {
    preHandler: [requireAuth, requireRole('admin', 'viewer', 'requester')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const html = await generateCuttingSheetHtml(app.prisma, id, req.tenantId!)
      return reply
        .header('Content-Type', 'text/html; charset=utf-8')
        .send(html)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'ORDER_NOT_FOUND') return reply.status(404).send({ error: 'Ordem não encontrada' })
      throw err
    }
  })
}
