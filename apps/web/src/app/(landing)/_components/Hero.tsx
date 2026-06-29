// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export function Hero() {
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = lineRef.current
    if (!el) return
    el.style.width = '0%'
    setTimeout(() => {
      el.style.transition = 'width 1.2s ease 0.8s'
      el.style.width = '100%'
    }, 100)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#07080A]">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1565087693064-dc8e47b5aad2?w=1600&auto=format&fit=crop&q=60"
          alt="Corte laser industrial"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080A]/60 via-[#07080A]/80 to-[#07080A]" />
      </div>

      {/* Animated grid lines */}
      <div className="absolute inset-0 z-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#EAB308 1px, transparent 1px), linear-gradient(90deg, #EAB308 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse" />
          <span className="text-[#EAB308] text-xs font-bold tracking-widest uppercase">
            Sistema de Gestão Industrial
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-black text-white text-4xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 max-w-4xl">
          A sua fábrica de corte merece um sistema{' '}
          <span className="text-[#EAB308]">tão preciso</span>{' '}
          quanto as suas máquinas.
        </h1>

        {/* Animated underline */}
        <div ref={lineRef} className="h-0.5 bg-[#EAB308] mb-8 max-w-2xl" />

        {/* Subheadline */}
        <p className="text-white/60 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Ordens de serviço, operadores, faturação e IA de parâmetros de corte — tudo num único painel.
          Feito exclusivamente para empresas de <strong className="text-white/80">laser, CNC e guilhotina</strong>.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-[#EAB308] hover:bg-[#CA8A04] text-black font-black text-base px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#EAB308]/20"
          >
            Quero ver o meu painel →
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all hover:bg-white/5"
          >
            <span>▶</span> Ver demo em 2 minutos
          </a>
        </div>

        {/* Social proof micro */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex -space-x-2">
            {['P','R','A','T','M'].map((l, i) => (
              <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border-2 border-[#07080A] flex items-center justify-center text-white text-xs font-bold">
                {l}
              </div>
            ))}
          </div>
          <div>
            <div className="flex gap-0.5 mb-0.5">
              {[...Array(5)].map((_, i) => <span key={i} className="text-[#EAB308] text-sm">★</span>)}
            </div>
            <p className="text-white/50 text-sm">
              <span className="text-white font-semibold">47 empresas</span> já gerem a produção com o FABRIQ.IA
            </p>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-xs">
        <span>scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
      </div>
    </section>
  )
}
