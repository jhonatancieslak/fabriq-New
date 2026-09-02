// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react';
import LoginScreen from './LoginScreen';
import App from './App';
import type { AuthState, UpdateStatus } from './types';

type GateState =
  | { phase: 'loading' }
  | { phase: 'login' }
  | { phase: 'blocked'; reason: string }
  | { phase: 'ready' };

export default function LicenseGate() {
  const [gate, setGate] = useState<GateState>({ phase: 'loading' });
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  async function evaluate() {
    const auth = await window.fabriq.auth.getState();
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
    evaluate();
    const unsubscribe = window.fabriq.update.onStatus(setUpdateStatus);
    return unsubscribe;
  }, []);

  function handleLoginSuccess(_state: AuthState) {
    evaluate();
  }

  async function handleLogout() {
    await window.fabriq.auth.logout();
    setGate({ phase: 'login' });
  }

  if (updateStatus?.state === 'ready') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#0f1115', color: '#e6e6e6', textAlign: 'center', gap: 16,
      }}>
        <h2>Atualização disponível</h2>
        <p>Versão {updateStatus.version} pronta. Reinicie para continuar usando o FABRIQ.</p>
        <button onClick={() => window.fabriq.update.installNow()} style={{ padding: '10px 24px' }}>
          Reiniciar agora
        </button>
      </div>
    );
  }

  if (gate.phase === 'loading') {
    return <div style={{ padding: 40, color: '#6b7280' }}>Carregando…</div>;
  }

  if (gate.phase === 'login') {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  if (gate.phase === 'blocked') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#0f1115', color: '#e6e6e6', textAlign: 'center', gap: 16,
      }}>
        <h2>Acesso bloqueado</h2>
        <p>{gate.reason}</p>
        <button onClick={handleLogout} style={{ padding: '10px 24px' }}>Sair</button>
      </div>
    );
  }

  return <App />;
}
