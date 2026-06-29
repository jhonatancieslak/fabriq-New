// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#07080A]/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display font-black text-white text-xl tracking-tight">
          FABRIQ<span className="text-[#EAB308]">.IA</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
          <a href="#prova-social" className="hover:text-white transition-colors">Casos de Sucesso</a>
          <a href="#precos" className="hover:text-white transition-colors">Preços</a>
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors font-medium">
            Entrar
          </Link>
          <Link
            href="/login"
            className="bg-[#EAB308] hover:bg-[#CA8A04] text-black text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Activar Agora →
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden text-white p-2"
          aria-label="Menu"
        >
          <div className="w-5 h-0.5 bg-white mb-1 transition-all" style={{ transform: menuOpen ? 'rotate(45deg) translateY(6px)' : '' }} />
          <div className="w-5 h-0.5 bg-white mb-1 transition-all" style={{ opacity: menuOpen ? 0 : 1 }} />
          <div className="w-5 h-0.5 bg-white transition-all" style={{ transform: menuOpen ? 'rotate(-45deg) translateY(-6px)' : '' }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#07080A] border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          <a href="#funcionalidades" className="text-white/80 text-sm font-medium" onClick={() => setMenuOpen(false)}>Funcionalidades</a>
          <a href="#prova-social" className="text-white/80 text-sm font-medium" onClick={() => setMenuOpen(false)}>Casos de Sucesso</a>
          <a href="#precos" className="text-white/80 text-sm font-medium" onClick={() => setMenuOpen(false)}>Preços</a>
          <Link href="/login" className="bg-[#EAB308] text-black text-sm font-bold px-4 py-2 rounded-lg text-center" onClick={() => setMenuOpen(false)}>
            Activar Agora →
          </Link>
        </div>
      )}
    </header>
  )
}
