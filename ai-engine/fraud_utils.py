from typing import Optional, Dict, Any
from PIL import Image
import numpy as np
import cv2
import re

DEFAULT_KEYWORDS = ["university", "college", "institute", "polytechnic", "academy"]

def _blur_subscore(img_rgb: Image.Image) -> tuple[float, float]:
    # Laplacian variance: lower == blurrier
    arr = np.array(img_rgb)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()  # focus measure
    # Map variance to [0..1] (score=1 very blurry)
    if fm >= 200:
        s = 0.0
    elif fm <= 50:
        s = 1.0
    else:
        s = (200.0 - fm) / (200.0 - 50.0)
    return float(s), float(fm)

def _lowres_subscore(img_rgb: Image.Image) -> tuple[float, int]:
    w, h = img_rgb.size
    min_dim = min(w, h)
    # <= 400px -> 1.0, >= 800px -> 0.0
    if min_dim >= 800:
        s = 0.0
    elif min_dim <= 400:
        s = 1.0
    else:
        s = (800 - min_dim) / 400.0
    return float(s), int(min_dim)

def _missing_institution_subscore(text: str, institution_hint: Optional[str]) -> float:
    t = (text or "").lower()
    # If hint provided, require it; else check generic keywords
    if institution_hint:
        return 0.0 if institution_hint.lower() in t else 1.0
    return 0.0 if any(k in t for k in DEFAULT_KEYWORDS) else 0.8  # slightly softer than strict

def _spacing_subscore(text: str) -> float:
    t = (text or "")
    if not t.strip():
        return 0.5  # unknown -> mild suspicion
    lines = [ln for ln in t.splitlines() if ln.strip()]
    # Ratio of multi-space runs to length (penalize "  " and irregular spacing)
    multi = len(re.findall(r"\s{2,}", t))
    ratio = multi / max(1.0, len(t) / 40.0)  # normalized by rough words count
    # Variation of spaces per line
    spaces_per_line = [ln.count(" ") for ln in lines] or [0]
    mean = np.mean(spaces_per_line)
    std = np.std(spaces_per_line)
    cv = 0.0 if mean == 0 else float(std / mean)  # coefficient of variation
    # Map to [0..1]
    s = min(1.0, 0.5 * ratio + 0.5 * min(cv, 1.0))
    return float(s)

def compute_fraud_score(img_rgb: Image.Image, text: str, institution_hint: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns:
      {
        "fraud_score": float 0..1,
        "subs": { "blur":..., "low_res":..., "missing_institution":..., "spacing":... },
        "metrics": { "laplacian_var":..., "min_dim":... }
      }
    """
    blur_s, lap_var = _blur_subscore(img_rgb)
    lowres_s, min_dim = _lowres_subscore(img_rgb)
    miss_s = _missing_institution_subscore(text, institution_hint)
    spacing_s = _spacing_subscore(text)

    # Weighted blend (sum to 1.0)
    score = (
        0.35 * blur_s +
        0.25 * lowres_s +
        0.30 * miss_s +
        0.10 * spacing_s
    )
    score = max(0.0, min(1.0, float(score)))

    return {
        "fraud_score": score,
        "subs": {
            "blur": blur_s,
            "low_res": lowres_s,
            "missing_institution": miss_s,
            "spacing": spacing_s,
        },
        "metrics": {
            "laplacian_var": lap_var,
            "min_dim": min_dim,
        }
    }

def fraud_score(img_rgb: Image.Image, text: str, institution_hint: Optional[str] = None) -> float:
    """
    Thin wrapper that returns only the fraud score (0..1).
    """
    return float(compute_fraud_score(img_rgb, text, institution_hint)["fraud_score"])