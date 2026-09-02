// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { safeStorage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKENS_PATH = () => path.join(app.getPath('userData'), 'tokens.enc');

export function saveTokens(tokens: StoredTokens): void {
  const json = JSON.stringify(tokens);
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf-8');
  fs.writeFileSync(TOKENS_PATH(), buf);
}

export function loadTokens(): StoredTokens | null {
  try {
    const buf = fs.readFileSync(TOKENS_PATH());
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    fs.unlinkSync(TOKENS_PATH());
  } catch {
    // já não existe, ok
  }
}
