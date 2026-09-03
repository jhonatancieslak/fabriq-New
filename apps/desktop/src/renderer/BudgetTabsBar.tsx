// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { Plus, X } from 'lucide-react';

export interface BudgetDoc {
  id: string;
  label: string;
}

export default function BudgetTabsBar({
  docs, activeId, onSelect, onAdd, onClose,
}: {
  docs: BudgetDoc[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', flexShrink: 0,
        borderTop: '1px solid #E5E7EB', background: '#F9FAFB',
      }}
    >
      {docs.map((doc) => {
        const isActive = doc.id === activeId;
        return (
          <div
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '6px 6px 0 0',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: isActive ? '#FFFFFF' : 'transparent',
              border: isActive ? '1px solid #D1D5DB' : '1px solid transparent',
              borderTop: isActive ? '2px solid #EAB308' : '2px solid transparent',
              borderBottom: isActive ? '1px solid #FFFFFF' : '1px solid transparent',
              color: isActive ? '#1E40AF' : '#6B7280',
            }}
          >
            {doc.label}
            {docs.length > 1 && (
              <X
                size={12}
                onClick={(e) => { e.stopPropagation(); onClose(doc.id); }}
                style={{ opacity: 0.6 }}
              />
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        title="Novo orçamento"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
          border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280',
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
