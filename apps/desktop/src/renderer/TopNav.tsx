// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { Layers, Boxes, LayoutGrid, Zap } from 'lucide-react';

export type Tab = 'chapa' | 'pecas' | 'nesting';

const tabs: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'chapa', label: 'Chapa', icon: Layers },
  { id: 'pecas', label: 'Peças', icon: Boxes },
  { id: 'nesting', label: 'Nesting', icon: LayoutGrid },
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
            const Icon = t.icon;
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  background: isActive ? 'rgba(234,179,8,0.12)' : 'transparent',
                  color: isActive ? '#EAB308' : '#6B7280',
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
