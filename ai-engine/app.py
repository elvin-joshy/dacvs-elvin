from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io, os, tempfile

import fitz  # PyMuPDF

from ocr_utils import extract_text
from fraud_utils import fraud_score

app = Flask(__name__)
CORS(app)

@app.get("/")
def home():
    return (
        """<!doctype html>
        <title>AI Analyze</title>
        <h1>Upload certificate image/PDF to /analyze</h1>
        <form action="/analyze" method="post" enctype="multipart/form-data">
          <input type="file" name="file" accept="image/*,.pdf" required/>
          <button type="submit">Analyze</button>
        </form>
        <p>Health: <a href="/health">/health</a></p>
        """,
        200,
        {"Content-Type": "text/html; charset=utf-8"},
    )

@app.get("/health")
def health():
    return jsonify({"ok": True})

def _ocr_image_pil(img: Image.Image) -> str:
    # Save to temp PNG so extract_text() (png/jpg/jpeg) can process it
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img.save(tmp, format="PNG")
        tmp_path = tmp.name
    try:
        return extract_text(tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

@app.post("/analyze")
def analyze():
    if "file" not in request.files:
        return jsonify({"ok": False, "error": "file field missing"}), 400

    up = request.files["file"]
    data = up.read()
    if not data:
        return jsonify({"ok": False, "error": "empty file"}), 400

    filename = (up.filename or "").lower()
    mimetype = (up.mimetype or "").lower()

    institution_hint = os.getenv("INSTITUTION_HINT")
    max_pdf_pages = int(os.getenv("MAX_PDF_PAGES", "3"))

    # Handle PDF uploads
    if filename.endswith(".pdf") or mimetype == "application/pdf":
        try:
            doc = fitz.open(stream=data, filetype="pdf")
        except Exception:
            return jsonify({"ok": False, "error": "invalid pdf"}), 400

        if doc.page_count == 0:
            return jsonify({"ok": False, "error": "empty pdf"}), 400

        texts, scores = [], []
        pages_to_process = min(doc.page_count, max_pdf_pages)
        for i in range(pages_to_process):
            page = doc.load_page(i)
            # Render at 200 DPI for better OCR
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")

            txt = _ocr_image_pil(img)
            sc = fraud_score(img, txt, institution_hint)

            texts.append(txt.strip())
            scores.append(float(sc))

        combined_text = "\n\n".join([t for t in texts if t])
        final_score = max(scores) if scores else 0.0

        return jsonify({
            "fraud_score": float(final_score),
            "text": combined_text
        })

    # Handle image uploads (png/jpg/jpeg/webp, etc.)
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return jsonify({"ok": False, "error": "unsupported image"}), 400

    extracted_text = _ocr_image_pil(img)
    score = fraud_score(img, extracted_text, institution_hint)

    return jsonify({
        "fraud_score": float(score),
        "text": extracted_text.strip()
    })

if __name__ == "__main__":
    # Expose to local network as before
    app.run(host="0.0.0.0", port=5001, debug=True)