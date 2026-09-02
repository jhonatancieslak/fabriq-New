// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { Zap } from 'lucide-react';
import iconChapa from './assets/icons/chapa.png';
import iconPecas from './assets/icons/pecas.png';
import iconNesting from './assets/icons/nesting.png';
import iconClientes from './assets/icons/clientes.png';
import iconMaquinas from './assets/icons/maquinas.png';
import iconOrcamentos from './assets/icons/orcamentos.png';
import iconConfig from './assets/icons/config.png';

export type Tab = 'chapa' | 'pecas' | 'nesting' | 'clientes' | 'maquinas' | 'orcamentos' | 'config';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'chapa', label: 'Chapa', icon: iconChapa },
  { id: 'pecas', label: 'Peças', icon: iconPecas },
  { id: 'nesting', label: 'Nesting', icon: iconNesting },
  { id: 'orcamentos', label: 'Orçamentos', icon: iconOrcamentos },
  { id: 'clientes', label: 'Clientes', icon: iconClientes },
  { id: 'maquinas', label: 'Máquinas', icon: iconMaquinas },
  { id: 'config', label: 'Configurações', icon: iconConfig },
];

export default function TopNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EAB308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={17} strokeWidth={2.5} color="#111827" />
          </div>
          <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', color: '#111827', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            FABRIQ<span style={{ color: '#B45309' }}>.IA</span>
          </span>
        </div>

        <nav style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap',
                  background: isActive ? '#FEF3C7' : 'transparent',
                  color: isActive ? '#B45309' : '#6B7280',
                }}
              >
                <img src={t.icon} alt="" width={32} height={32} style={{ filter: isActive ? 'none' : 'grayscale(0.25) opacity(0.85)' }} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
