import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  DeviceMobile,
  Eye,
  HandPalm,
  SteeringWheel,
  WarningCircle,
  CheckCircle,
  XCircle,
  Plugs,
} from '@phosphor-icons/react'
import type { DriverStatus } from '../types/Driver'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws/feed`
const MIN_FRAME_GAP_MS = 66 // cap ~15 fps; actual rate is bounded by server speed
const CAPTURE_WIDTH = 640
const JPEG_QUALITY = 0.7

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
        ok
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      }`}
    >
      {ok ? <CheckCircle weight="fill" /> : <XCircle weight="fill" />}
      {label}
    </span>
  )
}

function Monitor() {
  const [status, setStatus] = useState<DriverStatus | null>(null)
  const [connected, setConnected] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
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
        // camera warming up - try again shortly
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
      // Ping-pong pacing: only one frame in flight, so latency never compounds.
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
          setStatus(JSON.parse(e.data) as DriverStatus)
          scheduleNextFrame() // status is the last message of a response pair
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

  const cards = [
    {
      label: 'Camera',
      ok: status?.camera_ok ?? false,
      detail: status?.camera_ok ? 'Feed active' : 'No feed',
      icon: Camera,
    },
    {
      label: 'Face',
      ok: status?.face_detected ?? false,
      detail: status?.face_detected ? 'Detected' : 'Not detected',
      icon: Eye,
    },
    {
      label: 'Road focus',
      ok: status?.focused_on_road ?? false,
      detail: status?.head_pose
        ? `yaw ${status.head_pose.yaw.toFixed(0)}° · pitch ${status.head_pose.pitch.toFixed(0)}°`
        : '—',
      icon: Eye,
    },
    {
      label: 'Hands on wheel',
      ok: status?.both_hands_on_wheel ?? false,
      detail: `${status?.hands_in_wheel_zone ?? 0}/${status?.hands_detected ?? 0} in wheel zone`,
      icon: HandPalm,
    },
    {
      label: 'Phone',
      ok: !(status?.phone_detected ?? false),
      detail: status?.phone_detected ? 'Phone in use' : 'No phone visible',
      icon: DeviceMobile,
    },
  ]

  return (
    <div className="relative -m-4 md:-m-6 h-[calc(100dvh-4rem)] overflow-hidden bg-black">
      {/* Hidden local webcam element used as the capture source */}
      <video ref={videoRef} muted playsInline className="hidden" />
      {/* Annotated frame returned by the server, filling the viewport */}
      <img
        ref={annotatedRef}
        alt="Processed camera feed"
        className="h-full w-full object-cover"
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white drop-shadow">
          <SteeringWheel /> Driver Monitor
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

      {/* Alerts */}
      <div className="pointer-events-none absolute inset-x-0 top-16 flex flex-col items-center gap-2 px-4">
        {cameraError && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur">
            <WarningCircle size={18} weight="fill" />
            {cameraError}
          </div>
        )}
        {status && !status.driver_ok && (
          <div className="flex items-center gap-2 rounded-lg bg-red-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur">
            <WarningCircle size={18} weight="fill" />
            {status.alerts.join(' · ')}
          </div>
        )}
      </div>

      {/* Status cards */}
      <div className="absolute bottom-16 right-4 top-16 hidden w-72 flex-col justify-center gap-2 sm:flex">
        {cards.map(({ label, ok, detail, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-gray-900/60 p-3 backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <Icon size={22} className="text-gray-300" />
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-gray-300">{detail}</div>
              </div>
            </div>
            <StatusPill ok={ok} label={ok ? 'OK' : 'Alert'} />
          </div>
        ))}
      </div>

      {/* Overall state */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-8">
        <div
          className={`rounded-full px-6 py-2 text-sm font-bold tracking-wide text-white shadow-lg ${
            status?.driver_ok ? 'bg-green-600/90' : 'bg-red-600/90'
          }`}
        >
          {status?.driver_ok ? 'DRIVER OK' : 'ATTENTION REQUIRED'}
        </div>
      </div>
    </div>
  )
}

export default Monitor
