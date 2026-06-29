// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { ScrollReveal } from './ScrollReveal'

const pains = [
  {
    number: '01',
    title: 'Ordens perdidas ou duplicadas',
    body: 'Sem rastreabilidade em tempo real, uma ordem pode ser esquecida, faturada a mais ou entregue ao cliente errado. E quando descubres, o estrago já está feito.',
  },
  {
    number: '02',
    title: 'O operador não sabe o que fazer a seguir',
    body: 'Sem acesso digital à ordem, o operador liga para o escritório. Quatro, cinco, seis vezes por dia. E a produção pára enquanto espera.',
  },
  {
    number: '03',
    title: 'Faturação que demora dias',
    body: 'Cada mês são horas a reconciliar ordens com notas de entrega, materiais e horas de máquina. Manualmente. Em Excel. Com erros que custam dinheiro.',
  },
]

export function Problem() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <p className="text-[#EAB308] text-sm font-black tracking-widest uppercase mb-4">O problema real</p>
          <h2 className="font-display font-black text-[#07080A] text-3xl md:text-5xl leading-tight mb-6 max-w-3xl">
            Geres a tua empresa com WhatsApp, Excel e esperança?
          </h2>
          <p className="text-zinc-500 text-lg max-w-2xl mb-16 leading-relaxed">
            Não és o único. Mas isso não significa que tens de continuar assim.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pains.map((pain, i) => (
            <ScrollReveal key={pain.number} delay={i * 120}>
              <div className="border border-zinc-200 rounded-2xl p-8 hover:border-[#EAB308]/40 hover:shadow-lg transition-all group">
                <span className="font-display font-black text-5xl text-zinc-100 group-hover:text-[#EAB308]/20 transition-colors block mb-4">
                  {pain.number}
                </span>
                <h3 className="font-display font-bold text-[#07080A] text-xl mb-3">{pain.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{pain.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <div className="bg-[#07080A] rounded-2xl p-8 md:p-12 text-center">
            <p className="text-white/50 text-sm uppercase tracking-widest font-bold mb-3">A verdade que ninguém diz</p>
            <p className="font-display font-black text-white text-2xl md:text-3xl max-w-3xl mx-auto leading-snug">
              Isso não é um problema de gestão —{' '}
              <span className="text-[#EAB308]">é um problema de sistema.</span>{' '}
              E custa-te dinheiro real todos os dias que passa.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
