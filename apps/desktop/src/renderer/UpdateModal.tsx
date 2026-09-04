// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';
import { DownloadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { UpdateStatus } from './types';

export default function UpdateModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'checking' });

  useEffect(() => {
    const unsubscribe = window.fabriq.update.onStatus(setStatus);
    window.fabriq.update.checkManual();
    return unsubscribe;
  }, []);

  const closable = status.state === 'up-to-date' || status.state === 'error' || status.state === 'found';

  return (
    <div
      onClick={() => closable && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 8, padding: 24, width: 320,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
          gap: 14, alignItems: 'center', textAlign: 'center',
        }}
      >
        {status.state === 'checking' && (
          <>
            <DownloadCloud size={28} color="#6B7280" className="spin" />
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>Procurando atualização…</p>
          </>
        )}

        {status.state === 'up-to-date' && (
          <>
            <CheckCircle2 size={28} color="#059669" />
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>Já está na versão mais recente.</p>
            <button onClick={onClose} style={{ padding: '6px 16px' }}>Fechar</button>
          </>
        )}

        {status.state === 'error' && (
          <>
            <AlertTriangle size={28} color="#B91C1C" />
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>
              Não foi possível verificar atualizações.
              {status.message && <><br /><span style={{ fontSize: 11, color: '#9CA3AF' }}>{status.message}</span></>}
            </p>
            <button onClick={onClose} style={{ padding: '6px 16px' }}>Fechar</button>
          </>
        )}

        {status.state === 'found' && (
          <>
            <DownloadCloud size={28} color="#B45309" />
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>
              Nova versão disponível{status.version ? ` — v${status.version}` : ''}. Deseja atualizar agora?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ padding: '6px 16px' }}>Agora não</button>
              <button
                onClick={() => window.fabriq.update.downloadUpdate()}
                style={{ padding: '6px 16px', background: '#EAB308', border: 'none', borderRadius: 4, color: '#111827', fontWeight: 600 }}
              >
                Atualizar
              </button>
            </div>
          </>
        )}

        {status.state === 'downloading' && (
          <>
            <DownloadCloud size={28} color="#B45309" />
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>Baixando atualização… {status.percent ?? 0}%</p>
            <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${status.percent ?? 0}%`, background: '#EAB308', transition: 'width 0.2s ease' }} />
            </div>
          </>
        )}

        {status.state === 'ready' && (
          <>
            <CheckCircle2 size={28} color="#059669" />
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>Atualização pronta. Reiniciando…</p>
          </>
        )}
      </div>
    </div>
  );
}
