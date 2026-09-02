// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import type { Tab } from './TopNav';

const LABELS: Record<Tab, string> = {
  chapa: 'Chapa',
  pecas: 'Peças',
  nesting: 'Nesting',
  clientes: 'Clientes',
  maquinas: 'Máquinas',
  orcamentos: 'Orçamentos',
  config: 'Configurações',
};

export default function ComingSoon({ tab }: { tab: Tab }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#6B7280', gap: 8,
    }}>
      <h3 style={{ margin: 0, color: '#374151', textTransform: 'none', fontSize: 16 }}>{LABELS[tab]}</h3>
      <p style={{ margin: 0, fontSize: 13 }}>Módulo em breve nesta versão do desktop.</p>
    </div>
  );
}
