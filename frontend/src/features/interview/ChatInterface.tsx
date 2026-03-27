import { useEffect, useRef, useState, useCallback } from 'react'

type Message = {
  id: number
  text: string
  from: 'user' | 'assistant'
}

export type Analysis = {
  clarity: number
  depth: number
  confidence: number
  flags: string[]
}

type WsMessage =
  | { type: 'token'; value: string }
  | { type: 'end' }
  | { type: 'analysis'; data: Analysis }

type Props = {
  onAnalysis?: (analysis: Analysis) => void
}

const WS_URL = 'ws://localhost:8000/ws/interview'

export default function ChatInterface({ onAnalysis }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(0)
  const assistantIdRef = useRef<number | null>(null)

  const handleMessage = useCallback((event: MessageEvent) => {
    const msg: WsMessage = JSON.parse(event.data)

    if (msg.type === 'end') {
      assistantIdRef.current = null
      setStreaming(false)
      return
    }

    if (msg.type === 'analysis') {
      onAnalysis?.(msg.data)
      return
    }

    if (msg.type === 'token') {
      if (assistantIdRef.current === null) {
        const newId = ++idRef.current
        assistantIdRef.current = newId
        setMessages((prev) => [...prev, { id: newId, text: msg.value, from: 'assistant' }])
      } else {
        const targetId = assistantIdRef.current
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId ? { ...m, text: m.text + msg.value } : m
          )
        )
      }
    }
  }, [onAnalysis])

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setStreaming(false)
    }
    ws.onmessage = handleMessage

    return () => ws.close()
  }, [handleMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || streaming)
      return
    wsRef.current.send(text)
    setMessages((prev) => [...prev, { id: ++idRef.current, text, from: 'user' }])
    setInput('')
    setStreaming(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') sendMessage()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        Interview Chat
        <span style={{ ...styles.dot, background: connected ? '#22c55e' : '#ef4444' }} />
      </div>

      <div style={styles.messageList}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.bubble,
              alignSelf: msg.from === 'user' ? 'flex-end' : 'flex-start',
              background: msg.from === 'user' ? '#3b82f6' : '#e5e7eb',
              color: msg.from === 'user' ? '#fff' : '#111',
            }}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          disabled={!connected || streaming}
        />
        <button
          style={styles.button}
          onClick={sendMessage}
          disabled={!connected || streaming}
        >
          {streaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0.75rem 1rem',
    background: '#f9fafb',
    borderBottom: '1px solid #d1d5db',
    fontWeight: 600,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  bubble: {
    maxWidth: '70%',
    padding: '0.5rem 0.75rem',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.4,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  inputRow: {
    display: 'flex',
    borderTop: '1px solid #d1d5db',
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: 'none',
    outline: 'none',
    fontSize: 14,
  },
  button: {
    padding: '0 1.25rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  },
}
