// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getStoredEvent() {
  return (window as unknown as { __installPromptEvent?: BeforeInstallPromptEvent }).__installPromptEvent ?? null
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(() => getStoredEvent())
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true,
  )

  useEffect(() => {
    const onAvailable = () => setEvent(getStoredEvent())
    const onInstalled = () => setInstalled(true)
    window.addEventListener('fabriq:install-available', onAvailable)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('fabriq:install-available', onAvailable)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setEvent(null)
    ;(window as unknown as { __installPromptEvent?: BeforeInstallPromptEvent }).__installPromptEvent = undefined
  }

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  return { canInstall: !!event, installed, isIOS, promptInstall }
}
