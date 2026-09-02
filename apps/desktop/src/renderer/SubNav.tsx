// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

export default function SubNav<T extends string>({
  items, active, onChange,
}: {
  items: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 16px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', flexShrink: 0 }}>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid transparent', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 500,
              background: isActive ? '#FFFFFF' : 'transparent',
              borderColor: isActive ? '#D1D5DB' : 'transparent',
              color: isActive ? '#111827' : '#6B7280',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
