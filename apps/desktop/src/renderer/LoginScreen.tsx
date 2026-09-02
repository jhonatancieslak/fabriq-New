// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useState } from 'react';
import type { AuthState } from './types';

interface Props {
  onSuccess: (state: AuthState) => void;
}

export default function LoginScreen({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await window.fabriq.auth.login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess(res.state);
  }

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1115',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 320, padding: 32, background: '#181b22', borderRadius: 8, border: '1px solid #262a33',
      }}>
        <h2 style={{ margin: '0 0 24px', textAlign: 'center' }}>FABRIQ</h2>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 16, padding: 8, boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 16, padding: 8, boxSizing: 'border-box' }}
        />

        {error && (
          <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
