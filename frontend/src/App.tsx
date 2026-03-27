import { useState } from 'react'

const BACKEND_URL = 'http://localhost:8000'

type HealthStatus = 'idle' | 'loading' | 'ok' | 'error'

export default function App() {
  const [status, setStatus] = useState<HealthStatus>('idle')

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

  const label: Record<HealthStatus, string> = {
    idle: 'Check Backend Health',
    loading: 'Checking…',
    ok: 'Backend is healthy',
    error: 'Backend unreachable',
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>GrillAI</h1>
      <button onClick={checkHealth} disabled={status === 'loading'}>
        {label[status]}
      </button>
      {status === 'ok' && <p style={{ color: 'green' }}>Status: OK</p>}
      {status === 'error' && (
        <p style={{ color: 'red' }}>Could not reach {BACKEND_URL}/health</p>
      )}
    </div>
  )
}
