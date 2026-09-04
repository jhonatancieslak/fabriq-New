// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useState } from 'react';
import type { NestingPieceInput } from '../shared/nesting';

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 10, color: '#6B7280', gap: 1 }}>
      {label}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 64, fontSize: 11.5, padding: '3px 5px' }}
        />
        {suffix && <span style={{ fontSize: 10 }}>{suffix}</span>}
      </div>
    </label>
  );
}

export default function BudgetFooterCalc({
  budgetId, pieces, onSave,
}: {
  budgetId: string;
  pieces: NestingPieceInput[];
  onSave: (values: { ivaPct: number; minutos: number; precoM2: number; horaMaquina: number }) => void;
}) {
  const stored = (() => {
    try {
      const raw = localStorage.getItem(`fabriq.orcamento.${budgetId}.calc`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [ivaPct, setIvaPct] = useState(String(stored?.ivaPct ?? 23));
  const [minutos, setMinutos] = useState(String(stored?.minutos ?? 0));
  const [precoM2, setPrecoM2] = useState(String(stored?.precoM2 ?? 0));
  const [horaMaquina, setHoraMaquina] = useState(String(stored?.horaMaquina ?? 0));
  const [salvo, setSalvo] = useState(false);

  const areaM2 = pieces.reduce((sum, p) => sum + (p.w * p.h * p.qty) / 1_000_000, 0);
  const subtotalMaterial = areaM2 * (Number(precoM2) || 0);
  const subtotalMaoDeObra = ((Number(minutos) || 0) / 60) * (Number(horaMaquina) || 0);
  const subtotal = subtotalMaterial + subtotalMaoDeObra;
  const total = subtotal * (1 + (Number(ivaPct) || 0) / 100);

  function handleSalvar() {
    const values = {
      ivaPct: Number(ivaPct) || 0,
      minutos: Number(minutos) || 0,
      precoM2: Number(precoM2) || 0,
      horaMaquina: Number(horaMaquina) || 0,
    };
    localStorage.setItem(`fabriq.orcamento.${budgetId}.calc`, JSON.stringify(values));
    onSave(values);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div
      style={{
        flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '8px 16px',
        borderTop: '1px solid #E5E7EB', background: '#F9FAFB',
      }}
    >
      <Field label="Área" value={areaM2.toFixed(3)} onChange={() => {}} suffix="m²" />
      <Field label="Tempo" value={minutos} onChange={setMinutos} suffix="min" />
      <Field label="Preço/m²" value={precoM2} onChange={setPrecoM2} suffix="€" />
      <Field label="Hora Máquina" value={horaMaquina} onChange={setHoraMaquina} suffix="€/h" />
      <Field label="IVA" value={ivaPct} onChange={setIvaPct} suffix="%" />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 12, color: '#374151' }}>
          Subtotal: <strong>€{subtotal.toFixed(2)}</strong>
        </div>
        <div style={{ fontSize: 14, color: '#111827' }}>
          Total: <strong style={{ color: '#B45309' }}>€{total.toFixed(2)}</strong>
        </div>
        <button
          onClick={handleSalvar}
          style={{ padding: '6px 14px', background: '#EAB308', border: 'none', borderRadius: 4, color: '#111827', fontWeight: 600, cursor: 'pointer' }}
        >
          {salvo ? 'Salvo ✓' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
