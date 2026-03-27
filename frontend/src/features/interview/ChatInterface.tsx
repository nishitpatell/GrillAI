import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Bot, User } from 'lucide-react'

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
    <div className="glass flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <Bot size={32} className="text-slate-600" />
            <p className="text-sm">Start your technical interview...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.from === 'assistant' && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mt-1">
                <Bot size={14} className="text-emerald-400" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${
                msg.from === 'user'
                  ? 'bg-slate-700/50 text-slate-200 rounded-br-md'
                  : 'bg-emerald-500/10 text-slate-200 border border-emerald-500/10 rounded-bl-md'
              }`}
            >
              {msg.text}
              {msg.from === 'assistant' && streaming && msg.id === assistantIdRef.current && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-400 rounded-sm animate-cursor-blink" />
              )}
            </div>
            {msg.from === 'user' && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-slate-700/50 border border-slate-600 flex items-center justify-center mt-1">
                <User size={14} className="text-slate-400" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-full bg-slate-800/60 border border-slate-700 px-4 py-1.5">
          <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <input
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none py-1.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? 'Type your answer...' : 'Connecting...'}
            disabled={!connected || streaming}
          />
          <button
            onClick={sendMessage}
            disabled={!connected || streaming || !input.trim()}
            className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
