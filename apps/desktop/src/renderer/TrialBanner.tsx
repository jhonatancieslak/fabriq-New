// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { Clock } from 'lucide-react';
import type { LicenseInfo } from './types';

export default function TrialBanner({ info, onOpenLicense }: { info: LicenseInfo | null; onOpenLicense: () => void }) {
  if (!info) return null;

  return (
    <div
      style={{
        flexShrink: 0, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: '#1E3A8A', color: '#FFFFFF', fontSize: 12.5,
      }}
    >
      <Clock size={13} />
      <span>
        {info.isTrial ? `${info.daysLeft ?? 0} dia(s) restante(s) de teste` : `Plano ${info.plan} ativo`}
      </span>
      <button
        onClick={onOpenLicense}
        style={{
          padding: '3px 12px', fontSize: 11.5, fontWeight: 700, borderRadius: 999,
          background: '#EAB308', color: '#111827', border: 'none', cursor: 'pointer',
        }}
      >
        {info.isTrial ? 'Ativar licença' : 'Ver assinatura'}
      </button>
    </div>
  );
}
