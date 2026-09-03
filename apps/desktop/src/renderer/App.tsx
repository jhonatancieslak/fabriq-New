// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useState } from 'react';
import DxfParser from 'dxf-parser';
import { useFabriqStore } from './store';
import { nest } from '../shared/nesting';
import NestingCanvas from './NestingCanvas';
import TopNav, { type Tab } from './TopNav';
import SubNav from './SubNav';
import ComingSoon from './ComingSoon';
import OrcamentosToolbar, { type OrcamentoAction } from './OrcamentosToolbar';
import BudgetTabsBar, { type BudgetDoc } from './BudgetTabsBar';

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

type ParametroSub = 'maquina' | 'materiais' | 'taxas' | 'precificacao' | 'config';
const PARAMETRO_SUBTABS: { id: ParametroSub; label: string }[] = [
  { id: 'maquina', label: 'Máquina' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'taxas', label: 'Taxas' },
  { id: 'precificacao', label: 'Precificação' },
  { id: 'config', label: 'Configurações Gerais' },
];

export default function App() {
  const { sheetW, sheetH, gap, pieces, result, setSheet, addPiece, removePiece, setResult } =
    useFabriqStore();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', w: 100, h: 100, qty: 1 });
  const [tab, setTab] = useState<Tab>('orcamentos');
  const [parametroSub, setParametroSub] = useState<ParametroSub>('maquina');
  const [budgetDocs, setBudgetDocs] = useState<BudgetDoc[]>([{ id: 'b1', label: 'Novo Orçamento 1' }]);
  const [activeBudgetId, setActiveBudgetId] = useState('b1');

  function handleAddBudget() {
    const n = budgetDocs.length + 1;
    const id = `b${Date.now()}`;
    setBudgetDocs([...budgetDocs, { id, label: `Novo Orçamento ${n}` }]);
    setActiveBudgetId(id);
  }

  function handleCloseBudget(id: string) {
    const remaining = budgetDocs.filter((d) => d.id !== id);
    setBudgetDocs(remaining);
    if (activeBudgetId === id) setActiveBudgetId(remaining[0].id);
  }

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

  function handleToolbarAction(action: OrcamentoAction) {
    switch (action) {
      case 'limpar':
        pieces.forEach((p) => removePiece(p.id));
        setResult(null);
        setError(null);
        break;
      case 'importarDxf':
        handleOpenDxf();
        break;
      case 'itemLaser':
      case 'materiaPrima':
      case 'processo':
      case 'desenharPeca':
      case 'agrupar':
      case 'nesting':
      case 'bancoDados':
      case 'filtros':
      case 'selecionarCliente':
        break;
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <TopNav active={tab} onChange={setTab} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

      {tab === 'orcamentos' && (
        <>
          <BudgetTabsBar
            docs={budgetDocs}
            activeId={activeBudgetId}
            onSelect={setActiveBudgetId}
            onAdd={handleAddBudget}
            onClose={handleCloseBudget}
          />
          <OrcamentosToolbar onAction={handleToolbarAction} />

          {error && (
            <div style={{ padding: 8, background: '#FEF2F2', color: '#B91C1C', fontSize: 13 }}>{error}</div>
          )}

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <aside style={{ width: 300, flexShrink: 0, borderRight: '1px solid #E5E7EB', background: '#FFFFFF', padding: 16, overflow: 'auto' }}>
              <h4>Chapa</h4>
              <label>Largura (mm) <input type="number" value={sheetW} onChange={(e) => setSheet(Number(e.target.value), sheetH, gap)} /></label>
              <label>Altura (mm) <input type="number" value={sheetH} onChange={(e) => setSheet(sheetW, Number(e.target.value), gap)} /></label>
              <label>Gap (mm) <input type="number" value={gap} onChange={(e) => setSheet(sheetW, sheetH, Number(e.target.value))} /></label>

              <h4 style={{ marginTop: 20 }}>Peça manual</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="text" placeholder="Nome" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" placeholder="Largura" value={form.w} onChange={(e) => setForm({ ...form, w: Number(e.target.value) })} />
                  <input type="number" placeholder="Altura" value={form.h} onChange={(e) => setForm({ ...form, h: Number(e.target.value) })} />
                  <input type="number" placeholder="Qtd" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
                </div>
                <button onClick={handleAddManual}>Adicionar peça</button>
                <button onClick={handleOpenDxf}>Importar DXF…</button>
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
            </aside>

            <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  Chapa: {sheetW}×{sheetH}mm · gap {gap}mm · {pieces.length} peça(s)
                </span>
                <button onClick={handleCalcular} disabled={pieces.length === 0} style={{ marginLeft: 'auto' }}>
                  Calcular Nesting
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <div style={{ flex: 1, minHeight: 0 }}>
                  {result ? (
                    <NestingCanvas result={result} sheetW={sheetW} sheetH={sheetH} />
                  ) : (
                    <div style={{ padding: 40, color: '#6B7280' }}>
                      Adicione peças e clique em "Calcular Nesting" para ver o layout.
                    </div>
                  )}
                </div>
                {result && (
                  <aside style={{ width: 240, borderLeft: '1px solid #E5E7EB', background: '#FFFFFF', padding: 16, fontSize: 13, color: '#374151' }}>
                    <div>Chapas necessárias: {result.sheetsNeeded}</div>
                    <div>Aproveitamento: {result.utilizationPct}%</div>
                    {result.unplacedPieces > 0 && (
                      <div style={{ color: '#B91C1C' }}>Não coube: {result.unplacedPieces}</div>
                    )}
                  </aside>
                )}
              </div>
            </main>
          </div>
        </>
      )}

      {tab === 'producao' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ComingSoon label="Produção" />
        </div>
      )}

      {tab === 'historico' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ComingSoon label="Histórico" />
        </div>
      )}

      {tab === 'clientes' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ComingSoon label="Clientes" />
        </div>
      )}

      {tab === 'ordens' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ComingSoon label="Ordens de Produção" />
        </div>
      )}

      {tab === 'parametros' && (
        <>
          <SubNav items={PARAMETRO_SUBTABS} active={parametroSub} onChange={setParametroSub} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <ComingSoon label={PARAMETRO_SUBTABS.find((s) => s.id === parametroSub)!.label} />
          </div>
        </>
      )}
      </div>
    </div>
  );
}
