// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { saveTokens, loadTokens, clearTokens, type StoredTokens } from './tokenStore';

const API_BASE = 'https://api.fabriq.pt/api/v1';

export interface AuthState {
  loggedIn: boolean;
  user: { id: string; name: string; role: string; isSuperAdmin: boolean } | null;
  tenant: { id: string; slug: string; name: string } | null;
}

export type LicenseCheckResult =
  | { ok: true; blocked: false }
  | { ok: true; blocked: true; reason: string }
  | { ok: false };

let accessToken: string | null = null;
let currentUser: AuthState['user'] = null;
let currentTenant: AuthState['tenant'] = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function applyLoginResult(result: {
  tokens: { accessToken: string; refreshToken: string };
  user: AuthState['user'];
  tenant: AuthState['tenant'];
}) {
  accessToken = result.tokens.accessToken;
  currentUser = result.user;
  currentTenant = result.tenant;
  saveTokens({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  startRefreshTimer();
}

function clearSession() {
  accessToken = null;
  currentUser = null;
  currentTenant = null;
  clearTokens();
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function startRefreshTimer() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    doRefresh().catch(() => {});
  }, 10 * 60 * 1000);
}

async function doRefresh(): Promise<boolean> {
  const stored = loadTokens();
  if (!stored) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const data: { accessToken: string; refreshToken: string } = await res.json();
    accessToken = data.accessToken;
    saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; state: AuthState } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error ?? 'Erro ao entrar' };
    }
    applyLoginResult(data);
    return { ok: true, state: { loggedIn: true, user: currentUser, tenant: currentTenant } };
  } catch {
    return { ok: false, error: 'Sem ligação ao servidor' };
  }
}

export async function logout(): Promise<void> {
  const stored = loadTokens();
  if (stored) {
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    }).catch(() => {});
  }
  clearSession();
}

export async function getAuthState(): Promise<AuthState> {
  if (accessToken && currentUser && currentTenant) {
    return { loggedIn: true, user: currentUser, tenant: currentTenant };
  }

  const stored = loadTokens();
  if (!stored) return { loggedIn: false, user: null, tenant: null };

  const refreshed = await doRefresh();
  if (!refreshed) return { loggedIn: false, user: null, tenant: null };

  // Sessão válida mas sem user/tenant em memória (ex: reabriu o app) — busca via /auth/session
  try {
    const res = await authorizedFetch('/auth/session');
    if (res.ok) {
      const data = await res.json();
      currentTenant = { id: data.tenant.id, slug: data.tenant.slug, name: data.tenant.name };
      startRefreshTimer();
      return { loggedIn: true, user: currentUser, tenant: currentTenant };
    }
  } catch {
    // segue abaixo
  }
  return { loggedIn: !!accessToken, user: currentUser, tenant: currentTenant };
}

export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await doRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearSession();
    }
  }
  return res;
}

export async function checkLicense(): Promise<LicenseCheckResult> {
  try {
    const res = await authorizedFetch('/auth/session');
    if (!res.ok) return { ok: false };
    const data: {
      tenant: { planExpired: boolean };
      trial: { isTrialPlan: boolean; expired: boolean };
    } = await res.json();

    const trialActive = data.trial.isTrialPlan && !data.trial.expired;
    if (data.tenant.planExpired && !trialActive) {
      return { ok: true, blocked: true, reason: 'Plano expirado. Contacte o financeiro para renovar.' };
    }
    if (data.trial.isTrialPlan && data.trial.expired) {
      return { ok: true, blocked: true, reason: 'Período de teste terminou. Faça upgrade para continuar.' };
    }
    return { ok: true, blocked: false };
  } catch {
    return { ok: false };
  }
}
