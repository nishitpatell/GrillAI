import { useEffect, useRef, useState } from 'react'

type Message = {
  id: number
  text: string
  from: 'user' | 'server'
}

const WS_URL = 'ws://localhost:8000/ws/interview'

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(0)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      setMessages((prev) => [
        ...prev,
        { id: ++idRef.current, text: event.data, from: 'server' },
      ])
    }

    return () => ws.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(text)
    setMessages((prev) => [...prev, { id: ++idRef.current, text, from: 'user' }])
    setInput('')
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
          disabled={!connected}
        />
        <button style={styles.button} onClick={sendMessage} disabled={!connected}>
          Send
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
    maxWidth: 600,
    height: 480,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: '1.5rem',
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
