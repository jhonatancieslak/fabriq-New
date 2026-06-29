// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
'use client'
import { useEffect, useState, useCallback } from 'react'

interface TourStep {
  target: string       // CSS selector do elemento a destacar
  title: string
  body: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Navegação principal',
    body: 'A sidebar dá acesso a todos os módulos: Ordens, Clientes, Obras, Máquinas, Faturação e mais. Clica no botão lateral para recolher e ganhar espaço.',
    position: 'right',
  },
  {
    target: '[data-tour="orders-link"]',
    title: 'Ordens de Serviço',
    body: 'Aqui geres todas as ordens — cria, acompanha e fatura. Cada ordem passa por etapas (corte, dobragem, acabamento) até ser concluída.',
    position: 'right',
  },
  {
    target: '[data-tour="new-order-btn"]',
    title: 'Criar nova ordem',
    body: 'Clica aqui para criar uma ordem em 4 passos: selecciona o cliente, define as etapas de produção, adiciona as peças e confirma.',
    position: 'bottom',
  },
  {
    target: '[data-tour="clients-link"]',
    title: 'Clientes',
    body: 'Regista os teus clientes aqui. Cada cliente pode ter várias obras associadas. As obras agrupam as ordens por projecto ou obra de construção.',
    position: 'right',
  },
  {
    target: '[data-tour="machines-link"]',
    title: 'Máquinas',
    body: 'Adiciona as tuas máquinas (laser, CNC, guilhotina) com os seus custos de operação por hora. O sistema usa estes dados no cálculo automático.',
    position: 'right',
  },
  {
    target: '[data-tour="billing-link"]',
    title: 'Faturação',
    body: 'Ordens concluídas aparecem aqui para faturar. Aprova, marca como faturado ou sem factura. Vês sempre o total pendente vs. faturado do mês.',
    position: 'right',
  },
  {
    target: '[data-tour="notifications-bell"]',
    title: 'Notificações',
    body: 'O sino mostra ordens pendentes em tempo real. Actualiza a cada 60 segundos. Clica para ver as ordens que precisam de atenção.',
    position: 'bottom',
  },
  {
    target: '[data-tour="user-menu"]',
    title: 'O teu perfil',
    body: 'Clica aqui para ver as informações da tua conta, o tenant activo e para terminar sessão com segurança.',
    position: 'bottom',
  },
]

interface TooltipPos {
  top: number
  left: number
  arrowSide: 'top' | 'bottom' | 'left' | 'right' | 'none'
}

function getTooltipPosition(el: Element, position: string, tooltipW = 320, tooltipH = 160): TooltipPos {
  const rect = el.getBoundingClientRect()
  const gap = 16
  const arrowSize = 8

  const placements: Record<string, TooltipPos> = {
    right: {
      top: rect.top + rect.height / 2 - tooltipH / 2,
      left: rect.right + gap + arrowSize,
      arrowSide: 'left',
    },
    left: {
      top: rect.top + rect.height / 2 - tooltipH / 2,
      left: rect.left - tooltipW - gap - arrowSize,
      arrowSide: 'right',
    },
    bottom: {
      top: rect.bottom + gap + arrowSize,
      left: rect.left + rect.width / 2 - tooltipW / 2,
      arrowSide: 'top',
    },
    top: {
      top: rect.top - tooltipH - gap - arrowSize,
      left: rect.left + rect.width / 2 - tooltipW / 2,
      arrowSide: 'bottom',
    },
  }

  const p = placements[position] ?? placements.bottom

  // Keep inside viewport
  p.left = Math.max(12, Math.min(p.left, window.innerWidth - tooltipW - 12))
  p.top  = Math.max(12, Math.min(p.top,  window.innerHeight - tooltipH - 12))

  return p
}

interface Props {
  onClose: () => void
}

export function Tour({ onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [pos, setPos] = useState<TooltipPos | null>(null)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

  const step = TOUR_STEPS[stepIdx]

  const measure = useCallback(() => {
    const el = document.querySelector(step.target)
    if (!el) { setPos(null); setHighlightRect(null); return }
    const rect = el.getBoundingClientRect()
    setHighlightRect(rect)
    setPos(getTooltipPosition(el, step.position ?? 'bottom'))
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [step])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  function next() {
    if (stepIdx < TOUR_STEPS.length - 1) setStepIdx(i => i + 1)
    else onClose()
  }

  function prev() { if (stepIdx > 0) setStepIdx(i => i - 1) }

  const TOOLTIP_W = 320

  return (
    <>
      {/* Overlay with cutout */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {highlightRect && (
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={highlightRect.left - 6}
                  y={highlightRect.top - 6}
                  width={highlightRect.width + 12}
                  height={highlightRect.height + 12}
                  rx="10"
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(7,8,10,0.75)" mask="url(#tour-mask)" />
            {/* Highlight border */}
            <rect
              x={highlightRect.left - 6}
              y={highlightRect.top - 6}
              width={highlightRect.width + 12}
              height={highlightRect.height + 12}
              rx="10"
              fill="none"
              stroke="#EAB308"
              strokeWidth="2"
            />
          </svg>
        )}
      </div>

      {/* Tooltip */}
      {pos && (
        <div
          className="fixed z-[9999] pointer-events-auto"
          style={{ top: pos.top, left: pos.left, width: TOOLTIP_W }}
        >
          {/* Arrow */}
          {pos.arrowSide === 'left' && (
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0"
              style={{ borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid #1a1b1f' }} />
          )}
          {pos.arrowSide === 'top' && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid #1a1b1f' }} />
          )}
          {pos.arrowSide === 'right' && (
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0"
              style={{ borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid #1a1b1f' }} />
          )}
          {pos.arrowSide === 'bottom' && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #1a1b1f' }} />
          )}

          <div className="rounded-2xl p-5 shadow-2xl" style={{ background: '#1a1b1f', border: '1px solid #2a2b30' }}>
            {/* Progress */}
            <div className="flex items-center gap-2 mb-3">
              {TOUR_STEPS.map((_, i) => (
                <div key={i} className="h-1 rounded-full flex-1 transition-all"
                  style={{ background: i <= stepIdx ? '#EAB308' : '#2a2b30' }} />
              ))}
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#EAB308' }}>
              {stepIdx + 1} / {TOUR_STEPS.length}
            </p>
            <h3 className="font-black text-white text-base mb-2">{step.title}</h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{step.body}</p>

            <div className="flex items-center justify-between gap-3">
              <button onClick={onClose}
                className="text-xs font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                Saltar tour
              </button>
              <div className="flex gap-2">
                {stepIdx > 0 && (
                  <button onClick={prev}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: '#2a2b30', color: 'rgba(255,255,255,0.7)' }}>
                    Anterior
                  </button>
                )}
                <button onClick={next}
                  className="px-4 py-2 rounded-xl text-xs font-black transition-all"
                  style={{ background: '#EAB308', color: '#07080A' }}>
                  {stepIdx < TOUR_STEPS.length - 1 ? 'Seguinte →' : 'Concluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
