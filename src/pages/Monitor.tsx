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

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`
const VIDEO_URL = '/api/video'

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
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let closed = false
    let retry: ReturnType<typeof setTimeout>

    const connect = () => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onmessage = (e) => setStatus(JSON.parse(e.data) as DriverStatus)
      ws.onclose = () => {
        setConnected(false)
        if (!closed) retry = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      wsRef.current?.close()
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

      {status && !status.driver_ok && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <WarningCircle size={20} weight="fill" />
          <span className="font-medium">{status.alerts.join(' · ')}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700">
          <img src={VIDEO_URL} alt="Live camera feed" className="w-full" />
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
