import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Update UI notify the user they can install the PWA
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    await deferredPrompt.userChoice
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-slate-800 border border-indigo-500/30 shadow-2xl shadow-indigo-500/10 rounded-2xl p-4 z-50 flex items-start gap-4 animate-in slide-in-from-bottom-5">
      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
        <Download size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium text-sm mb-1">Install Splito App</h3>
        <p className="text-slate-400 text-xs mb-3">Add to your home screen for quick single-tap access</p>
        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
          >
            Install
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Later
          </button>
        </div>
      </div>
      <button 
        onClick={() => setShowPrompt(false)}
        className="text-slate-500 hover:text-slate-300 transition-colors absolute top-3 right-3"
      >
        <X size={16} />
      </button>
    </div>
  )
}
