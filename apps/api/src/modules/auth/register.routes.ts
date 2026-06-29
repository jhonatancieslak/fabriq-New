// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { hashPassword } from '../../shared/utils/crypto.js'
import nodemailer from 'nodemailer'

const registerSchema = z.object({
  companyName:   z.string().min(2).max(100),
  slug:          z.string().regex(/^[a-z0-9-]+$/, 'Slug: apenas letras minúsculas, números e hífens').min(2).max(30).optional(),
  adminName:     z.string().min(2).max(80),
  adminEmail:    z.string().email(),
  adminPassword: z.string().min(8),
  phone:         z.string().optional(),
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

function getMailer() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 587,
    auth: { user: 'resend', pass: apiKey },
  })
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const mailer = getMailer()
  if (!mailer) return
  const from = process.env.EMAIL_FROM ?? 'FABRIQ.IA <noreply@fabriq.pt>'
  await mailer.sendMail({ from, to, subject, html }).catch(() => { /* non-critical */ })
}

function welcomeEmailHtml(adminName: string, companyName: string, email: string): string {
  const appUrl = process.env.APP_URL ?? 'https://sistema.fabriq.pt'
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
        <div style="background:#EAB308;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
          <span style="font-size:16px">⚡</span>
        </div>
        <span style="font-weight:900;font-size:18px;letter-spacing:-0.5px">FABRIQ<span style="color:#EAB308">.IA</span></span>
      </div>
      <h2 style="color:#07080A;font-size:20px;margin-bottom:8px">Bem-vindo, ${adminName}!</h2>
      <p style="color:#374151;font-size:15px;line-height:1.6">
        A conta <strong>${companyName}</strong> foi criada com sucesso.<br>
        Tens <strong>14 dias de trial gratuito</strong> para explorar a plataforma sem limitações.
      </p>
      <a href="${appUrl}" style="display:inline-block;margin-top:20px;background:#EAB308;color:#07080A;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
        Aceder ao painel →
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#6b7280;font-size:12px">Email de acesso: <strong>${email}</strong></p>
      <p style="color:#9ca3af;font-size:12px;margin-top:8px">FABRIQ.IA — Gestão de Produção Industrial</p>
    </div>
  </body></html>`
}

function superAdminNotificationHtml(companyName: string, slug: string, adminEmail: string): string {
  const appUrl = process.env.APP_URL ?? 'https://sistema.fabriq.pt'
  const now = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#07080A;border-radius:12px;padding:32px;border:1px solid #1f2937">
      <span style="font-weight:900;font-size:18px;color:#fff;letter-spacing:-0.5px">FABRIQ<span style="color:#EAB308">.IA</span></span>
      <h2 style="color:#EAB308;font-size:16px;margin-top:20px">🆕 Novo registo de empresa</h2>
      <table style="color:#d1d5db;font-size:14px;border-collapse:collapse;width:100%;margin-top:16px">
        <tr><td style="padding:6px 0;color:#9ca3af;width:120px">Empresa</td><td><strong style="color:#fff">${companyName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#9ca3af">Slug</td><td><code style="color:#EAB308">${slug}</code></td></tr>
        <tr><td style="padding:6px 0;color:#9ca3af">Email admin</td><td>${adminEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#9ca3af">Plano</td><td>Trial (14 dias)</td></tr>
        <tr><td style="padding:6px 0;color:#9ca3af">Data</td><td>${now}</td></tr>
      </table>
      <a href="${appUrl}/superadmin" style="display:inline-block;margin-top:20px;background:#EAB308;color:#07080A;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">
        Ver no Superadmin →
      </a>
    </div>
  </body></html>`
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/register — registo público de novo tenant + admin
  app.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    handler: async (req, reply) => {
      const body = registerSchema.safeParse(req.body)
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

      const { companyName, adminName, adminEmail, adminPassword, phone } = body.data
      const slug = body.data.slug ?? generateSlug(companyName)

      // Verificar duplicados
      const [existingSlug, existingEmail] = await Promise.all([
        app.prisma.tenant.findUnique({ where: { slug }, select: { id: true } }),
        app.prisma.user.findFirst({ where: { email: adminEmail }, select: { id: true } }),
      ])

      if (existingSlug) return reply.status(409).send({ error: 'Slug já em uso. Escolhe outro nome de empresa.', field: 'slug' })
      if (existingEmail) return reply.status(409).send({ error: 'Email já registado.', field: 'adminEmail' })

      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      const passwordHash = await hashPassword(adminPassword)

      // Criar tenant e admin na mesma transacção
      const tenant = await app.prisma.tenant.create({
        data: {
          slug,
          name: companyName,
          plan: 'trial',
          trialEndsAt,
          isActive: true,
          settings: {},
          users: {
            create: {
              name: adminName,
              email: adminEmail,
              passwordHash,
              role: 'admin',
              isActive: true,
            },
          },
        },
        include: {
          users: { select: { id: true, name: true, role: true, email: true } },
        },
      })

      const user = tenant.users[0]!

      // Gerar tokens (igual ao login)
      const { createHash, randomBytes } = await import('crypto')
      const accessToken = app.jwt.sign(
        { userId: user.id, tenantId: tenant.id, role: user.role, isSuperAdmin: 'false' },
        { expiresIn: '15m' },
      )
      const rawRefresh = randomBytes(48).toString('hex')
      const tokenHash = createHash('sha256').update(rawRefresh).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await app.prisma.refreshToken.create({ data: { tokenHash, expiresAt, userId: user.id } })

      // Emails (fire-and-forget)
      Promise.all([
        sendEmail(adminEmail, `Bem-vindo ao FABRIQ.IA — ${companyName}`, welcomeEmailHtml(adminName, companyName, adminEmail)),
        sendEmail('jhonatan.cieslak94@gmail.com', `[FABRIQ] Novo registo: ${companyName}`, superAdminNotificationHtml(companyName, slug, adminEmail)),
      ]).catch(() => { /* non-critical */ })

      return reply.status(201).send({
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          plan: tenant.plan,
          trialEndsAt: tenant.trialEndsAt,
        },
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          email: user.email,
        },
        tokens: {
          accessToken,
          refreshToken: rawRefresh,
        },
      })
    },
  })
}
