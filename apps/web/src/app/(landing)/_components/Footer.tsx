// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[#07080A] border-t border-white/5 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="font-display font-black text-white text-2xl mb-3">
              FABRIQ<span className="text-[#EAB308]">.IA</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Do corte laser à fatura. O sistema operacional para fábricas de corte laser, CNC e guilhotina.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-white/20 text-xs uppercase tracking-widest font-bold mb-4">Produto</p>
            <ul className="space-y-2">
              {['Funcionalidades', 'Preços', 'Casos de Sucesso', 'Demo'].map(l => (
                <li key={l}>
                  <a href={`#${l.toLowerCase().replace(' ', '-')}`} className="text-white/50 hover:text-white text-sm transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-white/20 text-xs uppercase tracking-widest font-bold mb-4">Empresa</p>
            <ul className="space-y-2">
              {[
                { label: 'Entrar', href: '/login' },
                { label: 'Contacto', href: 'mailto:jhonatan.cieslak94@gmail.com' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/50 hover:text-white text-sm transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} FABRIQ.IA · Desenvolvido por{' '}
            <a href="mailto:jhonatan.cieslak94@gmail.com" className="hover:text-white/40 transition-colors">
              Jhonatan Cieslak
            </a>
          </p>
          <p className="text-white/20 text-xs">
            Política de Privacidade · Termos de Serviço · RGPD
          </p>
        </div>
      </div>
    </footer>
  )
}
