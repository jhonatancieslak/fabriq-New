// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';
import type { UpdateStatus } from './types';

export default function Footer({ updateStatus, tenantName }: { updateStatus: UpdateStatus | null; tenantName: string | null }) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.fabriq.getVersion().then(setVersion);
  }, []);

  return (
    <div
      style={{
        flexShrink: 0, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', fontSize: 11, color: '#6B7280', background: '#F9FAFB', borderTop: '1px solid #E5E7EB',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>FABRIQ.IA v{version}</span>
        {tenantName && <span>Licenciado para: <strong style={{ color: '#374151' }}>{tenantName}</strong></span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {updateStatus?.state === 'checking' && <span>Verificando atualização…</span>}
        {updateStatus?.state === 'downloading' && <span style={{ color: '#B45309' }}>Baixando atualização…</span>}
        {updateStatus?.state === 'ready' && <span style={{ color: '#B45309' }}>Instalando atualização…</span>}
        <button onClick={() => window.fabriq.billing.openPortal()} style={{ padding: '2px 10px', fontSize: 11 }}>
          Ativar licença
        </button>
      </div>
    </div>
  );
}
