export interface SignStatus {
  timestamp: number | null
  hands_detected: number
  gesture: string | null
  word: string | null
  score: number
  progress: number
  committed_word: string | null
}
