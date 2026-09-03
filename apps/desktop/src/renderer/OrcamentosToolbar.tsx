// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import {
  Eraser, FileInput, Zap, Layers, Cog, PenTool, Group, LayoutGrid, Database,
  Filter, UserSearch,
} from 'lucide-react';
import type { OrcamentoSub } from './App';

export type OrcamentoAction =
  | 'limpar' | 'importarDxf' | 'itemLaser' | 'materiaPrima' | 'processo'
  | 'desenharPeca' | 'agrupar' | 'nesting' | 'bancoDados' | 'filtros' | 'selecionarCliente';

const GRUPO_ARQUIVO: { id: OrcamentoAction; label: string; icon: typeof Eraser }[] = [
  { id: 'limpar', label: 'Limpar Dados', icon: Eraser },
  { id: 'importarDxf', label: 'Importar DXF', icon: FileInput },
];

const GRUPO_ITENS: { id: OrcamentoAction; label: string; icon: typeof Eraser }[] = [
  { id: 'itemLaser', label: 'Item Laser', icon: Zap },
  { id: 'materiaPrima', label: 'Matéria-Prima', icon: Layers },
  { id: 'processo', label: 'Processo', icon: Cog },
  { id: 'desenharPeca', label: 'Desenhar Peça', icon: PenTool },
  { id: 'agrupar', label: 'Agrupar', icon: Group },
  { id: 'nesting', label: 'Nesting', icon: LayoutGrid },
];

const GRUPO_CLIENTES: { id: OrcamentoAction; label: string; icon: typeof Eraser }[] = [
  { id: 'filtros', label: 'Filtros', icon: Filter },
  { id: 'selecionarCliente', label: 'Selecionar Cliente', icon: UserSearch },
];

function ToolButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Eraser; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        padding: '6px 10px', minWidth: 64, border: '1px solid transparent', borderRadius: 6,
        background: 'transparent', cursor: 'pointer', color: '#374151',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF08A'; e.currentTarget.style.borderColor = '#EAB308'; e.currentTarget.style.color = '#1E40AF'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#374151'; }}
    >
      <Icon size={20} strokeWidth={1.75} />
      <span style={{ fontSize: 10.5, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function ToolGroup({
  caption, buttons, onAction,
}: {
  caption: string;
  buttons: { id: OrcamentoAction; label: string; icon: typeof Eraser }[];
  onAction: (a: OrcamentoAction) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {buttons.map((b) => (
          <ToolButton key={b.id} label={b.label} icon={b.icon} onClick={() => onAction(b.id)} />
        ))}
      </div>
      <span style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2, letterSpacing: 0.4 }}>{caption}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: 'stretch', background: '#D1D5DB', margin: '2px 6px' }} />;
}

const NUMBER_FIELDS: { id: OrcamentoSub | 'rates'; label: string; suffix?: string }[] = [
  { id: 'rates', label: 'Hora Máquina', suffix: 'R$' },
  { id: 'rates', label: 'Taxa Min.', suffix: '%' },
  { id: 'rates', label: 'Processo', suffix: 'R$' },
  { id: 'rates', label: 'Custo Setup', suffix: 'R$' },
];

export default function OrcamentosToolbar({
  onAction,
}: {
  onAction: (action: OrcamentoAction) => void;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 0, padding: '6px 10px', borderBottom: '1px solid #E5E7EB',
        background: '#F3F4F6', flexShrink: 0, overflowX: 'auto',
      }}
    >
      <ToolGroup caption="ARQUIVO" buttons={GRUPO_ARQUIVO} onAction={onAction} />
      <Divider />
      <ToolGroup caption="ITENS" buttons={GRUPO_ITENS} onAction={onAction} />
      <Divider />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ToolButton label="Banco de Dados" icon={Database} onClick={() => onAction('bancoDados')} />
        <span style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2, letterSpacing: 0.4 }}>DADOS</span>
      </div>
      <Divider />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, padding: '4px 8px' }}>
          {NUMBER_FIELDS.map((f, i) => (
            <label key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: 10, color: '#6B7280' }}>
              {f.label}
              <input type="number" defaultValue={0} style={{ width: 64, fontSize: 11, padding: '2px 4px' }} />
            </label>
          ))}
        </div>
        <span style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2, letterSpacing: 0.4 }}>CUSTOS / TAXAS</span>
      </div>
      <Divider />
      <ToolGroup caption="CLIENTES" buttons={GRUPO_CLIENTES} onAction={onAction} />
    </div>
  );
}
