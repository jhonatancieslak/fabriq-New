// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useState } from 'react';

export default function AddPieceModal({
  title, onConfirm, onClose,
}: {
  title: string;
  onConfirm: (piece: { label: string; w: number; h: number; qty: number }) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [qty, setQty] = useState('1');

  function handleConfirm() {
    const wNum = Number(w);
    const hNum = Number(h);
    const qtyNum = Number(qty);
    if (!label.trim() || !wNum || !hNum || !qtyNum) return;
    onConfirm({ label: label.trim(), w: wNum, h: hNum, qty: qtyNum });
    onClose();
  }

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
          background: '#FFFFFF', borderRadius: 8, padding: 20, width: 320,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, color: '#111827' }}>{title}</h3>
        <label style={{ fontSize: 12, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2 }}>
          Nome da peça
          <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus style={{ padding: '4px 6px' }} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            Largura (mm)
            <input value={w} onChange={(e) => setW(e.target.value)} type="number" style={{ padding: '4px 6px' }} />
          </label>
          <label style={{ fontSize: 12, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            Altura (mm)
            <input value={h} onChange={(e) => setH(e.target.value)} type="number" style={{ padding: '4px 6px' }} />
          </label>
        </div>
        <label style={{ fontSize: 12, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2 }}>
          Quantidade
          <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min={1} style={{ padding: '4px 6px' }} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={onClose} style={{ padding: '6px 12px' }}>Cancelar</button>
          <button
            onClick={handleConfirm}
            style={{ padding: '6px 12px', background: '#EAB308', border: 'none', borderRadius: 4, color: '#111827', fontWeight: 600 }}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
