import type { Analysis } from './ChatInterface'

type Props = {
  analysis: Analysis | null
}

export default function LiveAnalytics({ analysis }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>Live Analytics</div>

      {!analysis ? (
        <p style={styles.empty}>Waiting for first response…</p>
      ) : (
        <div style={styles.body}>
          <ScoreBar label="Clarity" value={analysis.clarity} />
          <ScoreBar label="Depth" value={analysis.depth} />
          <ScoreBar label="Confidence" value={analysis.confidence} />

          <div style={styles.flagsSection}>
            <span style={styles.flagsLabel}>Flags</span>
            {analysis.flags.length === 0 ? (
              <span style={styles.noFlags}>None detected</span>
            ) : (
              <div style={styles.flagList}>
                {analysis.flags.map((flag) => (
                  <span key={flag} style={styles.flag}>{flag}</span>
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
  const color = value >= 7 ? '#22c55e' : value >= 4 ? '#f59e0b' : '#ef4444'

  return (
    <div style={styles.scoreRow}>
      <div style={styles.scoreLabel}>
        <span>{label}</span>
        <span style={{ fontWeight: 700 }}>{value}/10</span>
      </div>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: 280,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    fontFamily: 'sans-serif',
    height: '100%',
  },
  header: {
    padding: '0.75rem 1rem',
    background: '#f9fafb',
    borderBottom: '1px solid #d1d5db',
    fontWeight: 600,
    fontSize: 14,
  },
  empty: {
    padding: '1rem',
    color: '#9ca3af',
    fontSize: 13,
  },
  body: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  scoreRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  scoreLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#374151',
  },
  barTrack: {
    height: 8,
    background: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  flagsSection: {
    marginTop: 4,
  },
  flagsLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: 600,
    display: 'block',
    marginBottom: 6,
  },
  noFlags: {
    fontSize: 12,
    color: '#9ca3af',
  },
  flagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  flag: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 12,
    background: '#fef3c7',
    color: '#92400e',
    fontWeight: 500,
  },
}
