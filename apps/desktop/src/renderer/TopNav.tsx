// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { Zap } from 'lucide-react';
import iconChapa from './assets/icons/chapa.png';
import iconPecas from './assets/icons/pecas.png';
import iconNesting from './assets/icons/nesting.png';

export type Tab = 'chapa' | 'pecas' | 'nesting';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'chapa', label: 'Chapa', icon: iconChapa },
  { id: 'pecas', label: 'Peças', icon: iconPecas },
  { id: 'nesting', label: 'Nesting', icon: iconNesting },
];

export default function TopNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div style={{ background: '#07080A', borderBottom: '1px solid #111318', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EAB308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} strokeWidth={2.5} color="#0f172a" />
          </div>
          <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
          </span>
        </div>

        <nav style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  background: isActive ? 'rgba(234,179,8,0.12)' : 'transparent',
                  color: isActive ? '#EAB308' : '#6B7280',
                }}
              >
                <img src={t.icon} alt="" width={20} height={20} style={{ filter: isActive ? 'none' : 'grayscale(0.4) opacity(0.85)' }} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
