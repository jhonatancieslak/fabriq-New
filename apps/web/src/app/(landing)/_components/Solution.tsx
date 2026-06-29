// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { ScrollReveal } from './ScrollReveal'

const pillars = [
  {
    title: 'Ordens de Serviço Digitais',
    body: 'Cria, atribui e rastreia cada ordem em segundos. Histórico completo, statuses em tempo real, numeração automática configurável.',
    img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=60',
  },
  {
    title: 'PWA para o Chão de Fábrica',
    body: 'O operador abre no telemóvel ou no browser da máquina, vê as ordens do turno, confirma execução. Sem papel. Sem telefonemas.',
    img: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&auto=format&fit=crop&q=60',
  },
  {
    title: 'Faturação Integrada',
    body: 'Converte ordens concluídas em facturas com um clique. Com materiais, tempo de máquina e mão-de-obra já calculados automaticamente.',
    img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
  },
  {
    title: 'IA de Parâmetros de Corte',
    body: 'Indica o material, espessura e tipo de corte. A IA sugere velocidade, potência e pressão. Menos desperdício, mais precisão, mais margem.',
    img: 'https://images.unsplash.com/photo-1565087693064-dc8e47b5aad2?w=600&auto=format&fit=crop&q=60',
  },
]

export function Solution() {
  return (
    <section className="bg-zinc-50 py-24 px-6" id="funcionalidades">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <p className="text-[#EAB308] text-sm font-black tracking-widest uppercase mb-4">A solução</p>
          <h2 className="font-display font-black text-[#07080A] text-3xl md:text-5xl leading-tight mb-4 max-w-3xl">
            O sistema operacional para fábricas de corte.
          </h2>
          <p className="text-zinc-500 text-lg max-w-2xl mb-16">
            Da ordem ao pagamento, tudo controlado. Dos parâmetros de corte ao relatório mensal, tudo automatizado.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6">
          {pillars.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 100} direction={i % 2 === 0 ? 'left' : 'right'}>
              <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:shadow-xl transition-all group">
                <div className="h-48 overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8">
                  <h3 className="font-display font-bold text-[#07080A] text-xl mb-3">{p.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{p.body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
