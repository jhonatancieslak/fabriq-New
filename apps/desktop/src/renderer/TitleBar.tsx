// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, RefreshCw } from 'lucide-react';
import fabriqMark from './assets/icons/fabriq-mark.svg';

type UpdateCheckState = 'idle' | 'checking' | 'up-to-date' | 'updating';

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckState>('idle');

  useEffect(() => {
    window.fabriq.window.isMaximized().then(setMaximized);
    return window.fabriq.window.onMaximizedChange(setMaximized);
  }, []);

  useEffect(() => {
    return window.fabriq.update.onStatus((status) => {
      if (status.state === 'downloading' || status.state === 'ready') setUpdateCheck('updating');
    });
  }, []);

  async function handleCheckUpdates() {
    if (updateCheck === 'checking' || updateCheck === 'updating') return;
    setUpdateCheck('checking');
    const { hasUpdate } = await window.fabriq.update.checkAndWait();
    if (!hasUpdate) {
      setUpdateCheck('up-to-date');
      setTimeout(() => setUpdateCheck('idle'), 3000);
    }
  }

  return (
    <div
      style={{
        height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0B1220', color: '#F9FAFB', WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
        <img src={fabriqMark} alt="" width={18} height={18} style={{ borderRadius: 5 }} />
        <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
        </span>
      </div>

      <div style={{ display: 'flex', height: '100%', WebkitAppRegion: 'no-drag', alignItems: 'center' } as React.CSSProperties}>
        {updateCheck === 'up-to-date' && (
          <span style={{ fontSize: 10.5, color: '#8B96AB', marginRight: 6 }}>Já atualizado</span>
        )}
        {updateCheck === 'updating' && (
          <span style={{ fontSize: 10.5, color: '#EAB308', marginRight: 6 }}>Atualizando…</span>
        )}
        <TitleBtn onClick={handleCheckUpdates} title="Buscar atualizações">
          <RefreshCw size={13} className={updateCheck === 'checking' ? 'spin' : ''} />
        </TitleBtn>
        <TitleBtn onClick={() => window.fabriq.window.minimize()}><Minus size={13} /></TitleBtn>
        <TitleBtn onClick={() => window.fabriq.window.maximizeToggle()}>
          {maximized ? <Copy size={11} /> : <Square size={11} />}
        </TitleBtn>
        <TitleBtn onClick={() => window.fabriq.window.close()} danger><X size={14} /></TitleBtn>
      </div>
    </div>
  );
}

function TitleBtn({ children, onClick, danger, title }: { children: React.ReactNode; onClick: () => void; danger?: boolean; title?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        width: 46, height: '100%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? (danger ? '#DC2626' : 'rgba(255,255,255,0.08)') : 'transparent',
        color: '#F9FAFB',
      }}
    >
      {children}
    </button>
  );
}
