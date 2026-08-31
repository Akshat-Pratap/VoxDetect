# VoxDetect Backend — P2 (Backend + Infrastructure)

**SIH26104** — AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks

---

## 1. Purpose

This directory contains the **FastAPI backend** for VoxDetect.
It is the orchestration, API, policy, persistence, streaming, and integration layer for the system.

The backend is **not** the ML model (P1) and **not** the frontend (P3/P5/P6).

It consumes the P1 ML Core through a clean adapter (`MLService`) and exposes a REST + WebSocket API to clients.

---

## 2. Architecture

```
Client / Frontend / External System
            │
            ▼
      FastAPI Backend  (this directory)
            │
            ▼
    AnalysisService
            │
            ▼
        MLService          ← ONLY backend file that imports P1
            │
            ▼
      P1 DetectionEngine   (ml-core/src/ — READ-ONLY)
            │
     ┌──────┼──────┐
     ▼      ▼      ▼
  Model  Prosody  Voiceprint
            │
            ▼
        Risk Result
            │
            ▼
  OrganizationService  (policy engine)
            │
   ┌────────┼────────┐
   ▼        ▼        ▼
Evidence  Webhook  Response
 SQLite
```

**Privacy rule: raw audio is never stored.** Audio exists only in memory during inference, then is immediately discarded.

---

## 3. Requirements

| Requirement | Version |
|---|---|
| Python | 3.11+ |
| FastAPI | ≥ 0.115 |
| Uvicorn | ≥ 0.30 |
| SQLAlchemy | ≥ 2.0 (async) |
| aiosqlite | ≥ 0.20 |
| httpx | ≥ 0.27 |

Full list: [`requirements.txt`](requirements.txt)

---

## 4. Virtual Environment Setup

**All backend commands must run inside `backend/.venv`.**
Never install backend dependencies globally.

### Windows

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Linux / macOS

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

---

## 5. ML Core Integration

The ML Core lives in `ml-core/` and is **read-only** (P1's responsibility).

`MLService` adds `ml-core/src/` to `sys.path` at startup and imports `DetectionEngine` once.
No other backend file imports P1 code.

To enable real ML inference, also install the P1 dependencies:

```bash
# On Linux / macOS:
pip install -r ../ml-core/requirements.txt

# On Windows:
pip install webrtcvad-wheels
pip install -r ../ml-core/requirements.txt
```

This downloads the Wav2Vec2 model from HuggingFace (~1.2 GB) on first run.

Without the ML dependencies, the backend starts successfully but returns `503 ML_SERVICE_UNAVAILABLE` from inference endpoints.

### 5.1 Use our fine-tuned model (P1) — where to put the files

By default `MODEL_CHECKPOINT` is empty, so the backend silently uses the **pretrained
Gustking base** downloaded from HuggingFace — **not our `ft_head_v1` fine-tune.** To serve
our trained model you must copy it onto the machine running the backend and set
`MODEL_CHECKPOINT` to that folder. **Drive is not connected to the backend; it is only
mounted inside the P1 Colab session.** Download from Colab/Drive first.

> The checkpoint dir must contain the **3 loadable files** (NOT `finetune_report.json`,
> which is just our metrics doc and is ignored):
>
> ```
> config.json               ← labels {0:"real", 1:"fake"}
> model.safetensors         ← the weights (~1.26 GB)
> preprocessor_config.json  ← sampling_rate 16000
> ```

Step-by-step for whoever owns the backend:

1. **Get the model files off Colab/Drive**
   ```bash
   # In Colab, zip the fine-tune folder and download it to your machine:
   !cd /content/drive/MyDrive/VoxDetect && zip -r ft_head_v1.zip ml-core/ft_head_v1
   ```
   Download `ft_head_v1.zip`, then unzip it on the backend machine.

2. **Put the folder somewhere stable on the backend host**
   ```bash
   # macOS/Linux example — pick your own path, there is no reserved location:
   mkdir -p backend/models
   cp -r /path/to/unzipped/ft_head_v1 backend/models/
   # Verify the 3 files are present:
   ls backend/models/ft_head_v1   # -> config.json model.safetensors preprocessor_config.json
   ```
   (Using an existing repo dir like `backend/models/` is fine, but it is **gitignored /
   untracked** — do not commit ~1.26 GB of weights to git.)

3. **Point the backend at it** — in `backend/.env`:
   ```env
   # Absolute or backend-relative path to the folder from step 2:
   MODEL_CHECKPOINT=/absolute/path/to/backend/models/ft_head_v1
   MODEL_DEVICE=cpu          # or cuda if a GPU host
   ```

4. **Install the ML deps** (required for any inference, including ours):
   ```bash
   pip install -r ../ml-core/requirements.txt
   ```

5. **Restart and verify it loaded OUR model** — the startup log prints the model source,
   and `/v1/health` exposes it as `model_source`:
   ```
   MLService FETCHED MODEL SOURCE -> fine-tuned:/absolute/path/to/backend/models/ft_head_v1
   ```
   ```bash
   curl -s localhost:8000/v1/health
   # -> "ml_service": "ok", "model_source": "fine-tuned:.../backend/models/ft_head_v1"
   ```
   If you see `model_source` = `pretrained:Gustking`, the backend is running the base model
   and `MODEL_CHECKPOINT` is not set — go back to step 3.

> **Docker note:** the backend `Dockerfile` deliberately leaves the ML-deps section commented
> out (keeps the image small). If you run the backend in a container, uncomment that section,
> copy `backend/models/ft_head_v1` into the image, and set `MODEL_CHECKPOINT` to the in-container
> path.

---

## 6. Environment Configuration

```bash
cp .env.example .env
# Edit .env to match your environment
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/voxdetect.db` | Database connection |
| `DEFAULT_ORG` | `enterprise` | Default organization profile |
| `MAX_UPLOAD_SIZE_MB` | `25` | Max audio upload size |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Allowed CORS origins |
| `MODEL_DEVICE` | `cpu` | `cpu` or `cuda` |
| `MODEL_CHECKPOINT` | _(empty)_ | Path to fine-tuned checkpoint |
| `WEBHOOK_TIMEOUT_SECONDS` | `5` | Webhook delivery timeout |
| `LOG_LEVEL` | `INFO` | Logging level |

---

## 7. Running Locally

```powershell
# Windows
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
# Linux/macOS
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open:
- **API docs**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc
- **Health**: http://127.0.0.1:8000/health

---

## 8. API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe (no auth, no DB check) |
| `GET` | `/v1/health` | Versioned health + DB + ML status |
| `POST` | `/v1/analyze-call` | Analyse audio for voice cloning risk |
| `POST` | `/v1/enroll` | Enroll a speaker voiceprint |
| `GET` | `/v1/enroll/{speaker_id}` | Get enrolled speaker profile |
| `DELETE` | `/v1/enroll/{speaker_id}` | Remove enrolled speaker |
| `GET` | `/v1/alerts` | List risk alert history |
| `WS` | `/v1/stream` | Real-time streaming analysis |

---

## 9. POST /v1/analyze-call

Accepts `multipart/form-data`:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | audio file | ✅ | WAV / MP3 / FLAC / OGG (≤ MAX_UPLOAD_SIZE_MB) |
| `org` | string | ❌ | `bank`, `enterprise`, `government` |
| `context` | JSON string | ❌ | `CallContext` metadata |

**CallContext schema:**
```json
{
  "first_time_contact": false,
  "high_value": false,
  "odd_hour": false,
  "sensitive_data_request": false,
  "enrolled_speaker_id": null
}
```

**Example response:**
```json
{
  "analysis_id": "uuid",
  "risk_score": 87.4,
  "band": "high",
  "confidence": 0.91,
  "models": {"synthetic_prob": 0.91},
  "signals": {
    "model": 0.91,
    "prosody_anomaly": 0.72,
    "voiceprint_risk": 0.50,
    "context_risk": 0.35
  },
  "organization": "bank",
  "flagged": true,
  "severity": "high",
  "recommended_action": "Perform independent callback and verification.",
  "timestamp": "2026-08-31T12:00:00Z",
  "evidence_id": "uuid"
}
```

---

## 10. WebSocket /v1/stream

Connect to `ws://host/v1/stream`.

**Protocol:**

1. Connect
2. Send JSON metadata frame:
   ```json
   {"org": "enterprise", "first_time_contact": false, "high_value": false}
   ```
3. Receive `{"type": "ready", "connection_id": "..."}`
4. Send binary audio chunks (2–3 seconds each)
5. Receive `risk_update` JSON frames per chunk:
   ```json
   {
     "type": "risk_update",
     "chunk_index": 0,
     "risk_score": 82.4,
     "rolling_risk_score": 78.1,
     "band": "high",
     "flagged": true,
     "severity": "high",
     "recommended_action": "..."
   }
   ```

Rolling risk uses a sliding-window median over the last N chunks to prevent spurious jumps.

---

## 11. Organization Profiles

Configured in `config/organizations/`:

| Profile | Thresholds | Use case |
|---|---|---|
| `enterprise` | Standard (30/70/90) | General enterprise |
| `bank` | Strict (25/60/85) | Financial services |
| `government` | Most strict (20/55/80) | Government/security |

To add a new profile, create `config/organizations/myorg.json` and add the name to `VALID_ORGS` in `organization_service.py`.

---

## 12. Database

SQLite at `data/voxdetect.db`.

**Tables:**

- `analysis_evidence` — Immutable audit log of every analysis
- `enrolled_speakers` — Speaker voiceprint registrations

**Privacy constraints (enforced at ORM level):**
- `analysis_evidence` has no audio column
- `enrolled_speakers` stores only the embedding JSON, never audio

---

## 13. Voice Enrollment

```
POST /v1/enroll
  multipart/form-data: speaker_id, name, file

→ 201 Created
{
  "speaker_id": "ceo_001",
  "display_name": "Alice Smith",
  "enrolled": true,
  "created_at": "..."
}
```

The raw audio is deleted immediately after embedding extraction.
The embedding is stored in SQLite but **never returned in any API response**.

---

## 14. Webhooks

Configure a webhook URL in `config/organizations/yourorg.json`:

```json
{
  "webhook": {
    "url": "https://your-system.example.com/voxdetect-alert",
    "trigger_on": ["high", "critical"]
  }
}
```

Webhook delivery is a background task — it **never blocks** the analysis response.
If delivery fails, the analysis result and evidence record are unaffected.

---

## 15. Privacy Model

| Data type | How handled |
|---|---|
| Raw audio | Held in memory only during inference, then deleted |
| Audio bytes | Never written to disk, never stored in SQLite |
| Speaker embeddings | Stored as JSON in SQLite, never exposed via API |
| Risk scores | Stored in `analysis_evidence` |
| PII | Not collected beyond caller-supplied speaker_id |
| Webhook payloads | Contain only metadata — no audio, no embeddings |
| Logs | Risk scores and metadata only — no audio content |

---

## 16. Testing

```bash
cd backend
.\.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate

pytest --tb=short -v
```

Tests use:
- In-memory SQLite (no persistent state)
- Mock MLService (deterministic results, no model download)
- Real FastAPI routing, schemas, DB, and org policy

**Coverage:**
- Health endpoints
- Analysis: valid audio, invalid format, oversized, ML failure, timeout
- Evidence: creation, no audio stored, field verification
- Enrollment: CRUD, embedding privacy, re-enrollment
- Webhook: success, HTTP failure, timeout, invalid URL
- Streaming: rolling risk logic, ML error handling

---

## 17. Docker

```bash
# From repository root
docker compose -f backend/docker-compose.yml up --build
```

The container:
- Exposes port `8000`
- Persists SQLite to `voxdetect_data` volume
- Runs as non-root user `voxdetect`

The host `.venv` is **not** mounted inside Docker.

---

## 18. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `503 ML_SERVICE_UNAVAILABLE` | torch/transformers not installed | `pip install -r ../ml-core/requirements.txt` |
| `503 ML_SERVICE_UNAVAILABLE` | HuggingFace model not downloaded | First run downloads ~1.2 GB; ensure internet access |
| `ImportError: No module named 'audio_utils'` | sys.path not set | Only MLService should call ML Core; check import path |
| DB `OperationalError` | `data/` directory missing | `mkdir -p backend/data` |
| CORS errors | Frontend origin not in `CORS_ORIGINS` | Update `.env` → `CORS_ORIGINS=http://your-frontend-url` |
| WebSocket not connecting | Missing `websockets` package | Reinstall: `pip install -r requirements.txt` |

---

## 19. P1 ML Core is Read-Only

> ⚠️ **The `ml-core/` directory belongs to P1 and must not be modified by P2.**
>
> If an integration issue arises, solve it inside `backend/app/services/ml_service.py`.
> Do not rewrite `detect.py`, `audio_utils.py`, `voiceprint.py`, or `prosody.py`.
