// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';
import type { UpdateStatus } from './types';

export default function Footer({ updateStatus }: { updateStatus: UpdateStatus | null }) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.fabriq.getVersion().then(setVersion);
  }, []);

  return (
    <div
      style={{
        flexShrink: 0, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', fontSize: 11, color: '#4b5563', background: '#07080A', borderTop: '1px solid #111318',
      }}
    >
      <span>FABRIQ.IA v{version}</span>
      {updateStatus?.state === 'downloading' && <span style={{ color: '#EAB308' }}>Baixando atualização…</span>}
      {updateStatus?.state === 'error' && <span style={{ color: '#fca5a5' }}>Erro ao verificar atualização</span>}
    </div>
  );
}
