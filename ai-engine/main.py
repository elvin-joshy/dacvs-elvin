import os
import logging
from logging import Formatter, StreamHandler
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from PIL import Image
import io, tempfile
import fitz  # PyMuPDF

from ocr_utils import extract_text
from fraud_utils import fraud_score

DEFAULT_LOG_LEVEL = "INFO"

def configure_logging(level: str) -> None:
    logger = logging.getLogger()
    if logger.handlers:
        return
    logger.setLevel(level.upper())
    handler = StreamHandler()
    handler.setFormatter(
        Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            "%Y-%m-%d %H:%M:%S",
        )
    )
    logger.addHandler(handler)

def _ocr_image_pil(img: Image.Image) -> str:
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

def create_app() -> Flask:
    log_level = os.getenv("LOG_LEVEL", DEFAULT_LOG_LEVEL)
    configure_logging(log_level)

    app = Flask(__name__)
    CORS(app)

    @app.route("/ping", methods=["GET"])
    def ping() -> Response:
        return Response("AI Engine Running", mimetype="text/plain")

    @app.route("/", methods=["GET"])
    def root() -> Response:
        return Response("OK", mimetype="text/plain")
        
    @app.get("/health")
    def health():
        return jsonify({"ok": True, "status": "AI Engine Running"})

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

        # Handle image uploads
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

    app.logger.info("Flask app initialized (log level=%s)", log_level.upper())
    return app

# WSGI entrypoint
app = create_app()

if __name__ == "__main__":
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    debug = os.getenv("FLASK_ENV") == "development"
    app.logger.info("Starting development server on %s:%s (debug=%s)", host, port, debug)
    app.run(host=host, port=port, debug=debug)
