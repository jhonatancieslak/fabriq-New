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
import AddPieceModal from './AddPieceModal';
import BudgetFooterCalc from './BudgetFooterCalc';
import SelectClientModal from './SelectClientModal';

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
  const { sheetW, sheetH, gap, pieces, result, addPiece, removePiece, setResult } =
    useFabriqStore();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('orcamentos');
  const [parametroSub, setParametroSub] = useState<ParametroSub>('maquina');
  const [budgetDocs, setBudgetDocs] = useState<BudgetDoc[]>([{ id: 'b1', label: 'Novo Orçamento 1' }]);
  const [activeBudgetId, setActiveBudgetId] = useState('b1');
  const [pieceModal, setPieceModal] = useState<{ title: string } | null>(null);
  const [filtro, setFiltro] = useState('');
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [cliente, setCliente] = useState<{ id: string; name: string } | null>(null);
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [agrupado, setAgrupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

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
        setPieceModal({ title: 'Novo Item Laser' });
        break;
      case 'desenharPeca':
        setPieceModal({ title: 'Desenhar Peça' });
        break;
      case 'agrupar':
        setAgrupado((v) => !v);
        break;
      case 'nesting':
        handleCalcular();
        break;
      case 'filtros':
        setFiltroAberto((v) => !v);
        break;
      case 'selecionarCliente':
        setClienteModalOpen(true);
        break;
      case 'materiaPrima':
      case 'processo':
      case 'bancoDados':
        setAviso('Módulo ainda não implementado.');
        setTimeout(() => setAviso(null), 2500);
        break;
    }
  }

  const pecasExibidas = (() => {
    let lista = filtro.trim()
      ? pieces.filter((p) => p.label.toLowerCase().includes(filtro.trim().toLowerCase()))
      : pieces;
    if (agrupado) {
      const grupos = new Map<string, { label: string; w: number; h: number; qty: number; ids: string[] }>();
      for (const p of lista) {
        const chave = `${p.w}x${p.h}`;
        const existente = grupos.get(chave);
        if (existente) {
          existente.qty += p.qty;
          existente.ids.push(p.id);
        } else {
          grupos.set(chave, { label: p.label, w: p.w, h: p.h, qty: p.qty, ids: [p.id] });
        }
      }
      lista = Array.from(grupos.values()).map((g) => ({ id: g.ids.join('+'), label: g.label, w: g.w, h: g.h, qty: g.qty }));
    }
    return lista;
  })();

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <TopNav active={tab} onChange={setTab} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

      {tab === 'orcamentos' && (
        <>
          <OrcamentosToolbar onAction={handleToolbarAction} />
          <BudgetTabsBar
            docs={budgetDocs}
            activeId={activeBudgetId}
            onSelect={setActiveBudgetId}
            onAdd={handleAddBudget}
            onClose={handleCloseBudget}
          />

          {error && (
            <div style={{ padding: 8, background: '#FEF2F2', color: '#B91C1C', fontSize: 13 }}>{error}</div>
          )}
          {aviso && (
            <div style={{ padding: 8, background: '#FEF9C3', color: '#854D0E', fontSize: 13 }}>{aviso}</div>
          )}

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF', display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={handleOpenDxf}>Importar DXF…</button>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{pieces.length} peça(s)</span>
              {cliente && (
                <span style={{ fontSize: 12, color: '#1E40AF', background: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>
                  Cliente: {cliente.name}
                </span>
              )}
              {agrupado && (
                <span style={{ fontSize: 12, color: '#065F46', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4 }}>
                  Agrupado
                </span>
              )}
              <button onClick={handleCalcular} disabled={pieces.length === 0} style={{ marginLeft: 'auto' }}>
                Calcular Nesting
              </button>
            </div>

            {filtroAberto && (
              <div style={{ padding: '6px 16px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF' }}>
                <input
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  placeholder="Filtrar peças por nome…"
                  style={{ padding: '4px 8px', fontSize: 12.5, width: 260 }}
                  autoFocus
                />
              </div>
            )}

            {pieces.length > 0 && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF' }}>
                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#6B7280' }}>
                      <th style={{ fontWeight: 500, padding: '2px 8px 2px 0' }}>Peça</th>
                      <th style={{ fontWeight: 500, padding: '2px 8px' }}>Largura</th>
                      <th style={{ fontWeight: 500, padding: '2px 8px' }}>Altura</th>
                      <th style={{ fontWeight: 500, padding: '2px 8px' }}>Qtd</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pecasExibidas.map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: '2px 8px 2px 0' }}>{p.label}</td>
                        <td style={{ padding: '2px 8px' }}>{p.w}mm</td>
                        <td style={{ padding: '2px 8px' }}>{p.h}mm</td>
                        <td style={{ padding: '2px 8px' }}>{p.qty}</td>
                        <td style={{ padding: '2px 8px' }}>
                          {!agrupado && <button onClick={() => removePiece(p.id)}>×</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                {result ? (
                  <NestingCanvas result={result} sheetW={sheetW} sheetH={sheetH} />
                ) : (
                  <div style={{ padding: 40, color: '#6B7280' }}>
                    Importe um desenho DXF ou clique em "Calcular Nesting" para ver o layout.
                  </div>
                )}
              </div>
              {result && (
                <aside style={{ width: 240, borderLeft: '1px solid #E5E7EB', background: '#FFFFFF', padding: 16, fontSize: 13, color: '#374151' }}>
                  <div>Chapa: {sheetW}×{sheetH}mm · gap {gap}mm</div>
                  <div>Chapas necessárias: {result.sheetsNeeded}</div>
                  <div>Aproveitamento: {result.utilizationPct}%</div>
                  {result.unplacedPieces > 0 && (
                    <div style={{ color: '#B91C1C' }}>Não coube: {result.unplacedPieces}</div>
                  )}
                </aside>
              )}
            </div>
          </div>

          <BudgetFooterCalc
            budgetId={activeBudgetId}
            pieces={pieces}
            onSave={() => {}}
          />
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
      {pieceModal && (
        <AddPieceModal
          title={pieceModal.title}
          onClose={() => setPieceModal(null)}
          onConfirm={(piece) => addPiece(piece)}
        />
      )}
      {clienteModalOpen && (
        <SelectClientModal
          onClose={() => setClienteModalOpen(false)}
          onSelect={setCliente}
        />
      )}
    </div>
  );
}
