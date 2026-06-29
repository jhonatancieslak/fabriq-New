// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { ScrollReveal } from './ScrollReveal'

const features = [
  'Ordens com múltiplos statuses (pendente → em execução → concluído → faturado)',
  'Painel PWA — funciona offline, instalável no telemóvel e no browser da máquina',
  'IA de parâmetros: laser CO₂, fibra, CNC plasma e guilhotina',
  'Dashboard financeiro com receita mensal, tickets pendentes e crescimento',
  'Gestão de máquinas e manutenção preventiva',
  'Numeração de ordens configurável (prefixo, ano, sequencial)',
  'Controlo de acesso por perfil (admin, financeiro, operador, solicitador)',
  'Notificações por email e WhatsApp a cada etapa concluída',
  'Exportação de relatórios em PDF e XLS',
  'Portal do cliente para acompanhar as suas ordens em tempo real',
  'Auditoria completa de todas as acções do sistema',
  'API aberta para integração com ERPs e contabilidade',
]

export function Features() {
  return (
    <section className="bg-[#07080A] py-24 px-6" id="demo">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: feature list */}
          <div>
            <ScrollReveal direction="left">
              <p className="text-[#EAB308] text-sm font-black tracking-widest uppercase mb-4">Tudo incluído</p>
              <h2 className="font-display font-black text-white text-3xl md:text-4xl leading-tight mb-6">
                Tudo o que precisas.<br />
                <span className="text-white/40">Nada do que não precisas.</span>
              </h2>
            </ScrollReveal>
            <div className="space-y-3 mt-8">
              {features.map((f, i) => (
                <ScrollReveal key={i} delay={i * 50} direction="left">
                  <div className="flex items-start gap-3 group">
                    <span className="mt-1 w-5 h-5 rounded-full border border-[#EAB308]/40 flex items-center justify-center flex-shrink-0 group-hover:bg-[#EAB308]/10 transition-colors">
                      <span className="text-[#EAB308] text-xs">✓</span>
                    </span>
                    <span className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">{f}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Right: mockup */}
          <ScrollReveal direction="right" delay={200}>
            <div className="relative">
              <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Fake browser bar */}
                <div className="bg-[#161b22] px-4 py-3 flex items-center gap-2 border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-3 text-white/20 text-xs font-mono">sistema.fabriq.pt/dashboard</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60"
                  alt="Dashboard FABRIQ.IA"
                  className="w-full opacity-80"
                />
                {/* Overlay UI elements */}
                <div className="absolute bottom-8 left-4 right-4 bg-[#07080A]/90 backdrop-blur rounded-xl p-4 border border-[#EAB308]/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-semibold">Produção hoje</span>
                    <span className="text-[#EAB308] text-xs font-bold">↑ 23%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[['12', 'Ordens'], ['8', 'Concluídas'], ['4', 'Em corte']].map(([n, l]) => (
                      <div key={l} className="text-center">
                        <div className="font-display font-black text-white text-xl">{n}</div>
                        <div className="text-white/40 text-xs">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Glow */}
              <div className="absolute -inset-4 bg-[#EAB308]/5 rounded-3xl blur-2xl -z-10" />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
