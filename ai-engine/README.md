# AI Engine Service (Minimal Flask App)

## Overview

Lightweight Flask service exposing a single health endpoint:
GET /ping -> "AI Engine Running"

Built for Python 3.9+ with production-friendly patterns:

- App factory
- Structured stdout logging
- Gunicorn-ready (WSGI)

## Quick Start (Windows PowerShell)

```powershell
cd c:\Users\USER\DACVS\ai-engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Visit:
http://127.0.0.1:8000/ping -> AI Engine Running

## Gunicorn (Production Style)

```bash
# Linux / WSL
pip install -r requirements.txt
gunicorn main:app --bind 0.0.0.0:8000 --workers 2 --threads 2 --timeout 30
```

## Environment Variables

| Variable  | Default | Description                    |
| --------- | ------- | ------------------------------ |
| APP_HOST  | 0.0.0.0 | Bind address                   |
| APP_PORT  | 8000    | Port                           |
| LOG_LEVEL | INFO    | Logging level (DEBUG, INFO)    |
| FLASK_ENV | (unset) | Set to `development` for debug |

Example:

```powershell
$env:LOG_LEVEL="DEBUG"
$env:FLASK_ENV="development"
python main.py
```

## Test Endpoint

```bash
curl -i http://localhost:8000/ping
```

Expected:
HTTP/1.0 200 OK
AI Engine Running

## Notes

- Do not use the built-in Flask server in production.
- Add more endpoints or models under a separate `routes/` or `services/` module as you expand.
- Logging is stdout-only for container/orchestrator aggregation.

## License

MIT
