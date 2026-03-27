import { Activity, AlertTriangle } from 'lucide-react'
import type { Analysis } from './ChatInterface'

type Props = {
  analysis: Analysis | null
}

export default function LiveAnalytics({ analysis }: Props) {
  return (
    <div className="glass flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Activity size={15} className="text-emerald-400" />
        <span className="text-sm font-semibold text-slate-300">Live Analytics</span>
      </div>

      {!analysis ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-slate-600 text-center">Waiting for first response...</p>
        </div>
      ) : (
        <div className="p-4 space-y-5">
          <ScoreBar label="Clarity" value={analysis.clarity} />
          <ScoreBar label="Depth" value={analysis.depth} />
          <ScoreBar label="Confidence" value={analysis.confidence} />

          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle size={13} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flags</span>
            </div>
            {analysis.flags.length === 0 ? (
              <span className="text-xs text-slate-600">None detected</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analysis.flags.map((flag) => (
                  <span
                    key={flag}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/20 font-medium"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100
  const colorClass =
    value >= 7 ? 'bg-emerald-500' :
    value >= 4 ? 'bg-amber-500' :
    'bg-red-500'
  const textColor =
    value >= 7 ? 'text-emerald-400' :
    value >= 4 ? 'text-amber-400' :
    'text-red-400'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${textColor}`}>{value}/10</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
