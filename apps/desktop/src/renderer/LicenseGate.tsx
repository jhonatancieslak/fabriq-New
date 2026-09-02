// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';
import LoginScreen from './LoginScreen';
import App from './App';
import Footer from './Footer';
import type { AuthState, UpdateStatus } from './types';

type GateState =
  | { phase: 'checking-update' }
  | { phase: 'loading' }
  | { phase: 'login' }
  | { phase: 'blocked'; reason: string }
  | { phase: 'ready' };

export default function LicenseGate() {
  const [gate, setGate] = useState<GateState>({ phase: 'checking-update' });
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  async function evaluate() {
    const auth = await window.fabriq.auth.getState();
    setTenantName(auth.tenant?.name ?? null);
    if (!auth.loggedIn) {
      setGate({ phase: 'login' });
      return;
    }
    const license = await window.fabriq.auth.checkLicense();
    if (license.ok && license.blocked) {
      setGate({ phase: 'blocked', reason: license.reason });
      return;
    }
    setGate({ phase: 'ready' });
  }

  useEffect(() => {
    const unsubscribe = window.fabriq.update.onStatus(setUpdateStatus);

    window.fabriq.update.checkAndWait().then(({ hasUpdate }) => {
      // Se houver update, o processo principal já está a baixar/instalar automaticamente
      // (ver updater.ts) — fica-se na tela de update via `updateStatus` até reiniciar sozinho.
      if (!hasUpdate) evaluate();
    });

    return unsubscribe;
  }, []);

  function handleLoginSuccess(_state: AuthState) {
    evaluate();
  }

  async function handleLogout() {
    await window.fabriq.auth.logout();
    setGate({ phase: 'login' });
  }

  const updating = updateStatus?.state === 'checking' || updateStatus?.state === 'downloading' || updateStatus?.state === 'ready';

  if (gate.phase === 'checking-update' && updating) {
    const label =
      updateStatus?.state === 'ready' ? 'Atualização pronta — reiniciando…' :
      updateStatus?.state === 'downloading' ? 'Baixando atualização…' :
      'Verificando atualizações…';
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#F3F4F6', color: '#374151', textAlign: 'center', gap: 12,
      }}>
        <div style={{ fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          FABRIQ<span style={{ color: '#B45309' }}>.IA</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>{label}</p>
      </div>
    );
  }

  if (gate.phase === 'checking-update' || gate.phase === 'loading') {
    return <div style={{ padding: 40, color: '#6B7280' }}>Carregando…</div>;
  }

  if (gate.phase === 'login') {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  if (gate.phase === 'blocked') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#F3F4F6', color: '#111827', textAlign: 'center', gap: 16,
      }}>
        <h2>Acesso bloqueado</h2>
        <p>{gate.reason}</p>
        <button onClick={handleLogout} style={{ padding: '10px 24px' }}>Sair</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <App />
      </div>
      <Footer updateStatus={updateStatus} tenantName={tenantName} />
    </div>
  );
}
