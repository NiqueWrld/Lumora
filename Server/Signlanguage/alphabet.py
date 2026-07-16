"""Static ASL fingerspelling alphabet from hand landmark geometry.

Classifies the 24 static ASL letters (J and Z involve motion and are not
supported). Works on the 21 normalized hand landmarks returned by MediaPipe.
Heuristic, demo-grade accuracy: prefers returning None over wild guesses.
"""

from typing import Optional

import numpy as np

# Landmark ids: 0 wrist; thumb 1-4; index 5-8; middle 9-12; ring 13-16;
# pinky 17-20 (MCP, PIP, DIP, TIP per finger).
_FINGERS = {
    "index": (5, 6, 8),
    "middle": (9, 10, 12),
    "ring": (13, 14, 16),
    "pinky": (17, 18, 20),
}


def classify_letter(landmarks) -> tuple[Optional[str], float]:
    """Return (letter, confidence) or (None, 0.0) for one hand's landmarks."""
    pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks], dtype=np.float64)
    size = float(np.linalg.norm(pts[9] - pts[0]))
    if size < 1e-6:
        return None, 0.0

    def d(a: int, b: int) -> float:
        return float(np.linalg.norm(pts[a] - pts[b])) / size

    # Continuous extension per finger: ~1 extended, ~0 curled.
    def extension(mcp: int, tip: int) -> float:
        return (d(tip, 0) - d(mcp, 0))

    e = {name: extension(mcp, tip) for name, (mcp, _, tip) in _FINGERS.items()}
    ext = {name: v > 0.55 for name, v in e.items()}
    half = {name: 0.2 < v <= 0.55 for name, v in e.items()}
    n_ext = sum(ext.values())

    # Thumb: distance from pinky MCP grows as the thumb opens out.
    thumb_open = d(4, 17) > 1.15
    thumb_dir = pts[4] - pts[2]
    index_dir = pts[8] - pts[5]

    def angle(u, v) -> float:
        c = float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))
        return float(np.degrees(np.arccos(np.clip(c, -1.0, 1.0))))

    points_down = (pts[12][1] > pts[0][1]) or (pts[8][1] > pts[0][1])

    # --- Y: thumb + pinky only -------------------------------------------
    if thumb_open and ext["pinky"] and not ext["index"] and not ext["middle"] and not ext["ring"]:
        return "Y", 0.9

    # --- I: pinky only ----------------------------------------------------
    if ext["pinky"] and not thumb_open and not ext["index"] and not ext["middle"] and not ext["ring"]:
        return "I", 0.9

    # --- F: index-thumb circle, other three extended ----------------------
    if not ext["index"] and ext["middle"] and ext["ring"] and ext["pinky"] and d(4, 8) < 0.4:
        return "F", 0.85

    # --- W: index+middle+ring extended ------------------------------------
    if ext["index"] and ext["middle"] and ext["ring"] and not ext["pinky"]:
        return "W", 0.85

    # --- Index + middle group: U / V / R / H / K / P -----------------------
    if ext["index"] and ext["middle"] and not ext["ring"] and not ext["pinky"]:
        tips_gap = d(8, 12)
        crossed = np.sign(pts[8][0] - pts[12][0]) != np.sign(pts[5][0] - pts[9][0])
        if crossed:
            return "R", 0.7
        if thumb_open or d(4, 10) < 0.45:  # thumb raised between fingers
            return ("P" if points_down else "K"), 0.7
        if tips_gap > 0.45:
            return "V", 0.85
        horizontal = abs(pts[8][0] - pts[5][0]) > abs(pts[8][1] - pts[5][1])
        return ("H" if horizontal else "U"), 0.75

    # --- Index-only group: D / G / L / Q / X -------------------------------
    if (ext["index"] or half["index"]) and not ext["middle"] and not ext["ring"] and not ext["pinky"]:
        if thumb_open:
            if points_down:
                return "Q", 0.65
            return ("L" if angle(thumb_dir, index_dir) > 55 else "G"), 0.75
        if half["index"]:
            return "X", 0.65
        return "D", 0.8

    # --- Open-hand group: B / C / O ----------------------------------------
    if n_ext == 4 and not thumb_open:
        adjacent = d(8, 12) < 0.35 and d(12, 16) < 0.35 and d(16, 20) < 0.4
        if adjacent:
            return "B", 0.85
    if all(half.values()):
        arc = d(4, 8)
        if arc < 0.3:
            return "O", 0.65
        if arc < 0.9:
            return "C", 0.6
    fingertip_on_thumb = (d(8, 4) + d(12, 4)) / 2
    if n_ext == 0 and not thumb_open and fingertip_on_thumb < 0.45 and e["index"] > -0.1:
        return "O", 0.6

    # --- Fist group: A / E / S / M / N / T ---------------------------------
    if n_ext == 0 and not thumb_open:
        if fingertip_on_thumb < 0.4:
            return "E", 0.6
        anchors = {"A": 5, "T": 6, "S": 10, "N": 14, "M": 18}
        letter = min(anchors, key=lambda k: d(4, anchors[k]))
        return letter, 0.6

    return None, 0.0
