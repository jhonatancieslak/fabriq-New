// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Script único: cria produtos e preços no Stripe e imprime os Price IDs para o .env

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-06-24.dahlia' as any })

const PLANS = [
  { name: 'Starter', id: 'starter', price: 4900, description: '150 ordens/mês, 5 operadores, 3 admins, 1 máquina' },
  { name: 'Pro',     id: 'pro',     price: 9900, description: 'Ilimitado, 20 operadores, 10 admins, 3 máquinas' },
  { name: 'Factory', id: 'factory', price: 19900, description: 'Tudo ilimitado' },
]

async function main() {
  console.log('Criando produtos e preços no Stripe (modo teste)...\n')
  const result: Record<string, string> = {}

  for (const plan of PLANS) {
    const product = await stripe.products.create({
      name: `FABRIQ.IA — ${plan.name}`,
      description: plan.description,
      metadata: { plan_id: plan.id },
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: { plan_id: plan.id },
    })

    result[plan.id] = price.id
    console.log(`✅ ${plan.name}: ${price.id}`)
  }

  console.log('\n─── Adicionar ao .env ───────────────────────────────')
  console.log(`STRIPE_PRICE_STARTER=${result.starter}`)
  console.log(`STRIPE_PRICE_PRO=${result.pro}`)
  console.log(`STRIPE_PRICE_FACTORY=${result.factory}`)
  console.log('─────────────────────────────────────────────────────')
}

main().catch(console.error)
