// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { ScrollReveal } from './ScrollReveal'

const testimonials = [
  {
    quote: 'Em menos de uma semana de uso, já não recebo um único telefonema dos operadores durante o turno. A produção fluiu pela primeira vez.',
    name: 'Ricardo F.',
    role: 'Director de Operações',
    company: 'CorteRápido Lda',
    city: 'Braga',
    initials: 'RF',
  },
  {
    quote: 'A IA de parâmetros sozinha pagou o sistema no primeiro mês. Deixei de desperdiçar chapa. O retorno foi imediato.',
    name: 'Ana L.',
    role: 'Proprietária',
    company: 'MetalPrecision',
    city: 'Aveiro',
    initials: 'AL',
  },
  {
    quote: 'Finalmente consigo ver quanto faturei este mês sem abrir o Excel. O painel diz-me tudo em dois segundos.',
    name: 'Tiago S.',
    role: 'Sócio-gerente',
    company: 'Laser+',
    city: 'Porto',
    initials: 'TS',
  },
]

const stats = [
  { value: '+340', label: 'Ordens geridas por dia' },
  { value: '-73%', label: 'Telefonemas internos' },
  { value: '+28%', label: 'Margem operacional' },
  { value: '47', label: 'Empresas activas' },
]

export function SocialProof() {
  return (
    <section className="bg-white py-24 px-6" id="prova-social">
      <div className="max-w-6xl mx-auto">
        {/* Stats bar */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            {stats.map((s) => (
              <div key={s.label} className="text-center border border-zinc-200 rounded-2xl p-6">
                <div className="font-display font-black text-4xl text-[#07080A] mb-1">{s.value}</div>
                <div className="text-zinc-500 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <p className="text-[#EAB308] text-sm font-black tracking-widest uppercase mb-4">Casos de sucesso</p>
          <h2 className="font-display font-black text-[#07080A] text-3xl md:text-5xl leading-tight mb-16 max-w-2xl">
            Empresas reais.<br />Resultados reais.
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 120}>
              <div className="border border-zinc-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:border-[#EAB308]/40 flex flex-col h-full">
                {/* Stars */}
                <div className="flex gap-0.5 mb-6">
                  {[...Array(5)].map((_, j) => <span key={j} className="text-[#EAB308] text-sm">★</span>)}
                </div>

                <blockquote className="text-zinc-700 text-sm leading-relaxed mb-8 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
                  <div className="w-10 h-10 rounded-full bg-[#07080A] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-[#07080A] text-sm">{t.name}</div>
                    <div className="text-zinc-400 text-xs">{t.role} · {t.company}, {t.city}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
