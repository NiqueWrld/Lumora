"""Background camera capture + detection loop."""

import sys
import threading
import time
from typing import Optional

import cv2

import config
from detection import DriverMonitor

_INITIAL_STATUS = {
    "timestamp": None,
    "camera_ok": False,
    "face_detected": False,
    "focused_on_road": False,
    "head_pose": None,
    "hands_detected": 0,
    "hands_in_wheel_zone": 0,
    "both_hands_on_wheel": False,
    "driver_ok": False,
    "alerts": ["CAMERA STARTING"],
}

_MAX_READ_FAILURES = 30  # consecutive failures before the camera is reopened


class CameraWorker:
    """Continuously grabs frames, runs detection, and stores the latest result."""

    def __init__(self):
        self._detector: Optional[DriverMonitor] = None
        self._lock = threading.Lock()
        self._latest_jpeg: Optional[bytes] = None
        self._latest_status: dict = dict(_INITIAL_STATUS)
        self._running = False
        self._thread: Optional[threading.Thread] = None

    # --- lifecycle -------------------------------------------------------

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=3)
            self._thread = None

    # --- results ---------------------------------------------------------

    @property
    def latest_status(self) -> dict:
        with self._lock:
            return dict(self._latest_status)

    @property
    def latest_jpeg(self) -> Optional[bytes]:
        with self._lock:
            return self._latest_jpeg

    # --- internals -------------------------------------------------------

    def _open_capture(self) -> Optional[cv2.VideoCapture]:
        backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
        cap = cv2.VideoCapture(config.CAMERA_INDEX, backend)
        if not cap.isOpened():
            cap.release()
            return None
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.FRAME_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)
        return cap

    def _set_camera_down(self):
        with self._lock:
            self._latest_status = {
                **_INITIAL_STATUS,
                "timestamp": time.time(),
                "alerts": ["CAMERA UNAVAILABLE"],
            }

    def _run(self):
        self._detector = DriverMonitor()
        cap = self._open_capture()
        failures = 0

        while self._running:
            ok, frame = (False, None)
            if cap is not None and cap.isOpened():
                ok, frame = cap.read()

            if not ok or frame is None:
                failures += 1
                self._set_camera_down()
                if cap is None or failures >= _MAX_READ_FAILURES:
                    if cap is not None:
                        cap.release()
                    time.sleep(1.0)
                    cap = self._open_capture()
                    failures = 0
                else:
                    time.sleep(0.1)
                continue

            failures = 0
            frame, status = self._detector.process(frame)
            ok_enc, jpeg = cv2.imencode(
                ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), config.JPEG_QUALITY]
            )
            with self._lock:
                if ok_enc:
                    self._latest_jpeg = jpeg.tobytes()
                self._latest_status = status

        if cap is not None:
            cap.release()
        self._detector.close()
