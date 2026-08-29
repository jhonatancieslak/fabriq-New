// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useState } from 'react'
import Machines from './Machines'
import Materials from './Materials'
import MachineParameters from './MachineParameters'
import PricingPresets from './PricingPresets'
import CompanySettings from './CompanySettings'

const TABS = [
  { key: 'maquinas', label: 'Máquinas', Comp: Machines },
  { key: 'materiais', label: 'Materiais', Comp: Materials },
  { key: 'corte', label: 'Parâmetros de Corte', Comp: MachineParameters },
  { key: 'precificacao', label: 'Precificação', Comp: PricingPresets },
  { key: 'config', label: 'Configurações Gerais', Comp: CompanySettings },
] as const

export default function Parametros() {
  const [active, setActive] = useState<(typeof TABS)[number]['key']>('maquinas')
  const ActiveComp = TABS.find((t) => t.key === active)!.Comp

  return (
    <div>
      <h1 className="text-white text-xl font-semibold mb-4">Parâmetros</h1>

      <div className="flex gap-1 mb-5 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              active === t.key ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ActiveComp />
    </div>
  )
}
