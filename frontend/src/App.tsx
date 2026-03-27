import { useState } from 'react'
import { MessageSquare, Mic, Activity, X } from 'lucide-react'
import ChatInterface, { type Analysis } from './features/interview/ChatInterface'
import AudioMode from './features/interview/AudioMode'
import LiveAnalytics from './features/interview/LiveAnalytics'

const BACKEND_URL = 'http://localhost:8000'

type HealthStatus = 'idle' | 'loading' | 'ok' | 'error'
type Mode = 'text' | 'audio'

export default function App() {
  const [status, setStatus] = useState<HealthStatus>('idle')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [mode, setMode] = useState<Mode>('text')
  const [showAnalytics, setShowAnalytics] = useState(false)

  async function checkHealth() {
    setStatus('loading')
    try {
      const res = await fetch(`${BACKEND_URL}/health`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
            GrillAI
          </span>

          {/* Health dot */}
          <button
            onClick={checkHealth}
            disabled={status === 'loading'}
            className="group relative"
            title={status === 'ok' ? 'Backend healthy' : status === 'error' ? 'Backend unreachable' : 'Check health'}
          >
            <span className={`block w-2.5 h-2.5 rounded-full transition-colors ${
              status === 'ok' ? 'bg-emerald-400' :
              status === 'error' ? 'bg-red-400' :
              status === 'loading' ? 'bg-amber-400 animate-pulse' :
              'bg-slate-600'
            }`} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => setMode('text')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                mode === 'text'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare size={15} />
              <span className="hidden sm:inline">Text</span>
            </button>
            <button
              onClick={() => setMode('audio')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                mode === 'audio'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Mic size={15} />
              <span className="hidden sm:inline">Audio</span>
            </button>
          </div>

          {/* Mobile analytics toggle */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="lg:hidden flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
          >
            <Activity size={15} />
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Interview pane */}
        <div className="flex-1 min-w-0 p-4">
          {mode === 'text' ? (
            <ChatInterface onAnalysis={setAnalysis} />
          ) : (
            <AudioMode onAnalysis={setAnalysis} />
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-[320px] shrink-0 p-4 pl-0">
          <LiveAnalytics analysis={analysis} />
        </div>

        {/* Mobile slide-over */}
        {showAnalytics && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowAnalytics(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-[320px] z-50 lg:hidden p-4 bg-slate-950 border-l border-slate-800 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-slate-300">Analytics</span>
                <button onClick={() => setShowAnalytics(false)} className="text-slate-500 hover:text-slate-300">
                  <X size={18} />
                </button>
              </div>
              <LiveAnalytics analysis={analysis} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
