import { useEffect, useRef, useState } from 'react'
import {
  Camera,
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
const SEND_FPS = 10
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
    let sendTimer: ReturnType<typeof setInterval>
    let ws: WebSocket | null = null
    let stream: MediaStream | null = null
    let lastFrameUrl: string | null = null
    const canvas = document.createElement('canvas')

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
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
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return
      if (ws.bufferedAmount > 0 || video.videoWidth === 0) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (blob && ws?.readyState === WebSocket.OPEN) ws.send(blob)
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }

    const connect = () => {
      ws = new WebSocket(WS_URL)
      ws.binaryType = 'blob'
      ws.onopen = () => {
        setConnected(true)
        sendTimer = setInterval(sendFrame, 1000 / SEND_FPS)
      }
      ws.onmessage = (e) => {
        if (typeof e.data === 'string') {
          setStatus(JSON.parse(e.data) as DriverStatus)
        } else if (annotatedRef.current) {
          const url = URL.createObjectURL(e.data as Blob)
          annotatedRef.current.src = url
          if (lastFrameUrl) URL.revokeObjectURL(lastFrameUrl)
          lastFrameUrl = url
        }
      }
      ws.onclose = () => {
        setConnected(false)
        clearInterval(sendTimer)
        if (!closed) retry = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws?.close()
    }

    startCamera()
    return () => {
      closed = true
      clearTimeout(retry)
      clearInterval(sendTimer)
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
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <SteeringWheel /> Driver Monitor
        </h1>
        <span
          className={`inline-flex items-center gap-1 text-sm ${
            connected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
          }`}
        >
          <Plugs weight="bold" />
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      {cameraError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <WarningCircle size={20} weight="fill" />
          <span className="font-medium">{cameraError}</span>
        </div>
      )}

      {status && !status.driver_ok && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <WarningCircle size={20} weight="fill" />
          <span className="font-medium">{status.alerts.join(' · ')}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700">
          {/* Hidden local webcam element used as the capture source */}
          <video ref={videoRef} muted playsInline className="hidden" />
          {/* Annotated frame returned by the server */}
          <img ref={annotatedRef} alt="Processed camera feed" className="w-full" />
        </div>

        <div className="flex flex-col gap-3">
          {cards.map(({ label, ok, detail, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <Icon size={24} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <div className="font-medium dark:text-white">{label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{detail}</div>
                </div>
              </div>
              <StatusPill ok={ok} label={ok ? 'OK' : 'Alert'} />
            </div>
          ))}

          <div
            className={`rounded-xl p-4 text-center font-semibold text-white ${
              status?.driver_ok ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {status?.driver_ok ? 'DRIVER OK' : 'ATTENTION REQUIRED'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Monitor
