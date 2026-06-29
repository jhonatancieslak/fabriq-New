// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../shared/middleware/auth.js'
import nodemailer from 'nodemailer'

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/v1/notifications/badge — contagem de itens pendentes para o header
  app.get('/badge', { preHandler: [requireAuth, requireRole('admin', 'financial')] }, async (req) => {
    const [pendingOrders, recentLogs] = await Promise.all([
      app.prisma.serviceOrder.count({
        where: { tenantId: req.tenantId!, status: 'pending' },
      }),
      app.prisma.notificationLog.count({
        where: {
          tenantId: req.tenantId!,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: 'sent',
        },
      }),
    ])
    return { pendingOrders, recentNotifications: recentLogs, total: pendingOrders }
  })

  // GET /api/v1/notifications/status — estado actual da configuração
  app.get('/status', { preHandler: [requireAuth, requireRole('admin')] }, async () => {
    const resendKey  = process.env.RESEND_API_KEY
    const emailFrom  = process.env.EMAIL_FROM
    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY

    return {
      email: {
        configured: !!(resendKey && resendKey.length > 0),
        from: emailFrom ?? null,
        provider: 'Resend SMTP',
      },
      whatsapp: {
        configured: !!(evolutionUrl && evolutionKey),
        apiUrl: evolutionUrl ?? null,
        provider: 'Evolution API',
      },
    }
  })

  // POST /api/v1/notifications/test-email — envia email de teste para o admin
  app.post('/test-email', { preHandler: [requireAuth, requireRole('admin')] }, async (req, reply) => {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return reply.status(400).send({ error: 'RESEND_API_KEY não configurada. Adicione ao ficheiro .env e reinicie o servidor.' })
    }

    const { to } = req.body as { to?: string }
    if (!to) return reply.status(400).send({ error: 'Campo "to" obrigatório' })

    const mailer = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      auth: { user: 'resend', pass: apiKey },
    })

    const from = process.env.EMAIL_FROM ?? 'FABRIQ.IA <noreply@fabriq.pt>'

    await mailer.sendMail({
      from,
      to,
      subject: '[FABRIQ] Email de teste — configuração confirmada ✓',
      html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:32px">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
            <div style="background:#EAB308;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:16px">⚡</span>
            </div>
            <span style="font-weight:900;font-size:18px;letter-spacing:-0.5px">FABRIQ<span style="color:#EAB308">.IA</span></span>
          </div>
          <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px">Email configurado com sucesso!</h2>
          <p style="font-size:14px;color:#374151;line-height:1.6">
            O serviço de notificações por email está a funcionar correctamente.<br>
            A partir de agora, os solicitadores receberão emails automáticos quando as suas ordens forem criadas, iniciadas e concluídas.
          </p>
          <div style="margin-top:20px;padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;color:#15803d">
            ✓ Resend SMTP configurado<br>
            ✓ Email de teste enviado com sucesso
          </div>
          <p style="margin-top:24px;font-size:12px;color:#9ca3af">FABRIQ.IA — Gestão de Produção Industrial</p>
        </div>
      </body></html>`,
    })

    return { ok: true, message: `Email de teste enviado para ${to}` }
  })
}
