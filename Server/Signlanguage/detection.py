"""Sign language (hand gesture) detection using MediaPipe GestureRecognizer.

Recognizes the canned gesture set (Closed_Fist, Open_Palm, Pointing_Up,
Thumb_Down, Thumb_Up, Victory, ILoveYou) and maps each to a word. A gesture
held for a short time is "committed" so clients can build a transcript.
"""

import threading
import time
import urllib.request
from pathlib import Path
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

_MODELS_DIR = Path(__file__).parent / "models"
_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/"
    "gesture_recognizer/float16/1/gesture_recognizer.task"
)

MIN_GESTURE_CONF = 0.5
COMMIT_FRAMES = 8  # consecutive frames a gesture must be held to commit

# Gesture -> word/phrase shown in the transcript.
WORDS = {
    "Closed_Fist": "Yes",
    "Open_Palm": "Hello",
    "Pointing_Up": "Look up",
    "Thumb_Down": "No",
    "Thumb_Up": "Good",
    "Victory": "Peace",
    "ILoveYou": "I love you",
}

_HAND_CONNECTIONS = (
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20),
    (0, 17),
)

_GREEN = (0, 200, 0)
_ORANGE = (0, 165, 255)
_WHITE = (255, 255, 255)

_INITIAL_STATUS = {
    "timestamp": None,
    "hands_detected": 0,
    "gesture": None,
    "word": None,
    "score": 0.0,
    "progress": 0.0,
    "committed_word": None,
}


def _ensure_model() -> str:
    _MODELS_DIR.mkdir(exist_ok=True)
    path = _MODELS_DIR / "gesture_recognizer.task"
    if not path.exists():
        print("Downloading gesture_recognizer.task ...")
        urllib.request.urlretrieve(_MODEL_URL, path)
    return str(path)


class SignDetector:
    """Runs GestureRecognizer on client frames and commits held gestures."""

    def __init__(self):
        self._recognizer = vision.GestureRecognizer.create_from_options(
            vision.GestureRecognizerOptions(
                base_options=mp_tasks.BaseOptions(model_asset_path=_ensure_model()),
                running_mode=vision.RunningMode.VIDEO,
                num_hands=2,
                min_hand_detection_confidence=MIN_GESTURE_CONF,
                min_tracking_confidence=MIN_GESTURE_CONF,
            )
        )
        self._lock = threading.Lock()
        self._latest_status: dict = dict(_INITIAL_STATUS)
        self._last_ts_ms = 0
        self._candidate: Optional[str] = None
        self._count = 0
        self._last_committed: Optional[str] = None

    def close(self):
        self._recognizer.close()

    @property
    def latest_status(self) -> dict:
        with self._lock:
            return dict(self._latest_status)

    def _update_commit(self, gesture: Optional[str]) -> Optional[str]:
        """Commit a gesture after it is held for COMMIT_FRAMES frames."""
        if not gesture:
            self._candidate = None
            self._count = 0
            self._last_committed = None  # hand dropped: same word may repeat
            return None
        if gesture == self._candidate:
            self._count += 1
        else:
            self._candidate = gesture
            self._count = 1
        if self._count == COMMIT_FRAMES and gesture != self._last_committed:
            self._last_committed = gesture
            return WORDS.get(gesture, gesture)
        return None

    def process_jpeg(self, data: bytes) -> tuple[Optional[bytes], dict]:
        """Decode a JPEG frame, recognize gestures, return (annotated, status)."""
        frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return None, self.latest_status

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        ts_ms = max(self._last_ts_ms + 1, int(time.monotonic() * 1000))
        self._last_ts_ms = ts_ms

        result = self._recognizer.recognize_for_video(mp_image, ts_ms)

        gesture = None
        score = 0.0
        for candidates in result.gestures:
            if not candidates:
                continue
            top = candidates[0]
            if top.category_name != "None" and top.score > score:
                gesture = top.category_name
                score = top.score

        for hand_landmarks in result.hand_landmarks:
            points = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks]
            for a, b in _HAND_CONNECTIONS:
                cv2.line(frame, points[a], points[b], _WHITE, 1)
            for p in points:
                cv2.circle(frame, p, 3, _ORANGE, -1)

        committed_word = self._update_commit(gesture)
        progress = (
            min(self._count / COMMIT_FRAMES, 1.0) if gesture else 0.0
        )
        word = WORDS.get(gesture) if gesture else None

        if word:
            label = f"{word} ({score:.0%})"
            cv2.putText(
                frame, label, (16, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, _GREEN, 2,
            )

        status = {
            "timestamp": time.time(),
            "hands_detected": len(result.hand_landmarks),
            "gesture": gesture,
            "word": word,
            "score": round(score, 2),
            "progress": round(progress, 2),
            "committed_word": committed_word,
        }

        ok, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        with self._lock:
            self._latest_status = status
        return (jpeg.tobytes() if ok else None), status
