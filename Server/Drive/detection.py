"""Driver state detection: head pose (road focus), hands in the wheel zone,
and phone use.

Uses the MediaPipe Tasks API (FaceLandmarker + HandLandmarker +
ObjectDetector). The model files are downloaded automatically on first run
into Server/Drive/models/.
"""

import math
import time
import urllib.request
from collections import deque
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

import Server.Drive.config as config

_MODELS_DIR = Path(__file__).parent / "models"
_MODEL_URLS = {
    "face_landmarker.task": (
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
        "face_landmarker/float16/1/face_landmarker.task"
    ),
    "hand_landmarker.task": (
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
        "hand_landmarker/float16/1/hand_landmarker.task"
    ),
    "efficientdet_lite0.tflite": (
        "https://storage.googleapis.com/mediapipe-models/object_detector/"
        "efficientdet_lite0/float16/1/efficientdet_lite0.tflite"
    ),
}

# Generic 3D face model points (mm) used for solvePnP head pose estimation.
# Order: nose tip, chin, image-left eye outer corner, image-right eye outer
# corner, image-left mouth corner, image-right mouth corner.
_MODEL_POINTS = np.array(
    [
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, -150.0, -125.0),
    ],
    dtype=np.float64,
)

# Matching MediaPipe FaceMesh landmark indices (non-mirrored image).
_LANDMARK_IDS = (1, 152, 33, 263, 61, 291)

# Palm reference landmarks: wrist, index knuckle, pinky knuckle.
_PALM_IDS = (0, 5, 17)

# Standard 21-point hand skeleton connections for drawing.
_HAND_CONNECTIONS = (
    (0, 1), (1, 2), (2, 3), (3, 4),          # thumb
    (0, 5), (5, 6), (6, 7), (7, 8),          # index
    (5, 9), (9, 10), (10, 11), (11, 12),     # middle
    (9, 13), (13, 14), (14, 15), (15, 16),   # ring
    (13, 17), (17, 18), (18, 19), (19, 20),  # pinky
    (0, 17),
)

_GREEN = (0, 200, 0)
_ORANGE = (0, 165, 255)
_RED = (0, 0, 255)
_WHITE = (255, 255, 255)


def _ensure_models() -> dict:
    """Download the MediaPipe .task models on first run. Returns name->path."""
    _MODELS_DIR.mkdir(exist_ok=True)
    paths = {}
    for name, url in _MODEL_URLS.items():
        path = _MODELS_DIR / name
        if not path.exists():
            print(f"Downloading {name} ...")
            urllib.request.urlretrieve(url, path)
        paths[name] = str(path)
    return paths


class _BoolSmoother:
    """Majority vote over the last N frames to avoid status flicker."""

    def __init__(self, window: int, threshold: float):
        self._values = deque(maxlen=window)
        self._threshold = threshold

    def update(self, value: bool) -> bool:
        self._values.append(bool(value))
        return (sum(self._values) / len(self._values)) >= self._threshold


class DriverMonitor:
    """Runs MediaPipe FaceLandmarker + HandLandmarker and derives driver state."""

    def __init__(self):
        paths = _ensure_models()
        self._face = vision.FaceLandmarker.create_from_options(
            vision.FaceLandmarkerOptions(
                base_options=mp_tasks.BaseOptions(
                    model_asset_path=paths["face_landmarker.task"]
                ),
                running_mode=vision.RunningMode.VIDEO,
                num_faces=1,
                min_face_detection_confidence=config.MIN_FACE_DETECTION_CONF,
                min_tracking_confidence=config.MIN_FACE_TRACKING_CONF,
            )
        )
        self._hands = vision.HandLandmarker.create_from_options(
            vision.HandLandmarkerOptions(
                base_options=mp_tasks.BaseOptions(
                    model_asset_path=paths["hand_landmarker.task"]
                ),
                running_mode=vision.RunningMode.VIDEO,
                num_hands=2,
                min_hand_detection_confidence=config.MIN_HAND_DETECTION_CONF,
                min_tracking_confidence=config.MIN_HAND_TRACKING_CONF,
            )
        )
        self._phone = vision.ObjectDetector.create_from_options(
            vision.ObjectDetectorOptions(
                base_options=mp_tasks.BaseOptions(
                    model_asset_path=paths["efficientdet_lite0.tflite"]
                ),
                running_mode=vision.RunningMode.VIDEO,
                category_allowlist=["cell phone"],
                score_threshold=config.MIN_PHONE_DETECTION_CONF,
                max_results=2,
            )
        )
        self._focus_smoother = _BoolSmoother(
            config.SMOOTHING_WINDOW, config.SMOOTHING_THRESHOLD
        )
        self._hands_smoother = _BoolSmoother(
            config.SMOOTHING_WINDOW, config.SMOOTHING_THRESHOLD
        )
        self._phone_smoother = _BoolSmoother(
            config.SMOOTHING_WINDOW, config.PHONE_SMOOTHING_THRESHOLD
        )
        self._last_ts_ms = 0

    def close(self):
        self._face.close()
        self._hands.close()
        self._phone.close()

    def process(self, frame):
        """Analyze a BGR frame. Returns (annotated_frame, status_dict)."""
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        ts_ms = max(self._last_ts_ms + 1, int(time.monotonic() * 1000))
        self._last_ts_ms = ts_ms

        face_result = self._face.detect_for_video(mp_image, ts_ms)
        hand_result = self._hands.detect_for_video(mp_image, ts_ms)
        phone_result = self._phone.detect_for_video(mp_image, ts_ms)

        head_pose = None
        face_detected = False
        looking_at_road_now = False

        if face_result.face_landmarks:
            face_detected = True
            landmarks = face_result.face_landmarks[0]
            head_pose = self._estimate_head_pose(frame, landmarks, w, h)
            if head_pose is not None:
                looking_at_road_now = (
                    abs(head_pose["yaw"]) <= config.MAX_YAW_DEG
                    and abs(head_pose["pitch"]) <= config.MAX_PITCH_DEG
                )

        hands_in_zone, hands_detected = self._check_hands(frame, hand_result, w, h)
        phone_now = self._draw_phones(frame, phone_result)

        focused = self._focus_smoother.update(face_detected and looking_at_road_now)
        both_hands = self._hands_smoother.update(hands_in_zone >= 2)
        phone_use = self._phone_smoother.update(phone_now)

        alerts = []
        if not face_detected:
            alerts.append("DRIVER NOT VISIBLE")
        elif not focused:
            alerts.append("EYES ON THE ROAD")
        if not both_hands:
            alerts.append("BOTH HANDS ON THE WHEEL")
        if phone_use:
            alerts.append("PUT THE PHONE DOWN")

        status = {
            "timestamp": time.time(),
            "camera_ok": True,
            "face_detected": face_detected,
            "focused_on_road": focused,
            "head_pose": head_pose,
            "hands_detected": hands_detected,
            "hands_in_wheel_zone": hands_in_zone,
            "both_hands_on_wheel": both_hands,
            "phone_detected": phone_use,
            "driver_ok": focused and both_hands and not phone_use,
            "alerts": alerts,
        }

        self._draw_overlay(frame, status, w, h)
        return frame, status

    def _estimate_head_pose(self, frame, landmarks, w, h):
        """solvePnP head pose. Returns {"pitch","yaw","roll"} in degrees or None."""
        image_points = np.array(
            [(landmarks[i].x * w, landmarks[i].y * h) for i in _LANDMARK_IDS],
            dtype=np.float64,
        )
        focal_length = float(w)
        camera_matrix = np.array(
            [[focal_length, 0, w / 2], [0, focal_length, h / 2], [0, 0, 1]],
            dtype=np.float64,
        )
        dist_coeffs = np.zeros((4, 1))
        ok, rvec, tvec = cv2.solvePnP(
            _MODEL_POINTS,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE,
        )
        if not ok:
            return None

        rot_mat, _ = cv2.Rodrigues(rvec)
        euler = cv2.decomposeProjectionMatrix(np.hstack((rot_mat, tvec)))[6].flatten()
        pitch, yaw, roll = (float(a) for a in euler)

        # The generic model yields pitch/roll near +-180 for a neutral pose;
        # remap so that looking straight ahead ~= 0.
        pitch = math.degrees(math.asin(math.sin(math.radians(pitch))))
        roll = math.degrees(math.asin(math.sin(math.radians(roll))))

        # Gaze direction ray from the nose tip for visualization.
        nose_end, _ = cv2.projectPoints(
            np.array([(0.0, 0.0, 1000.0)]), rvec, tvec, camera_matrix, dist_coeffs
        )
        p1 = (int(image_points[0][0]), int(image_points[0][1]))
        p2 = (int(nose_end[0][0][0]), int(nose_end[0][0][1]))
        cv2.arrowedLine(frame, p1, p2, _ORANGE, 2, tipLength=0.2)

        return {"pitch": round(pitch, 1), "yaw": round(yaw, 1), "roll": round(roll, 1)}

    def _check_hands(self, frame, hand_result, w, h):
        """Count detected hands and how many palms fall inside the wheel zone."""
        zone = config.WHEEL_ZONE
        x1, y1 = int(zone["x1"] * w), int(zone["y1"] * h)
        x2, y2 = int(zone["x2"] * w), int(zone["y2"] * h)

        hands_detected = 0
        hands_in_zone = 0

        for hand_landmarks in hand_result.hand_landmarks:
            hands_detected += 1
            points = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks]
            cx = sum(hand_landmarks[i].x for i in _PALM_IDS) / len(_PALM_IDS) * w
            cy = sum(hand_landmarks[i].y for i in _PALM_IDS) / len(_PALM_IDS) * h
            inside = x1 <= cx <= x2 and y1 <= cy <= y2
            if inside:
                hands_in_zone += 1

            for a, b in _HAND_CONNECTIONS:
                cv2.line(frame, points[a], points[b], _WHITE, 1)
            for p in points:
                cv2.circle(frame, p, 3, _ORANGE, -1)
            cv2.circle(frame, (int(cx), int(cy)), 12, _GREEN if inside else _RED, 3)

        zone_color = (
            _GREEN if hands_in_zone >= 2 else _ORANGE if hands_in_zone == 1 else _RED
        )
        cv2.rectangle(frame, (x1, y1), (x2, y2), zone_color, 2)
        cv2.putText(
            frame, "WHEEL ZONE", (x1 + 8, y1 + 24),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, zone_color, 2,
        )
        return hands_in_zone, hands_detected

    def _draw_phones(self, frame, phone_result) -> bool:
        """Draw detected phone bounding boxes. Returns True if any phone seen."""
        found = False
        for det in phone_result.detections:
            found = True
            box = det.bounding_box
            x1, y1 = box.origin_x, box.origin_y
            x2, y2 = x1 + box.width, y1 + box.height
            score = det.categories[0].score if det.categories else 0.0
            cv2.rectangle(frame, (x1, y1), (x2, y2), _RED, 2)
            cv2.putText(
                frame, f"PHONE {score:.0%}", (x1, max(y1 - 8, 16)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, _RED, 2,
            )
        return found

    def _draw_overlay(self, frame, status, w, h):
        rows = [
            (
                f"ROAD FOCUS: {'YES' if status['focused_on_road'] else 'NO'}",
                status["focused_on_road"],
            ),
            (
                f"HANDS ON WHEEL: {status['hands_in_wheel_zone']}/2",
                status["both_hands_on_wheel"],
            ),
            (
                f"PHONE: {'DETECTED' if status['phone_detected'] else 'NO'}",
                not status["phone_detected"],
            ),
        ]
        cv2.rectangle(frame, (10, 10), (340, 138), (30, 30, 30), -1)
        y = 38
        for text, ok in rows:
            cv2.putText(
                frame, text, (20, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.62, _GREEN if ok else _RED, 2,
            )
            y += 30
        pose = status["head_pose"]
        pose_txt = (
            f"yaw {pose['yaw']:+.0f}  pitch {pose['pitch']:+.0f}  roll {pose['roll']:+.0f}"
            if pose
            else "face not detected"
        )
        cv2.putText(frame, pose_txt, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, _WHITE, 1)

        if status["alerts"]:
            banner = "  |  ".join(status["alerts"])
            size = cv2.getTextSize(banner, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
            bx = max((w - size[0]) // 2, 10)
            by = h - 24
            cv2.rectangle(
                frame,
                (bx - 10, by - size[1] - 10),
                (bx + size[0] + 10, by + 10),
                (0, 0, 160),
                -1,
            )
            cv2.putText(
                frame, banner, (bx, by), cv2.FONT_HERSHEY_SIMPLEX, 0.8, _WHITE, 2
            )
