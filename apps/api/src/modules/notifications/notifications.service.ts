// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'

export type OrderEvent = 'order.created' | 'stage.started' | 'stage.completed' | 'order.completed' | 'order.cancelled'

interface NotifyPayload {
  prisma: PrismaClient
  tenantId: string
  orderId: string
  event: OrderEvent
  stageId?: string
}

interface TenantSettings {
  evolutionApiUrl?: string
  evolutionApiKey?: string
  evolutionInstance?: string
}

const APP_URL = process.env.APP_URL ?? 'https://sistema.fabriq.pt'

const STAGE_LABELS: Record<string, string> = {
  laser_cnc: 'Corte CNC Laser', cnc_router: 'CNC Router', plasma: 'Plasma',
  waterjet: 'Corte a Água', bending: 'Quinagem', guillotine: 'Guilhotina',
  welding: 'Soldadura', turning: 'Torneamento', milling: 'Fresagem', other: 'Outro',
}

function whatsappText(event: OrderEvent, orderNumber: string, authCode: string, stageName?: string): string {
  switch (event) {
    case 'order.created':
      return `⚙️ Nova ordem *${orderNumber}* criada e aguarda execução.`
    case 'stage.started':
      return `🔄 Etapa *${stageName ?? '—'}* da ordem *${orderNumber}* foi iniciada.`
    case 'stage.completed':
      return `✅ Etapa *${stageName ?? '—'}* da ordem *${orderNumber}* concluída.`
    case 'order.completed':
      return `✅ Ordem *${orderNumber}* concluída!\n\nCód. de autenticidade: \`${authCode}\`\n\nAceda a ${APP_URL.replace('sistema', 'app')}/verificar/${authCode} para verificar.`
    case 'order.cancelled':
      return `❌ Ordem *${orderNumber}* foi cancelada.`
  }
}

function emailSubject(event: OrderEvent, orderNumber: string): string {
  switch (event) {
    case 'order.created':    return `[FABRIQ] Nova ordem ${orderNumber}`
    case 'stage.started':    return `[FABRIQ] Ordem ${orderNumber} — etapa iniciada`
    case 'stage.completed':  return `[FABRIQ] Ordem ${orderNumber} — etapa concluída`
    case 'order.completed':  return `[FABRIQ] Ordem ${orderNumber} concluída`
    case 'order.cancelled':  return `[FABRIQ] Ordem ${orderNumber} cancelada`
  }
}

function emailHtml(event: OrderEvent, orderNumber: string, authCode: string, stageName?: string): string {
  const verifyUrl = `${APP_URL.replace('sistema', 'app')}/verificar/${authCode}`
  const body = whatsappText(event, orderNumber, authCode, stageName)
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace">$1</code>')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
        <div style="background:#EAB308;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
          <span style="font-size:16px">⚡</span>
        </div>
        <span style="font-weight:900;font-size:18px;letter-spacing:-0.5px">FABRIQ<span style="color:#EAB308">.IA</span></span>
      </div>
      <p style="font-size:15px;color:#111827;line-height:1.6">${body}</p>
      ${event === 'order.completed' ? `
        <a href="${verifyUrl}" style="display:inline-block;margin-top:16px;background:#EAB308;color:#07080A;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
          Verificar Ordem
        </a>
      ` : ''}
      <p style="margin-top:24px;font-size:12px;color:#9ca3af">FABRIQ.IA — Gestão de Produção Industrial</p>
    </div>
  </body></html>`
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
  await mailer.sendMail({ from, to, subject, html })
}

async function sendWhatsApp(apiUrl: string, apiKey: string, instance: string, phone: string, message: string): Promise<void> {
  const normalized = phone.replace(/\D/g, '')
  const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number: normalized, text: message }),
  })
  if (!res.ok) throw new Error(`Evolution API: ${res.status}`)
}

async function logNotification(
  prisma: PrismaClient,
  tenantId: string,
  channel: 'whatsapp' | 'email',
  phone: string | undefined,
  email: string | undefined,
  template: string,
  status: 'sent' | 'pending' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      tenantId, channel,
      recipientPhone: phone, recipientEmail: email,
      template, status, errorMessage,
      sentAt: status === 'sent' ? new Date() : undefined,
    },
  }).catch(() => { /* non-critical */ })
}

export async function notifyOrderEvent(payload: NotifyPayload): Promise<void> {
  const { prisma, tenantId, orderId, event, stageId } = payload

  const [order, tenant] = await Promise.all([
    prisma.serviceOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { requester: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } }),
  ])

  if (!order) return

  let stageName: string | undefined
  if (stageId) {
    const stage = await prisma.orderStage.findUnique({ where: { id: stageId }, select: { type: true } })
    stageName = stage ? (STAGE_LABELS[stage.type] ?? stage.type) : undefined
  }

  const settings = (tenant?.settings ?? {}) as TenantSettings
  const requester = order.requester

  if (!requester) return

  const msgText = whatsappText(event, order.orderNumber, order.authCode, stageName)
  const subject  = emailSubject(event, order.orderNumber)
  const html     = emailHtml(event, order.orderNumber, order.authCode, stageName)

  // WhatsApp — se Evolution API configurada e requester quer
  if (settings.evolutionApiUrl && settings.evolutionApiKey && requester.notifyWhatsapp && requester.phone) {
    try {
      await sendWhatsApp(settings.evolutionApiUrl, settings.evolutionApiKey,
        settings.evolutionInstance ?? 'fabriq', requester.phone, msgText)
      await logNotification(prisma, tenantId, 'whatsapp', requester.phone, undefined, event, 'sent')
    } catch (e) {
      await logNotification(prisma, tenantId, 'whatsapp', requester.phone, undefined, event, 'failed',
        e instanceof Error ? e.message : String(e))
    }
  }

  // Email — se RESEND_API_KEY configurada e requester quer
  if (process.env.RESEND_API_KEY && requester.notifyEmail && requester.email) {
    try {
      await sendEmail(requester.email, subject, html)
      await logNotification(prisma, tenantId, 'email', undefined, requester.email, event, 'sent')
    } catch (e) {
      await logNotification(prisma, tenantId, 'email', undefined, requester.email, event, 'failed',
        e instanceof Error ? e.message : String(e))
    }
  }
}
