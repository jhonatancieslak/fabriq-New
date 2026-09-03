// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import type { LicenseInfo } from './types';

export default function LicenseModal({
  info,
  tenantName,
  onClose,
}: {
  info: LicenseInfo | null;
  tenantName: string | null;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360, background: '#FFFFFF', borderRadius: 14, padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)', color: '#111827',
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Assinatura FABRIQ.IA</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6B7280' }}>{tenantName ?? '—'}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <Row label="Nº de série" value={info?.serial ?? '—'} />
          <Row label="Plano" value={info ? (info.isTrial ? 'Trial' : info.plan) : '—'} />
          <Row
            label="Validade"
            value={info?.expiresAt ? new Date(info.expiresAt).toLocaleDateString('pt-PT') : 'Sem limite'}
          />
          <Row
            label="Estado"
            value={
              info?.isTrial
                ? `${info.daysLeft ?? 0} dia(s) restante(s) de teste`
                : 'Ativa'
            }
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => window.fabriq.billing.openPortal()}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12.5, background: '#EAB308', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            Gerir assinatura
          </button>
          <button
            onClick={() => window.open('mailto:jhonatan.cieslak94@gmail.com?subject=FABRIQ.IA — Contacto sobre assinatura')}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12.5, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            Contactar suporte
          </button>
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 12, width: '100%', padding: '6px 12px', fontSize: 12, background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer' }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#6B7280' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
