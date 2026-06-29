// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import Stripe from 'stripe'
import type { PrismaClient } from '@prisma/client'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-06-24.dahlia' as any,
})

// Map Price ID → plano interno
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER ?? '']: 'starter',
  [process.env.STRIPE_PRICE_PRO     ?? '']: 'pro',
  [process.env.STRIPE_PRICE_FACTORY ?? '']: 'factory',
}

export const PLAN_TO_PRICE: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro:     process.env.STRIPE_PRICE_PRO     ?? '',
  factory: process.env.STRIPE_PRICE_FACTORY ?? '',
}

// Criar (ou recuperar) customer Stripe para um tenant
export async function getOrCreateCustomer(prisma: PrismaClient, tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeCustomerId: true, name: true, slug: true },
  })
  if (!tenant) throw new Error('Tenant não encontrado')

  if (tenant.stripeCustomerId) return tenant.stripeCustomerId

  const customer = await stripe.customers.create({
    name: tenant.name,
    metadata: { tenantId, slug: tenant.slug },
  })

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

// Criar Checkout Session para upgrade
export async function createCheckoutSession(
  prisma: PrismaClient,
  tenantId: string,
  plan: 'starter' | 'pro' | 'factory',
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const customerId = await getOrCreateCustomer(prisma, tenantId)
  const priceId = PLAN_TO_PRICE[plan]
  if (!priceId) throw new Error(`Plano "${plan}" não configurado`)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId, plan },
    subscription_data: { metadata: { tenantId, plan } },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  return session.url!
}

// Criar Customer Portal Session (gestão de subscrição)
export async function createPortalSession(
  prisma: PrismaClient,
  tenantId: string,
  returnUrl: string,
): Promise<string> {
  const customerId = await getOrCreateCustomer(prisma, tenantId)
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}

// Processar evento de webhook
export async function handleWebhookEvent(prisma: PrismaClient, event: Stripe.Event): Promise<void> {
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break
      const tenantId = session.metadata?.tenantId
      const plan = session.metadata?.plan
      if (!tenantId || !plan) break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string) as any
      const priceId = sub.items.data[0]?.price.id

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan: plan as any,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          planExpiresAt: new Date(sub.current_period_end * 1000),
          trialEndsAt: null,
        },
      })
      console.log(`[Stripe] Checkout concluído: tenant=${tenantId} plan=${plan}`)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as any
      const subId = invoice.subscription as string
      if (!subId) break

      const tenant = await prisma.tenant.findFirst({
        where: { stripeSubscriptionId: subId },
        select: { id: true, plan: true },
      })
      if (!tenant) break

      const sub = await stripe.subscriptions.retrieve(subId) as any
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { planExpiresAt: new Date(sub.current_period_end * 1000) },
      })
      console.log(`[Stripe] Fatura paga: tenant=${tenant.id}`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      const subId = invoice.subscription as string
      if (!subId) break

      const tenant = await prisma.tenant.findFirst({
        where: { stripeSubscriptionId: subId },
        select: { id: true },
      })
      if (!tenant) break
      // Não bloqueia imediatamente — Stripe vai retentar. Apenas log.
      console.warn(`[Stripe] Pagamento falhado: tenant=${tenant.id}`)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as any
      const tenantId = sub.metadata?.tenantId
      if (!tenantId) break

      const priceId = sub.items.data[0]?.price.id
      const plan = PRICE_TO_PLAN[priceId] ?? null

      if (sub.status === 'active' && plan) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan: plan as any,
            stripePriceId: priceId,
            planExpiresAt: new Date(sub.current_period_end * 1000),
          },
        })
        console.log(`[Stripe] Subscrição atualizada: tenant=${tenantId} plan=${plan}`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as any
      const tenantId = sub.metadata?.tenantId
      if (!tenantId) break

      // Downgrade para trial expirado — isActive mantém-se (admin pode reativar)
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan: 'trial',
          stripeSubscriptionId: null,
          stripePriceId: null,
          planExpiresAt: new Date(), // expirado agora
        },
      })
      console.log(`[Stripe] Subscrição cancelada: tenant=${tenantId} → trial expirado`)
      break
    }
  }
}
