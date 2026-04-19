from functools import lru_cache
from typing import List
import os

from PIL import Image
import numpy as np
import easyocr

ALLOWED_EXTS = (".png", ".jpg", ".jpeg")

@lru_cache(maxsize=1)
def _get_reader():
    # English by default; set gpu=True if you have CUDA
    return easyocr.Reader(["en"], gpu=False, verbose=False)

def extract_text(image_path: str) -> str:
    """
    Load an image from image_path and extract text using easyocr.
    Supports .png, .jpg, .jpeg. Returns the extracted text as a string.
    Raises ValueError for unsupported file types or unreadable images.
    """
    if not isinstance(image_path, str) or not os.path.exists(image_path):
        raise ValueError("image_path must be an existing file path")

    ext = os.path.splitext(image_path)[1].lower()
    if ext not in ALLOWED_EXTS:
        raise ValueError("Unsupported file type. Use png, jpg, or jpeg.")

    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as e:
        raise ValueError(f"Cannot open image: {e}")

    arr = np.array(img)
    reader = _get_reader()
    # detail=0 returns only text strings; paragraph=True merges lines when possible
    results: List[str] = reader.readtext(arr, detail=0, paragraph=True)
    text = "\n".join([s.strip() for s in results if isinstance(s, str) and s.strip()])
    return text