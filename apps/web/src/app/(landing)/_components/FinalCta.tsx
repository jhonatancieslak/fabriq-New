// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import Link from 'next/link'
import { ScrollReveal } from './ScrollReveal'

export function FinalCta() {
  return (
    <section className="bg-[#07080A] py-24 px-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#EAB308 1px, transparent 1px), linear-gradient(90deg, #EAB308 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#EAB308]/40 to-transparent" />

      <div className="relative max-w-4xl mx-auto text-center">
        <ScrollReveal>
          <p className="text-[#EAB308] text-sm font-black tracking-widest uppercase mb-6">Não esperes mais</p>
          <h2 className="font-display font-black text-white text-4xl md:text-6xl leading-tight mb-6">
            A tua concorrência<br />já está a olhar para isto.
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Cada dia sem sistema é dinheiro deixado em cima da mesa.
            Começa hoje — configuração em menos de 15 minutos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-[#EAB308] hover:bg-[#CA8A04] text-black font-black text-lg px-10 py-5 rounded-xl transition-all hover:scale-105 shadow-xl shadow-[#EAB308]/20"
            >
              Activar o FABRIQ.IA agora →
            </Link>
          </div>

          <p className="text-white/30 text-sm">
            Sem cartão de crédito · Sem contrato anual · Cancela em 2 cliques
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
