// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FABRIQ.IA — Do corte laser à fatura.',
  description: 'Sistema de gestão para empresas de laser, CNC e guilhotina. Ordens de serviço, PWA operadores, faturação e IA de parâmetros de corte.',
  openGraph: {
    title: 'FABRIQ.IA — Do corte laser à fatura.',
    description: 'O único sistema feito para empresas de corte industrial.',
    type: 'website',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
