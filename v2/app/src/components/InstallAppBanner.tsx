// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export default function InstallAppBanner() {
  const { canInstall, installed, isIOS, promptInstall } = useInstallPrompt()

  if (installed) return null
  if (!canInstall && !isIOS) return null

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-sm">
      {canInstall ? (
        <>
          <span className="text-amber-200">Instala o FABRIQ como app no telemóvel.</span>
          <button onClick={promptInstall} className="shrink-0 bg-amber-500 text-black font-semibold px-3 py-1.5 rounded-md text-xs">
            Instalar
          </button>
        </>
      ) : (
        <span className="text-amber-200">
          Instalar: toca em <strong>Partilhar</strong> → <strong>Adicionar ao ecrã principal</strong>.
        </span>
      )}
    </div>
  )
}
