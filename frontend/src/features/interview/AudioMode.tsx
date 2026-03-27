import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Bot, User, Hand, PhoneOff } from 'lucide-react'
import type { Analysis } from './ChatInterface'

type Props = {
  onAnalysis?: (analysis: Analysis) => void
}

type Transcript = { id: number; role: 'user' | 'model'; text: string }

type WsMsg =
  | { type: 'audio'; data: string }
  | { type: 'transcript'; role: 'user' | 'model'; text: string }
  | { type: 'turn_complete' }
  | { type: 'analysis'; data: Analysis }

type ConversationState = 'idle' | 'listening' | 'speaking'

const WS_URL = 'ws://localhost:8000/ws/audio-interview'

export default function AudioMode({ onAnalysis }: Props) {
  const [sessionActive, setSessionActive] = useState(false)
  const [connected, setConnected] = useState(false)
  const [conversationState, setConversationState] = useState<ConversationState>('idle')
  const [transcripts, setTranscripts] = useState<Transcript[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const captureCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const playCtxRef = useRef<AudioContext | null>(null)
  const nextPlayTimeRef = useRef(0)
  const idRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const currentTranscriptRef = useRef<{ id: number; role: string } | null>(null)
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  const handleWsMessage = useCallback((event: MessageEvent) => {
    const msg: WsMsg = JSON.parse(event.data)

    if (msg.type === 'audio') {
      setConversationState('speaking')
      playAudioChunk(msg.data)
      return
    }

    if (msg.type === 'transcript') {
      const current = currentTranscriptRef.current
      if (current && current.role === msg.role) {
        const targetId = current.id
        setTranscripts((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, text: t.text + msg.text } : t))
        )
      } else {
        const newId = ++idRef.current
        currentTranscriptRef.current = { id: newId, role: msg.role }
        setTranscripts((prev) => [...prev, { id: newId, role: msg.role, text: msg.text }])
      }
      return
    }

    if (msg.type === 'turn_complete') {
      currentTranscriptRef.current = null
      // Wait for queued audio to finish playing, then go idle
      const ctx = playCtxRef.current
      if (ctx) {
        const remaining = Math.max(0, nextPlayTimeRef.current - ctx.currentTime)
        if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current)
        playbackTimerRef.current = setTimeout(() => {
          setConversationState('idle')
        }, remaining * 1000 + 100)
      } else {
        setConversationState('idle')
      }
      return
    }

    if (msg.type === 'analysis') {
      onAnalysis?.(msg.data)
    }
  }, [onAnalysis])

  function getPlayCtx(): AudioContext {
    if (!playCtxRef.current) {
      playCtxRef.current = new AudioContext({ sampleRate: 24000 })
    }
    return playCtxRef.current
  }

  function playAudioChunk(b64: string) {
    const ctx = getPlayCtx()
    const raw = atob(b64)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const int16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

    const buffer = ctx.createBuffer(1, float32.length, 24000)
    buffer.copyToChannel(float32, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)

    const now = ctx.currentTime
    const startAt = Math.max(now, nextPlayTimeRef.current)
    source.start(startAt)
    nextPlayTimeRef.current = startAt + buffer.duration
  }

  async function startSession() {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setSessionActive(false)
      setConversationState('idle')
    }
    ws.onmessage = handleWsMessage

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => { setConnected(true); resolve() }
      ws.onerror = () => reject(new Error('WebSocket failed'))
    })

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    streamRef.current = stream

    // Start with mic muted — user must explicitly tap to speak
    stream.getAudioTracks().forEach((t) => { t.enabled = false })

    const captureCtx = new AudioContext({ sampleRate: 16000 })
    captureCtxRef.current = captureCtx
    const source = captureCtx.createMediaStreamSource(stream)
    sourceRef.current = source
    const processor = captureCtx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const float32 = e.inputBuffer.getChannelData(0)
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      const bytes = new Uint8Array(int16.buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const b64 = btoa(binary)
      ws.send(JSON.stringify({ type: 'audio', data: b64 }))
    }

    source.connect(processor)
    processor.connect(captureCtx.destination)
    // Suspend immediately — mic is muted, no reason to stream silence
    await captureCtx.suspend()
    setSessionActive(true)
    setConversationState('idle')
  }

  function tapToSpeak() {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = true })
    captureCtxRef.current?.resume()
    setConversationState('listening')
  }

  function doneSpeaking() {
    // 1. Mute mic track
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false })
    // 2. Suspend capture context so no more zero-filled frames are sent
    captureCtxRef.current?.suspend()
    // 3. Send explicit turn_complete control message to backend
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'control', action: 'turn_complete' }))
    }
    setConversationState('idle')
  }

  function endSession() {
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current)
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    captureCtxRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    wsRef.current?.close()
    playCtxRef.current?.close()

    processorRef.current = null
    sourceRef.current = null
    captureCtxRef.current = null
    streamRef.current = null
    wsRef.current = null
    playCtxRef.current = null
    nextPlayTimeRef.current = 0

    setSessionActive(false)
    setConnected(false)
    setConversationState('idle')
  }

  const lastTranscript = transcripts[transcripts.length - 1]

  return (
    <div className="glass flex flex-col h-full overflow-hidden">
      {/* ── Active call area ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 relative">
        {/* Orb container */}
        <div className="relative flex items-center justify-center">
          {/* Listening: expanding rings */}
          {conversationState === 'listening' && (
            <>
              <span className="absolute w-32 h-32 rounded-full border-2 border-emerald-500/30 animate-ring-expand" />
              <span className="absolute w-32 h-32 rounded-full border-2 border-emerald-500/20 animate-ring-expand [animation-delay:0.7s]" />
              <span className="absolute w-32 h-32 rounded-full border-2 border-emerald-500/10 animate-ring-expand [animation-delay:1.4s]" />
            </>
          )}

          {/* Speaking: pulsing glow ring */}
          {conversationState === 'speaking' && (
            <span className="absolute w-36 h-36 rounded-full bg-emerald-500/10 animate-pulse" />
          )}

          {/* Main orb */}
          <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
            conversationState === 'speaking'
              ? 'bg-emerald-500/20 border-2 border-emerald-400/50 animate-orb-glow'
              : conversationState === 'listening'
                ? 'bg-emerald-500/10 border-2 border-emerald-500/40 ring-4 ring-emerald-500/20'
                : sessionActive
                  ? 'bg-slate-800/80 border-2 border-slate-600'
                  : 'bg-slate-800 border-2 border-slate-700'
          }`}>
            {conversationState === 'speaking' ? (
              <div className="flex items-end gap-1">
                <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                <span className="w-1.5 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:450ms]" />
                <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:600ms]" />
              </div>
            ) : conversationState === 'listening' ? (
              <Mic size={40} className="text-emerald-400" />
            ) : sessionActive ? (
              <Hand size={40} className="text-slate-400" />
            ) : (
              <MicOff size={40} className="text-slate-600" />
            )}
          </div>
        </div>

        {/* Status label */}
        <div className="text-center space-y-1.5">
          <p className={`text-base font-semibold ${
            conversationState === 'speaking' ? 'text-emerald-400' :
            conversationState === 'listening' ? 'text-emerald-300' :
            'text-slate-500'
          }`}>
            {!sessionActive ? 'Start an audio interview' :
             conversationState === 'speaking' ? 'AI is speaking...' :
             conversationState === 'listening' ? 'Listening... Tap when done' :
             'Tap to Speak'}
          </p>
          {connected && (
            <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected
            </p>
          )}
        </div>

        {/* Turn-taking button (listening/idle toggle) */}
        {sessionActive && conversationState !== 'speaking' && (
          <button
            onClick={conversationState === 'listening' ? doneSpeaking : tapToSpeak}
            className={`px-8 py-3 rounded-full font-semibold text-sm transition-all flex items-center gap-2.5 ${
              conversationState === 'listening'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {conversationState === 'listening' ? (
              <><Hand size={18} /> Done Speaking</>
            ) : (
              <><Mic size={18} /> Tap to Speak</>
            )}
          </button>
        )}

        {/* Live transcript preview */}
        {lastTranscript && sessionActive && (
          <div className="absolute bottom-4 left-4 right-4 max-h-20 overflow-hidden">
            <div className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-sm ${
              lastTranscript.role === 'user'
                ? 'bg-slate-800/60 text-slate-400'
                : 'bg-emerald-500/10 text-emerald-300/80'
            }`}>
              {lastTranscript.role === 'model' ? <Bot size={14} className="shrink-0 mt-0.5" /> : <User size={14} className="shrink-0 mt-0.5" />}
              <span className="line-clamp-2">{lastTranscript.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* Transcript history */}
      {transcripts.length > 0 && (
        <div className="max-h-36 overflow-y-auto border-t border-slate-800 px-4 py-3 space-y-2">
          {transcripts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-2 text-xs ${
                t.role === 'user' ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {t.role === 'model' ? <Bot size={12} className="shrink-0 mt-0.5 text-emerald-500/50" /> : <User size={12} className="shrink-0 mt-0.5" />}
              <span className="whitespace-pre-wrap">{t.text}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Session controls */}
      <div className="p-4 border-t border-slate-800 flex justify-center">
        <button
          onClick={sessionActive ? endSession : startSession}
          className={`flex items-center gap-2.5 px-8 py-3 rounded-full font-semibold text-sm transition-all ${
            sessionActive
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
          }`}
        >
          {sessionActive ? <><PhoneOff size={18} /> End Interview</> : <><Mic size={18} /> Start Audio Interview</>}
        </button>
      </div>
    </div>
  )
}
