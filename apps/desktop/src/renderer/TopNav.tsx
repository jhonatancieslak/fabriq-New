// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { Factory } from 'lucide-react';
import fabriqMark from './assets/icons/fabriq-mark.svg';
import iconOrcamentos from './assets/icons/orcamentos.png';
import iconHistorico from './assets/icons/historico.png';
import iconClientes from './assets/icons/clientes.png';
import iconOrdens from './assets/icons/ordens.png';
import iconParametros from './assets/icons/parametros.png';

export type Tab = 'orcamentos' | 'ordens' | 'producao' | 'historico' | 'clientes' | 'parametros';

const tabs: { id: Tab; label: string; icon: string | null }[] = [
  { id: 'orcamentos', label: 'Orçamentos', icon: iconOrcamentos },
  { id: 'ordens', label: 'Ordens', icon: iconOrdens },
  { id: 'producao', label: 'Produção', icon: null },
  { id: 'historico', label: 'Histórico', icon: iconHistorico },
  { id: 'clientes', label: 'Clientes', icon: iconClientes },
  { id: 'parametros', label: 'Parâmetros', icon: iconParametros },
];

export default function TopNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      style={{
        width: 68, flexShrink: 0, height: '100%', background: '#0B1220',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 14, gap: 6,
      }}
    >
      <img src={fabriqMark} alt="" width={32} height={32} style={{ borderRadius: 8, marginBottom: 12 }} />

      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            title={t.label}
            style={{
              width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 9.5, fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1.2, textAlign: 'center',
              background: isActive ? 'rgba(234,179,8,0.18)' : 'transparent',
              color: isActive ? '#EAB308' : '#8B96AB',
              opacity: isActive ? 1 : 0.85,
            }}
          >
            {t.icon ? (
              <img src={t.icon} alt="" width={24} height={24} />
            ) : (
              <Factory size={24} strokeWidth={1.8} color={isActive ? '#EAB308' : '#8B96AB'} />
            )}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
