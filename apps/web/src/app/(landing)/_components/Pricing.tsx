// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ScrollReveal } from './ScrollReveal'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fabriq.pt'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 49, yearly: 490 },
    description: 'Para empresas a começar a digitalizar a produção.',
    features: [
      'Até 150 ordens/mês',
      '5 operadores',
      '3 administradores',
      '1 máquina',
      'PWA operador',
      'Relatórios básicos',
      'Suporte por email',
    ],
    cta: 'Começar com Starter',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 99, yearly: 990 },
    description: 'Para empresas em crescimento que precisam de mais controlo.',
    features: [
      'Ordens ilimitadas',
      '20 operadores',
      '10 administradores',
      '3 máquinas',
      'PWA operador avançado',
      'IA de parâmetros de corte',
      'Faturação completa',
      'Notificações WhatsApp',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
    cta: 'Activar Pro →',
    highlight: true,
    badge: 'Mais popular',
  },
  {
    id: 'factory',
    name: 'Factory',
    price: { monthly: 199, yearly: 1990 },
    description: 'Para operações de grande escala com múltiplas máquinas.',
    features: [
      'Tudo ilimitado',
      'Operadores ilimitados',
      'Admins ilimitados',
      'Máquinas ilimitadas',
      'IA de parâmetros avançada',
      'API aberta (integração ERP)',
      'Multi-máquina dashboard',
      'Onboarding personalizado',
      'Suporte dedicado',
    ],
    cta: 'Contactar para Factory',
    highlight: false,
  },
]

export function Pricing() {
  const router = useRouter()
  const [yearly, setYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handlePlanClick(planId: string) {
    setLoadingPlan(planId)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fabriq_token') : null

      if (token) {
        // Utilizador autenticado → criar checkout Stripe directamente
        const res = await fetch(`${API_URL}/api/v1/billing/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: planId }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          router.push('/billing')
        }
      } else {
        // Não autenticado → registar com plano em ?plan=
        router.push(`/register?plan=${planId}`)
      }
    } catch {
      router.push(`/register?plan=${planId}`)
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section className="bg-zinc-50 py-24 px-6" id="precos">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <p className="text-[#EAB308] text-sm font-black tracking-widest uppercase mb-4">Preços</p>
          <h2 className="font-display font-black text-[#07080A] text-3xl md:text-5xl leading-tight mb-4 max-w-2xl">
            Um preço justo.<br />Sem surpresas.
          </h2>
          <p className="text-zinc-500 text-lg mb-8">Cancela quando quiseres. Sem contratos anuais forçados.</p>

          {/* Toggle */}
          <div className="flex items-center gap-3 mb-12">
            <span className={`text-sm font-semibold ${!yearly ? 'text-[#07080A]' : 'text-zinc-400'}`}>Mensal</span>
            <button
              onClick={() => setYearly(y => !y)}
              className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-[#EAB308]' : 'bg-zinc-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${yearly ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm font-semibold ${yearly ? 'text-[#07080A]' : 'text-zinc-400'}`}>
              Anual <span className="text-[#EAB308] text-xs font-black ml-1">2 MESES GRÁTIS</span>
            </span>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 100}>
              <div className={`relative rounded-2xl p-8 flex flex-col h-full transition-all ${
                plan.highlight
                  ? 'bg-[#07080A] border-2 border-[#EAB308] shadow-2xl shadow-[#EAB308]/10 scale-[1.02]'
                  : 'bg-white border border-zinc-200 hover:shadow-lg'
              }`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EAB308] text-black text-xs font-black px-4 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`font-display font-black text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-[#07080A]'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-4 ${plan.highlight ? 'text-white/50' : 'text-zinc-500'}`}>{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className={`font-display font-black text-4xl ${plan.highlight ? 'text-white' : 'text-[#07080A]'}`}>
                      €{yearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly}
                    </span>
                    <span className={`text-sm mb-1 ${plan.highlight ? 'text-white/40' : 'text-zinc-400'}`}>/mês</span>
                  </div>
                  {yearly && (
                    <p className={`text-xs mt-1 ${plan.highlight ? 'text-[#EAB308]' : 'text-[#EAB308]'}`}>
                      Faturado €{plan.price.yearly}/ano
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-[#EAB308]' : 'text-[#07080A]'}`}>✓</span>
                      <span className={`text-sm ${plan.highlight ? 'text-white/70' : 'text-zinc-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full text-center font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-60 ${
                    plan.highlight
                      ? 'bg-[#EAB308] hover:bg-[#CA8A04] text-black'
                      : 'border border-zinc-300 hover:border-[#07080A] text-[#07080A] hover:bg-zinc-50'
                  }`}
                >
                  {loadingPlan === plan.id
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />A processar...</span>
                    : plan.cta
                  }
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Scarcity + guarantee */}
        <div className="grid md:grid-cols-2 gap-6">
          <ScrollReveal delay={100}>
            <div className="bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-2xl p-6">
              <p className="font-black text-[#07080A] text-sm mb-2">⚡ Apenas 5 vagas disponíveis este mês</p>
              <p className="text-zinc-600 text-sm">Limitamos os onboardings mensais para garantir acompanhamento personalizado a cada novo cliente. Não fiques de fora.</p>
              {/* Progress bar */}
              <div className="mt-4 bg-zinc-200 rounded-full h-2">
                <div className="bg-[#EAB308] h-2 rounded-full" style={{ width: '58%' }} />
              </div>
              <p className="text-zinc-500 text-xs mt-1">7 de 12 vagas ocupadas</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <p className="font-black text-[#07080A] text-sm mb-2">Garantia de 30 dias</p>
              <p className="text-zinc-600 text-sm">Se não reduzires o tempo de gestão operacional, devolvemos o valor integralmente — sem perguntas, sem burocracia.</p>
              <p className="text-zinc-400 text-xs mt-3">Sem cartão de crédito para começar · Cancela em 2 cliques</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
