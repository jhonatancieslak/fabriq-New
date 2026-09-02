// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useState } from 'react';
import DxfParser from 'dxf-parser';
import { useFabriqStore } from './store';
import { nest } from '../shared/nesting';
import NestingCanvas from './NestingCanvas';

function bboxFromDxf(content: string): { w: number; h: number } | null {
  const parser = new DxfParser();
  const dxf = parser.parseSync(content);
  if (!dxf?.entities?.length) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const entity of dxf.entities) {
    const vertices: { x: number; y: number }[] =
      (entity as any).vertices || (entity as any).points || [];
    for (const v of vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    if ((entity as any).center && (entity as any).radius) {
      const c = (entity as any).center;
      const r = (entity as any).radius;
      minX = Math.min(minX, c.x - r);
      minY = Math.min(minY, c.y - r);
      maxX = Math.max(maxX, c.x + r);
      maxY = Math.max(maxY, c.y + r);
    }
  }
  if (!isFinite(minX)) return null;
  return { w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
}

export default function App() {
  const { sheetW, sheetH, gap, pieces, result, setSheet, addPiece, removePiece, setResult } =
    useFabriqStore();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', w: 100, h: 100, qty: 1 });

  async function handleOpenDxf() {
    setError(null);
    const res = await window.fabriq.openDxfDwg();
    if (!res) return;
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const bbox = bboxFromDxf(res.content);
    if (!bbox) {
      setError('Não foi possível extrair geometria do DXF.');
      return;
    }
    addPiece({ label: res.fileName.replace(/\.dxf$/i, ''), w: bbox.w, h: bbox.h, qty: 1 });
  }

  function handleAddManual() {
    if (!form.label || form.w <= 0 || form.h <= 0 || form.qty <= 0) return;
    addPiece(form);
    setForm({ label: '', w: 100, h: 100, qty: 1 });
  }

  function handleCalcular() {
    setResult(nest(pieces, sheetW, sheetH, gap));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '10px 16px', borderBottom: '1px solid #262a33', display: 'flex', gap: 12, alignItems: 'center' }}>
        <strong>FABRIQ</strong>
        <button onClick={handleOpenDxf}>Abrir DXF…</button>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          Chapa: {sheetW}×{sheetH}mm · gap {gap}mm
        </span>
        <button onClick={handleCalcular} disabled={pieces.length === 0} style={{ marginLeft: 'auto' }}>
          Calcular Nesting
        </button>
      </header>

      {error && (
        <div style={{ padding: 8, background: '#3f1d1d', color: '#fca5a5', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside style={{ width: 320, borderRight: '1px solid #262a33', padding: 16, overflow: 'auto' }}>
          <h4>Configuração da chapa</h4>
          <label>Largura (mm) <input type="number" value={sheetW} onChange={(e) => setSheet(Number(e.target.value), sheetH, gap)} /></label>
          <label>Altura (mm) <input type="number" value={sheetH} onChange={(e) => setSheet(sheetW, Number(e.target.value), gap)} /></label>
          <label>Gap (mm) <input type="number" value={gap} onChange={(e) => setSheet(sheetW, sheetH, Number(e.target.value))} /></label>

          <h4 style={{ marginTop: 24 }}>Adicionar peça manual</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" placeholder="Nome" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder="Largura" value={form.w} onChange={(e) => setForm({ ...form, w: Number(e.target.value) })} />
              <input type="number" placeholder="Altura" value={form.h} onChange={(e) => setForm({ ...form, h: Number(e.target.value) })} />
              <input type="number" placeholder="Qtd" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
            </div>
            <button onClick={handleAddManual}>Adicionar peça</button>
          </div>

          <h4 style={{ marginTop: 20 }}>Peças ({pieces.length})</h4>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
            {pieces.map((p) => (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{p.label} — {p.w}×{p.h} ×{p.qty}</span>
                <button onClick={() => removePiece(p.id)}>×</button>
              </li>
            ))}
          </ul>

          {result && (
            <div style={{ marginTop: 20, fontSize: 13, color: '#9ca3af' }}>
              <div>Chapas necessárias: {result.sheetsNeeded}</div>
              <div>Aproveitamento: {result.utilizationPct}%</div>
              {result.unplacedPieces > 0 && (
                <div style={{ color: '#fca5a5' }}>Não coube: {result.unplacedPieces}</div>
              )}
            </div>
          )}
        </aside>

        <main style={{ flex: 1, minHeight: 0 }}>
          {result ? (
            <NestingCanvas result={result} sheetW={sheetW} sheetH={sheetH} />
          ) : (
            <div style={{ padding: 40, color: '#6b7280' }}>
              Adicione peças e clique em "Calcular Nesting" para ver o layout.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
