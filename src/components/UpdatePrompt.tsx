import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-slate-800 border border-indigo-500/30 shadow-2xl shadow-indigo-500/10 rounded-2xl p-4 z-50 flex items-start gap-4 animate-in slide-in-from-bottom-5">
      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
        <RefreshCw size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium text-sm mb-1">Update Available</h3>
        <p className="text-slate-400 text-xs mb-3">A new version of Splito is ready. Update now to get the latest features.</p>
        <div className="flex gap-2">
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Later
          </button>
        </div>
      </div>
      <button 
        onClick={() => setNeedRefresh(false)}
        className="text-slate-500 hover:text-slate-300 transition-colors absolute top-3 right-3"
      >
        <X size={16} />
      </button>
    </div>
  )
}
