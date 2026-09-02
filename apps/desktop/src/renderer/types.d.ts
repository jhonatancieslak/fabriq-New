// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
export {};

export interface AuthState {
  loggedIn: boolean;
  user: { id: string; name: string; role: string; isSuperAdmin: boolean } | null;
  tenant: { id: string; slug: string; name: string } | null;
}

export type LicenseCheckResult =
  | { ok: true; blocked: false }
  | { ok: true; blocked: true; reason: string }
  | { ok: false };

export interface UpdateStatus {
  state: 'downloading' | 'ready' | 'error';
  version?: string;
  message?: string;
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
        onStatus: (cb: (status: UpdateStatus) => void) => () => void;
      };
    };
  }
}
