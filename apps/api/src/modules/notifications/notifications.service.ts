// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import type { PrismaClient } from '@prisma/client'

interface NotifyPayload {
  prisma: PrismaClient
  tenantId: string
  orderId: string
  event: 'order.created' | 'stage.started' | 'stage.completed' | 'order.completed' | 'order.cancelled'
}

interface TenantSettings {
  evolutionApiUrl?: string
  evolutionApiKey?: string
  evolutionInstance?: string
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  smtpFrom?: string
}

const eventMessages: Record<string, (data: { orderNumber: string; authCode?: string; stageName?: string }) => string> = {
  'order.created':    ({ orderNumber }) => `⚙️ Nova ordem *${orderNumber}* foi criada e aguarda execução.`,
  'stage.started':    ({ orderNumber, stageName }) => `🔄 A etapa *${stageName}* da ordem *${orderNumber}* foi iniciada.`,
  'stage.completed':  ({ orderNumber, stageName }) => `✅ A etapa *${stageName}* da ordem *${orderNumber}* foi concluída.`,
  'order.completed':  ({ orderNumber, authCode }) => `✅ Ordem *${orderNumber}* concluída!\n\nCód. autenticidade: \`${authCode}\`\n\nAceda a https://app.fabriq.pt/verificar/${authCode} para verificar.`,
  'order.cancelled':  ({ orderNumber }) => `❌ Ordem *${orderNumber}* foi cancelada.`,
}

export async function notifyOrderEvent(payload: NotifyPayload): Promise<void> {
  const { prisma, tenantId, orderId, event } = payload

  const [order, tenant] = await Promise.all([
    prisma.serviceOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        requester: true,
        stages: { orderBy: { stageNumber: 'asc' }, where: { status: { in: ['in_progress', 'completed'] } }, take: 1 },
      },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } }),
  ])

  if (!order) return

  const settings = (tenant?.settings ?? {}) as TenantSettings
  const currentStage = order.stages[0]
  const stageLabels: Record<string, string> = { laser_cnc: 'Corte CNC', bending: 'Quinagem', guillotine: 'Guilhotina' }

  const messageText = eventMessages[event]?.({
    orderNumber: order.orderNumber,
    authCode: order.authCode,
    stageName: currentStage ? stageLabels[currentStage.type] : undefined,
  })

  if (!messageText) return

  // Tentar WhatsApp se Evolution API configurada
  if (settings.evolutionApiUrl && settings.evolutionApiKey && order.requester?.phone) {
    await sendWhatsApp(
      settings.evolutionApiUrl,
      settings.evolutionApiKey,
      settings.evolutionInstance ?? 'fabriq',
      order.requester.phone,
      messageText,
    )
    await logNotification(prisma, tenantId, 'whatsapp', order.requester.phone, undefined, event, 'sent')
  } else if (order.requester?.email) {
    // Fallback para email
    await logNotification(prisma, tenantId, 'email', undefined, order.requester.email, event, 'pending')
    // SMTP será implementado na próxima iteração
  }
}

async function sendWhatsApp(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phone: string,
  message: string,
): Promise<void> {
  const normalizedPhone = phone.replace(/\D/g, '')
  const body = JSON.stringify({ number: normalizedPhone, text: message })

  const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body,
  })

  if (!res.ok) {
    throw new Error(`Evolution API erro: ${res.status}`)
  }
}

async function logNotification(
  prisma: PrismaClient,
  tenantId: string,
  channel: 'whatsapp' | 'email',
  phone: string | undefined,
  email: string | undefined,
  template: string,
  status: 'sent' | 'pending' | 'failed',
): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      tenantId,
      channel,
      recipientPhone: phone,
      recipientEmail: email,
      template,
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
    },
  })
}
