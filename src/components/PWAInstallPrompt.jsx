import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW()

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    }
  }

  const handleUpdate = () => {
    updateServiceWorker(true)
    setNeedRefresh(false)
  }

  if (!showInstallBanner && !needRefresh) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '70px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '420px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    }}>
      {needRefresh && (
        <div style={{
          background: '#25343F',
          color: '#EAEFEF',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          pointerEvents: 'all'
        }}>
          <span style={{ fontSize: '14px', flex: 1 }}>
            Nueva versión disponible
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setNeedRefresh(false)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(234,239,239,0.3)',
                color: '#EAEFEF',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Ahora no
            </button>
            <button
              onClick={handleUpdate}
              style={{
                background: '#FF9B51',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Actualizar
            </button>
          </div>
        </div>
      )}

      {showInstallBanner && !needRefresh && (
        <div style={{
          background: '#FF9B51',
          color: '#fff',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(255,155,81,0.4)',
          pointerEvents: 'all'
        }}>
          <span style={{ fontSize: '14px', flex: 1 }}>
            Instala FLUX en tu dispositivo
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowInstallBanner(false)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.5)',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              No
            </button>
            <button
              onClick={handleInstall}
              style={{
                background: '#fff',
                border: 'none',
                color: '#FF9B51',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Instalar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
