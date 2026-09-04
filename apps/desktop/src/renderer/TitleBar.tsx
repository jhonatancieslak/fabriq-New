// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, RefreshCw, DownloadCloud, LogOut } from 'lucide-react';
import fabriqMark from './assets/icons/fabriq-mark.svg';
import type { UpdateStatus } from './types';

export default function TitleBar({ onLogout }: { onLogout?: () => void }) {
  const [maximized, setMaximized] = useState(false);
  const [checking, setChecking] = useState(false);
  const [upToDate, setUpToDate] = useState(false);
  const [update, setUpdate] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    window.fabriq.window.isMaximized().then(setMaximized);
    return window.fabriq.window.onMaximizedChange(setMaximized);
  }, []);

  useEffect(() => {
    return window.fabriq.update.onStatus((status) => {
      if (status.state === 'found' || status.state === 'downloading' || status.state === 'ready') {
        setUpdate(status);
      }
      if (status.state === 'up-to-date') {
        setUpToDate(true);
        setTimeout(() => setUpToDate(false), 3000);
      }
    });
  }, []);

  async function handleCheckUpdates() {
    if (checking || update) return;
    setChecking(true);
    const { hasUpdate } = await window.fabriq.update.checkAndWait();
    setChecking(false);
    if (!hasUpdate) {
      setUpToDate(true);
      setTimeout(() => setUpToDate(false), 3000);
    }
  }

  return (
    <div
      style={{
        height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0B1220', color: '#F9FAFB', WebkitAppRegion: 'drag', position: 'relative',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
        <img src={fabriqMark} alt="" width={18} height={18} style={{ borderRadius: 5 }} />
        <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          FABRIQ<span style={{ color: '#EAB308' }}>.IA</span>
        </span>
      </div>

      <div style={{ display: 'flex', height: '100%', WebkitAppRegion: 'no-drag', alignItems: 'center' } as React.CSSProperties}>
        {upToDate && (
          <span style={{ fontSize: 10.5, color: '#8B96AB', marginRight: 6 }}>Já atualizado</span>
        )}
        <TitleBtn onClick={handleCheckUpdates} title="Buscar atualizações">
          <RefreshCw size={13} className={checking ? 'spin' : ''} />
        </TitleBtn>
        {onLogout && (
          <TitleBtn onClick={onLogout} title="Sair">
            <LogOut size={13} />
          </TitleBtn>
        )}
        <TitleBtn onClick={() => window.fabriq.window.minimize()}><Minus size={13} /></TitleBtn>
        <TitleBtn onClick={() => window.fabriq.window.maximizeToggle()}>
          {maximized ? <Copy size={11} /> : <Square size={11} />}
        </TitleBtn>
        <TitleBtn onClick={() => window.fabriq.window.close()} danger><X size={14} /></TitleBtn>
      </div>

      {update && <UpdateProgress status={update} />}
    </div>
  );
}

function UpdateProgress({ status }: { status: UpdateStatus }) {
  const percent = status.percent ?? 0;
  const label =
    status.state === 'found' ? `Nova atualização encontrada${status.version ? ` — v${status.version}` : ''}`
    : status.state === 'downloading' ? `Baixando atualização… ${percent}%`
    : `Instalando v${status.version ?? ''}…`;

  return (
    <div
      style={{
        position: 'absolute', top: 34, right: 10, width: 260, background: '#1E293B', color: '#F1F5F9',
        borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
        fontSize: 11, zIndex: 100, WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <DownloadCloud size={13} color="#EAB308" />
        <span>{label}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: status.state === 'found' ? '100%' : `${percent}%`,
            background: '#EAB308',
            transition: 'width 0.3s ease',
            ...(status.state === 'found' ? { animation: 'pulse 1.4s ease-in-out infinite' } : {}),
          }}
        />
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
