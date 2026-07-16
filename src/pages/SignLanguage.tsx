import { useEffect, useRef, useState } from 'react'
import {
  Backspace,
  HandWaving,
  Plugs,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react'
import type { SignStatus } from '../types/Sign'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws/sign`
const MIN_FRAME_GAP_MS = 66
const CAPTURE_WIDTH = 640
const JPEG_QUALITY = 0.7

function SignLanguage() {
  const [status, setStatus] = useState<SignStatus | null>(null)
  const [connected, setConnected] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [words, setWords] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const annotatedRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    let closed = false
    let retry: ReturnType<typeof setTimeout>
    let sendTimer: ReturnType<typeof setTimeout>
    let ws: WebSocket | null = null
    let stream: MediaStream | null = null
    let lastFrameUrl: string | null = null
    let lastSentAt = 0
    const canvas = document.createElement('canvas')

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360 },
          audio: false,
        })
        if (closed) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        connect()
      } catch {
        setCameraError('Webcam unavailable. Allow camera access and reload.')
      }
    }

    const sendFrame = () => {
      const video = videoRef.current
      if (closed || !video || !ws || ws.readyState !== WebSocket.OPEN) return
      if (video.videoWidth === 0) {
        sendTimer = setTimeout(sendFrame, 200)
        return
      }
      const scale = Math.min(1, CAPTURE_WIDTH / video.videoWidth)
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob && ws?.readyState === WebSocket.OPEN) {
            lastSentAt = performance.now()
            ws.send(blob)
          } else {
            sendTimer = setTimeout(sendFrame, 200)
          }
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }

    const scheduleNextFrame = () => {
      const elapsed = performance.now() - lastSentAt
      clearTimeout(sendTimer)
      sendTimer = setTimeout(sendFrame, Math.max(0, MIN_FRAME_GAP_MS - elapsed))
    }

    const connect = () => {
      ws = new WebSocket(WS_URL)
      ws.binaryType = 'blob'
      ws.onopen = () => {
        setConnected(true)
        sendFrame()
      }
      ws.onmessage = (e) => {
        if (typeof e.data === 'string') {
          const s = JSON.parse(e.data) as SignStatus
          setStatus(s)
          if (s.committed_word) {
            const w = s.committed_word
            setWords((prev) => {
              // Merge fingerspelled letters into one growing token.
              const last = prev[prev.length - 1]
              if (w.length === 1 && last && /^[A-Z]+$/.test(last)) {
                return [...prev.slice(0, -1), last + w]
              }
              return [...prev, w]
            })
          }
          scheduleNextFrame()
        } else if (annotatedRef.current) {
          const url = URL.createObjectURL(e.data as Blob)
          annotatedRef.current.src = url
          if (lastFrameUrl) URL.revokeObjectURL(lastFrameUrl)
          lastFrameUrl = url
        }
      }
      ws.onclose = () => {
        setConnected(false)
        clearTimeout(sendTimer)
        if (!closed) retry = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws?.close()
    }

    startCamera()
    return () => {
      closed = true
      clearTimeout(retry)
      clearTimeout(sendTimer)
      ws?.close()
      stream?.getTracks().forEach((t) => t.stop())
      if (lastFrameUrl) URL.revokeObjectURL(lastFrameUrl)
    }
  }, [])

  return (
    <div className="relative -m-4 md:-m-6 h-[calc(100dvh-4rem)] overflow-hidden bg-black">
      <video ref={videoRef} muted playsInline className="hidden" />
      <img
        ref={annotatedRef}
        alt="Sign language camera feed"
        className="h-full w-full object-cover"
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white drop-shadow">
          <HandWaving /> Sign Language
        </h1>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium backdrop-blur ${
            connected ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-gray-300'
          }`}
        >
          <Plugs weight="bold" />
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      {cameraError && (
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur">
            <WarningCircle size={18} weight="fill" />
            {cameraError}
          </div>
        </div>
      )}

      {/* Current gesture + hold progress */}
      <div className="pointer-events-none absolute inset-x-0 bottom-36 flex justify-center px-4">
        {status?.word && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-gray-900/70 px-6 py-2 text-2xl font-bold text-white backdrop-blur">
              {status.word}
            </div>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-green-400 transition-[width]"
                style={{ width: `${(status.progress * 100).toFixed(0)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-h-[3rem] flex-1 rounded-xl bg-gray-900/70 px-4 py-3 text-lg text-white backdrop-blur">
            {words.length > 0 ? (
              words.join(' ')
            ) : (
              <span className="text-gray-400">
                Hold a sign to add it… word signs (Hello, Yes, No, Good, Peace, I
                love you) or fingerspell A–Y (J/Z need motion)
              </span>
            )}
          </div>
          <button
            onClick={() => setWords((prev) => prev.slice(0, -1))}
            title="Remove last word"
            className="rounded-xl bg-gray-900/70 p-3 text-white backdrop-blur hover:bg-gray-700/70"
          >
            <Backspace size={22} />
          </button>
          <button
            onClick={() => setWords([])}
            title="Clear transcript"
            className="rounded-xl bg-gray-900/70 p-3 text-white backdrop-blur hover:bg-gray-700/70"
          >
            <Trash size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignLanguage
