// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';

export default function SelectClientModal({
  onSelect, onClose,
}: {
  onSelect: (client: { id: string; name: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<{ id: string; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await window.fabriq.clients.list(search || undefined);
      if (cancelled) return;
      if (res.ok) {
        setClients(res.clients);
        setError(null);
      } else {
        setError(res.error);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 8, padding: 20, width: 360, maxHeight: '70vh',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, color: '#111827' }}>Selecionar Cliente</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome…"
          autoFocus
          style={{ padding: '6px 8px', fontSize: 13 }}
        />
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 100 }}>
          {error && <div style={{ fontSize: 12, color: '#B91C1C' }}>{error}</div>}
          {!error && clients === null && <div style={{ fontSize: 12, color: '#6B7280' }}>Buscando…</div>}
          {!error && clients?.length === 0 && <div style={{ fontSize: 12, color: '#6B7280' }}>Nenhum cliente encontrado.</div>}
          {clients?.map((c) => (
            <div
              key={c.id}
              onClick={() => { onSelect(c); onClose(); }}
              style={{ padding: '8px 6px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF9C3'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {c.name}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 12px' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
