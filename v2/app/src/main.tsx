import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as unknown as { __installPromptEvent?: Event }).__installPromptEvent = e
  window.dispatchEvent(new Event('fabriq:install-available'))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
