// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'dark' | 'light'
  className?: string
}

const sizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
}

export function Logo({ size = 'md', variant = 'dark', className }: LogoProps) {
  return (
    <span className={cn('font-display font-extrabold uppercase tracking-tight', sizes[size], className)}>
      <span className={variant === 'dark' ? 'text-slate-900' : 'text-white'}>FABRIQ</span>
      <span className="text-yellow-400">.IA</span>
    </span>
  )
}
