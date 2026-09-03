// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
export {};

export interface AuthState {
  loggedIn: boolean;
  user: { id: string; name: string; role: string; isSuperAdmin: boolean } | null;
  tenant: { id: string; slug: string; name: string } | null;
}

export interface LicenseInfo {
  serial: string;
  plan: string;
  isTrial: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
}

export type LicenseCheckResult =
  | { ok: true; blocked: false; info: LicenseInfo }
  | { ok: true; blocked: true; reason: string; info: LicenseInfo | null }
  | { ok: false };

export interface UpdateStatus {
  state: 'checking' | 'up-to-date' | 'found' | 'downloading' | 'ready' | 'error';
  version?: string;
  message?: string;
  percent?: number;
}

declare global {
  interface Window {
    fabriq: {
      openDxfDwg: () => Promise<
        | { ok: true; fileName: string; content: string }
        | { ok: false; error: string }
        | null
      >;
      getVersion: () => Promise<string>;
      auth: {
        login: (email: string, password: string) => Promise<{ ok: true; state: AuthState } | { ok: false; error: string }>;
        logout: () => Promise<void>;
        getState: () => Promise<AuthState>;
        checkLicense: () => Promise<LicenseCheckResult>;
      };
      update: {
        installNow: () => Promise<void>;
        checkAndWait: () => Promise<{ hasUpdate: boolean }>;
        onStatus: (cb: (status: UpdateStatus) => void) => () => void;
      };
      billing: {
        openPortal: () => Promise<void>;
      };
      window: {
        minimize: () => Promise<void>;
        maximizeToggle: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onMaximizedChange: (cb: (maximized: boolean) => void) => () => void;
      };
    };
  }
}
