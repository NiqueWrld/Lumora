"""Configuration for the driver monitoring server."""

# --- Camera ---
CAMERA_INDEX = 0          # cv2.VideoCapture device index
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720

# --- Server ---
HOST = "0.0.0.0"
PORT = 8000

# --- Head pose / road focus thresholds (degrees) ---
MAX_YAW_DEG = 25.0    # tolerated left/right head turn
MAX_PITCH_DEG = 20.0  # tolerated up/down head tilt

# --- Wheel zone (normalized frame coordinates, 0..1) ---
# Rectangle where hands are expected when they are on the wheel.
# Adjust to match your camera mounting position.
WHEEL_ZONE = {
    "x1": 0.15,
    "y1": 0.55,
    "x2": 0.85,
    "y2": 1.00,
}

# --- Temporal smoothing (avoids status flicker) ---
SMOOTHING_WINDOW = 10       # number of recent frames considered
SMOOTHING_THRESHOLD = 0.6   # fraction of frames that must agree

# --- MediaPipe confidences ---
MIN_FACE_DETECTION_CONF = 0.5
MIN_FACE_TRACKING_CONF = 0.5
MIN_HAND_DETECTION_CONF = 0.5
MIN_HAND_TRACKING_CONF = 0.5
MIN_PHONE_DETECTION_CONF = 0.4

# Phone alerts trigger when a phone is seen in this fraction of recent frames.
PHONE_SMOOTHING_THRESHOLD = 0.4

# --- Audio / loud music ---
AUDIO_SAMPLE_RATE = 16000     # expected sample rate of client audio chunks
MUSIC_SCORE_THRESHOLD = 0.3   # YAMNet "Music" score considered music
LOUD_MUSIC_DB = -20.0         # RMS dBFS above which audio counts as loud
AUDIO_SMOOTHING_WINDOW = 4    # ~1s chunks considered for the loud-music vote
AUDIO_STALE_SEC = 3.0         # ignore audio state older than this

# --- Stream ---
JPEG_QUALITY = 80
STREAM_FPS = 30
