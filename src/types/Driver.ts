export interface HeadPose {
  yaw: number
  pitch: number
  roll: number
}

export interface DriverStatus {
  timestamp: number | null
  camera_ok: boolean
  face_detected: boolean
  focused_on_road: boolean
  head_pose: HeadPose | null
  hands_detected: number
  hands_in_wheel_zone: number
  both_hands_on_wheel: boolean
  phone_detected: boolean
  driver_ok: boolean
  alerts: string[]
}
