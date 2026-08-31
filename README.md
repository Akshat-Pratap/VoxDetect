<div align="center">

<h1>VoxDetect</h1>

<p>
  <b>Real-Time Voice-Cloning Detection &amp; Prevention for Telephone Impersonation Attacks.</b><br />
  A full-stack platform that listens to a live phone call, fuses a Wav2Vec2 deepfake
  classifier with prosody, voiceprint and call-context signals, and raises a 0–100 risk
  score in real time.
</p>

<br />

[![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Transformers-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Google Colab](https://img.shields.io/badge/Google%20Colab-F9AB00?style=for-the-badge&logo=googlecolab&logoColor=white)](https://colab.research.google.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## Contents

- [The Problem](#the-problem)
- [What VoxDetect Does](#what-voxdetect-does)
- [Models We Use](#models-we-use)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Evaluation &amp; Metrics](#evaluation--metrics)
- [Security](#security)

---

## Directory Structure

```
.
├── ml-core/                          # P1 — ML core (built, importable)
│   ├── src/
│   │   ├── detect.py                 # DetectionEngine — the API the backend imports
│   │   ├── audio_utils.py            # load/preprocess/chunk audio → 16kHz mono
│   │   ├── voiceprint.py             # speaker embedding (ECAPA-TDNN) + cosine match
│   │   ├── prosody.py                # pitch/pause/speaking-rate anomaly scoring
│   │   ├── evaluate.py               # ACC/FPR/FNR/ROC-AUC + precision/recall/F1 harness
│   │   ├── validate.py               # first-run sanity check (label mapping + scores)
│   │   └── results_tracking.py       # source-of-truth ablation_results.csv writer
│   ├── scripts/
│   │   ├── finetune_head.py          # fine-tune the classification head (keep backbone)
│   │   ├── prepare_garystafford.py   # open-license backup dataset (Track A)
│   │   ├── upload_dataset.py         # local audio → verified Drive archive
│   │   └── organize_dataset.py       # archive → session-local test_data
│   ├── notebooks/
│   │   ├── sprint0_setup_validation.ipynb   # setup + validate model sanity
│   │   ├── sprint1_baseline_english.ipynb   # English baseline
│   │   ├── sprint2_hindi_test.ipynb         # Hindi / multilingual test
│   │   ├── sprint3_finetune_head.ipynb      # fine-tune the HEAD
│   │   ├── clone_voice_xtts.ipynb           # build cloned clips free (Coqui XTTS-v2)
│   │   └── live_demo.ipynb                  # live demo: mic real voice + clone clip
│   ├── test_data/                    # real/ + cloned/ clips (gitignored; on Drive)
│   ├── requirements.txt
│   └── README.md
├── app/                              # P2 — FastAPI backend (per sprint plan)
│   ├── main.py                       # /analyze-call, /stream (WebSocket), /enroll, /health
│   ├── models/                       # Pydantic request/response schemas
│   ├── rules/                        # P5 rule engine + org config profiles
│   ├── db/                           # SQLite evidence log (scores + metadata, no audio)
│   └── tests/
├── web/                              # P3 — React dashboard (per sprint plan)
│   ├── src/
│   │   ├── components/               # risk gauge, org selector, alert toasts, history
│   │   └── pages/                    # live-call screen, org settings, audit log
│   └── package.json
├── docker-compose.yml                # one-command full stack (P2 + web + model service)
├── AGILE_SPRINTS.md                  # 6-person sprint plan / roles
└── README.md
```

---

## The Problem

Voice is now the easiest identity to forge. With a few seconds of recorded speech, a
free open-source model (like Coqui XTTS-v2) can clone any person's voice into a
convincing, real-time impersonation. Attackers use this to:

- call a victim and **impersonate a trusted person** (a bank executive, an executive's
  direct report, a family member) to authorize a fraud;
- trigger **one-time password (OTP) / fund-transfer scams** with a voice that sounds
  like the victim's own relative or manager;
- impersonate **government / enterprise officials** for phishing and Aadhaar / SIM /
  banking fraud.

The attack succeeds because there is **nothing at the point of the call** telling the
victim that the voice they hear is synthetic. This problem statement asks for a system
that detects and prevents these **voice-cloning impersonation attacks in real time** —
while the call is happening, not after the money has moved.

## What VoxDetect Does

**VoxDetect is that real-time guard.** It sits where the call audio is available (a live
mic in the demo; the incoming caller stream in production), scores the speaker while the
call is live, and raises a 0–100 risk score the moment it sounds cloned.

You can explain it in one sentence:

> _"If a real person speaks, the app stays calm. If a cloned voice calls and tries to
> sound like someone you trust, the app flags it live, before the fraud completes."_

**Why it works when a single model fails.** Modern TTS can defeat *any one* audio
classifier. So VoxDetect does not trust a single signal — it fuses **four** independent
lines of evidence:

1. **Deepfake audio model** — the strongest clue: the raw waveform often carries
   spectral/compression artifacts of a generated voice.
2. **Prosody** — robots have unnatural rhythm. Pitch variance, pauses and speaking rate
   of a clone deviate from a real human.
3. **Voiceprint** — if the caller is supposedly a *known* contact, we compare against
   their enrolled voice embedding; a clone never matches exactly.
4. **Call context** — metadata (first-time contact, odd hour, high-value or
   sensitive-data request) lifts the score even when the audio itself is borderline.

These are weighted (`0.5/0.25/0.15/0.10`) and squashed into one score plus a
`low / medium / high` action band. The demonstration flow: a team member speaks into the
mic → the app says **REAL** (low score); a pre-made XTTS clone clip is played → the app
spikes to **CLONED** (high score) and an alert fires.

## Models We Use

| Signal | Model / Method | What it does |
|--------|----------------|--------------|
| Deepfake audio | `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification` — **Wav2Vec2-XLSR-53** fine-tuned for deepfake audio on ASVspoof2019 | Classifies whether a waveform is synthetic. Multilingual base (incl. Hindi). Vendor ACC 0.93, F1 0.94, EER 0.04 |
| Prosody | **librosa PYIN** pitch tracker → pitch variance, pause ratio, speaking rate | Flags unnatural rhythm: clones show higher pitch variance and odd pause/rate patterns |
| Voiceprint | **Resemblyzer (ECAPA-TDNN)** 256-d speaker embedding + cosine similarity | Speaker identity; low similarity to an enrolled voice → higher risk |
| Clone generation (dataset) | **Coqui XTTS-v2** (open source) | Creates the "cloned" half of our training data from each volunteer's reference voice |

**Key decision — keep the backbone, fine-tune only the head.** Research on modern TTS
(ASVspoof/DEEP-VOICE style benchmarks) repeatedly shows that *no* pretrained checkpoint
generalises to the newest cloning engines. So instead of swapping models, VoxDetect
**keeps the Gustking Wav2Vec2 backbone** and fine-tunes only its classification head on
our own volunteer-and-clone data, validated with **leave-one-speaker-out (LOSO)**
cross-validation. This yields numbers about *real-vs-synthetic*, not about speaker ID.

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/features.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; Features</h3>

<b style="display:inline-flex;align-items:center;gap:8px;font-size:17px;"><img src="images/icons/features.svg" width="18" height="18" style="vertical-align:middle;"/>&nbsp; Real-Time Call Monitoring</b><br />
A live call is captured (mic on the demo machine, or a streaming call-audio feed in
deployment) and scored in short chunks. Each chunk returns a `0–100` risk score, so a
threshold crossing can fire a mid-call alert.

<b style="display:inline-flex;align-items:center;gap:8px;font-size:17px;"><img src="images/icons/features.svg" width="18" height="18" style="vertical-align:middle;"/>&nbsp; Multi-Signal Fusion</b><br />
No single model is trusted alone. A Wav2Vec2 deepfake classifier (0.5) is fused with
prosody anomaly (0.25), voiceprint match (0.15) and call-context flags (0.10) into one
squashed risk score with `low` / `medium` / `high` bands.

<b style="display:inline-flex;align-items:center;gap:8px;font-size:17px;"><img src="images/icons/features.svg" width="18" height="18" style="vertical-align:middle;"/>&nbsp; Voiceprint Enrollment</b><br />
Enrol a known contact's voice (ECAPA-TDNN embedding). On a future call, low cosine
similarity to the enrolled embedding raises risk — catching a clone of a number the
victim trusts.

<b style="display:inline-flex;align-items:center;gap:8px;font-size:17px;"><img src="images/icons/features.svg" width="18" height="18" style="vertical-align:middle;"/>&nbsp; Organisation-Aware Rules</b><br />
Every organisation (Bank / Enterprise / Government) has a config profile with its own
thresholds and recommended actions. The same risk score triggers a different response
per profile.

<b style="display:inline-flex;align-items:center;gap:8px;font-size:17px;"><img src="images/icons/features.svg" width="18" height="18" style="vertical-align:middle;"/>&nbsp; Custom Cloned-Voice Dataset</b><br />
Because modern TTS defeats every pretrained detector, we record real volunteers and
generate their clones with **one consistent engine** (Coqui XTTS-v2, English + Hindi),
so the fine-tuned model is validated on real-vs-copy, not on the model's own training set.

<b style="display:inline-flex;align-items:center;gap:8px;font-size:17px;"><img src="images/icons/features.svg" width="18" height="18" style="vertical-align:middle;"/>&nbsp; Privacy-First: No Audio is Stored</b><br />
Only scores and metadata are logged to the evidence database. Raw call audio is never
persisted — the detection signal is computed in memory (via `score_audio(wav, sr)`) and
discarded.

<b style="display:inline-flex;align-items:center;gap:8px;font-size:17px;"><img src="images/icons/features.svg" width="18" height="18" style="vertical-align:middle;"/>&nbsp; Reusable API Layer</b><br />
`DetectionEngine` is a clean importable module. The same core powers the REST endpoint,
the WebSocket streaming path and the Colab demo — it plugs into any telephony app without
that app owning the model.

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/techstack.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; Tech Stack</h3>

| | |
|---|---|
| **Language / ML** | Python 3.10 · PyTorch 2.0 · Transformers (Hugging Face) · librosa · soundfile |
| **Detection model** | `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification` (Wav2Vec2-XLSR-53) |
| **Speaker embedding** | Resemblyzer / ECAPA-TDNN 256-d embeddings |
| **Prosody** | librosa PYIN pitch, pause ratio, speaking rate |
| **Backend** | FastAPI (REST + WebSocket) · gRPC · Pydantic |
| **Frontend** | React 18 |
| **Data / results** | Google Drive archive (test_data.zip + manifest) · SQLite evidence log · CSV/JSON results |
| **Deployment** | Docker / docker-compose · Colab T4 GPU (training) |

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/architecture.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; System Architecture</h3>

> **How we hear the real call.** In the live demo, a real person speaks into the
> microphone and `sounddevice` captures the buffer in memory. In production, the telephony
> provider forwards the caller's audio stream. Either way the audio becomes a numpy
> `(waveform, sample_rate)` buffer handed to `DetectionEngine.score_audio()` — no disk
> write, no stored audio.

```
                ┌───────────────────────────────────────────────────────────────┐
                │                        CLIENT LAYER                            │
                │  React Dashboard (web/)  ·  Colab live demo (notebooks/)      │
                │  ·  Python gRPC/REST client · any telephony app (the plug-in) │
                └──────────────┬────────────────────────────────────────────────┘
                               │  live audio buffer (score_audio)  ·  REST/WS
                               ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │                        API / TRANSPORT LAYER  (P2)                    │
        │   FastAPI   POST /analyze-call   ·   WS /stream   ·   POST /enroll    │
        │   gRPC service wrapping the same core · org-profile-aware responses   │
        └──────────────┬───────────────────────────────────────────────────────┘
                       │  from detect import DetectionEngine
                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            DETECTION CORE  (P1 · ml-core)                      │
│   score_audio(wav, sr, context) → risk_score 0–100                             │
│   ┌─────────────────────────────┬───────────────────┬───────────────────────┐   │
│   │  model: Wav2Vec2-XLSR deep- │  prosody: pitch   │  voiceprint: ECAPA-   │   │
│   │  fake classifier (0.5)      │  var/pause/rate   │  TDNN cosine (0.15)   │   │
│   │                            │  anomaly (0.25)   │                       │   │
│   └─────────────────────────────┴───────────────────┴───────────────────────┘   │
│                                 +  context flags (0.10) → _fuse() → risk band     │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │                        DATA LAYER                                    │
        │  SQLite evidence log (scores/metadata, NO audio)                     │
        │  Google Drive: test_data.zip+manifest · results/*.json · checkpoints │
        └──────────────────────────────────────────────────────────────────────┘
```

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/dataflow.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; Data Flow</h3>

```
 Live call / mic buffer                 REST call                    streaming path
   (mic via sounddevice /                 │                              │
    streaming call-audio feed)            ▼                              ▼
        │              POST /analyze-call {audio, context}        WS /stream {chunks}
        │  wav,sr from                        │                    ┌──────────────┐
        ▼  audio_utils.load_audio            ▼                    │ per-chunk    │
 DetectionEngine.score_audio(wav,sr,ctx) ◄─ DetectionEngine.analyze│ score,      │
        │  _model_confidence          ◄──── _proc/logits ◄─────────┘ rolling      │
        │  prosody_anomaly_score      ◄──── extract_prosody          show         │
        │  voiceprint_risk            ◄──── cosine vs enrollment                   │
        │  context_risk               ◄──── _context_anomaly                       │
        ▼ _fuse(0.5,0.25,0.15,0.10) ──► sigmoid ──► 0–100 risk, band low/mid/high  │
        │
        ▼
 {risk_score, band, signals} → rules engine → org action → alert/webhook
        │
        ▼ store scores + metadata only (no audio) → SQLite evidence log + Drive JSON/CSV
```

**Key Design Decisions**

| Decision | Why |
|----------|-----|
| Fusion over single model | A cloned voice can fool a classifier, but cloned prosody and voiceprint mismatch give it away; context flags catch the social-engineering layer |
| Keep the backbone, fine-tune only the head | No pretrained detector generalises to modern TTS; we adapt the head to our own real-vs-copy data under leave-one-speaker-out CV |
| `score_audio(wav, sr)` over file I/O | Live mic needs no disk round-trip; the same path serves streaming chunks |
| Context flags as a weighted signal | A low-risk audio but a "first-time contact asking for OTP" still lifts the score |
| Never store raw audio | The privacy-first claim is backed by the design, not a slide |

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/structure.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; Project Structure</h3>

```
.
├── ml-core/                  # P1 — ML core: detect/audio/voiceprint/prosody/evaluate
│   ├── src/                  #   importable package (flat: detect, audio_utils, ...)
│   ├── scripts/              #   data pipeline + fine-tune + garystafford prep
│   ├── notebooks/            #   sprint experiments + clone generation + live demo
│   └── test_data/            #   real/ + cloned/ clips (gitignored; durable on Drive)
├── app/                      # P2 — FastAPI backend (REST + WebSocket + gRPC + DB)
├── web/                      # P3 — React dashboard (gauge, alerts, org selector)
├── docker-compose.yml        # zero-setup full-stack up
├── AGILE_SPRINTS.md          # 6-person sprint plan · roles P1–P6
└── README.md
```

The P1 ML core is **built and committed**. The P2 backend (`app/`), P3 frontend (`web/`)
and Docker stack are built out across the sprint plan in `AGILE_SPRINTS.md`, consuming
the stable `DetectionEngine` API documented below.

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/api.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; API Reference</h3>

<details>
<summary><code>POST /health</code> — liveness probe</summary>

```json
200 { "status": "ok", "model": "wav2vec2-xlsr-deepfake" }
```
</details>

<details>
<summary><code>POST /analyze-call</code> — analyse a complete clip, return risk score</summary>

Request:
```json
{ "audio": "<base64-wav>", "org": "bank", "context": { "first_time_contact": true } }
```

Response:
```json
{
  "risk_score": 78.4,
  "band": "high",
  "signals": { "model": 0.91, "prosody_anomaly": 0.08, "voiceprint_risk": 0.5, "context_risk": 0.61 },
  "action": "Call back via official number"
}
```
</details>

<details>
<summary><code>WS /stream</code> — streaming chunks, per-chunk rolling risk</summary>

Send PCM/WAV chunks with an optional `org` context; each message returns a rolling
`0–100` score plus `band`, so a threshold crossing can fire a mid-call alert.
</details>

<details>
<summary><code>POST /enroll</code> — store a known contact's voiceprint embedding</summary>

```json
{ "id": "contact-42", "audio": "<base64-wav>" }
```
</details>

<details>
<summary><code>gRPC</code> — <code>AnalyzeCall(audio, context) → RiskScore</code></summary>

A thin gRPC service wrapping the *same* core analysis function as REST, for telco-grade
integration and a demo client.
</details>

**Detection engine** (the module P2 wires against — `ml-core/src/detect.py`):

```python
from detect import DetectionEngine

eng = DetectionEngine()                 # load model ONCE; keep alive in server

result = eng.analyze_audio("clip.wav", context=None)      # file mode
wav, sr = audio_utils.load_audio("clip.wav")              # or a live mic numpy buffer
result = eng.score_audio(wav, sr, context=None)           # in-memory / real-time
result = eng.analyze_chunk(chunk_bytes, context=None)     # streaming chunk
```

Every call returns: `{risk_score (0–100), band (low|medium|high), models, signals}`.

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/start.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; Getting Started</h3>

**Prerequisites**
- Python 3.10+, PyTorch 2.0+, `transformers`, `librosa`, `soundfile`
- Google account for Colab (the heavy GPU runs happen there)
- `ffmpeg` for audio conversion

**Run the detection core (no GPU server needed):**

```bash
pip install -r ml-core/requirements.txt
cd ml-core/src
python detect.py path/to/clip.wav
# -> {'risk_score': ..., 'band': ..., 'signals': {...}}
```

**Push the dataset to Drive once** (when clips change), so it persists across Colab
sessions:

```bash
python3 ml-core/scripts/upload_dataset.py \
    --root ml-core/test_data \
    --upload-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset
```

**Fine-tune + evaluate (Colab)** — start with `notebooks/sprint0_setup_validation.ipynb`,
then `sprint3_finetune_head.ipynb`:

```bash
python3 scripts/finetune_head.py \
    --data team \
    --data-dir /content/VoxDetect_data \
    --out-dir /content/drive/MyDrive/VoxDetect/ml-core/checkpoints/ft_head_v1 \
    --epochs 5 --lr 1e-5 --augment --holdout speaker1 \
    --results /content/drive/MyDrive/VoxDetect/ml-core/results/ablation_results.csv
```

**Run the full stack (deployment):**

```bash
docker-compose up          # FastAPI + model service + web dashboard
```

Then open the dashboard and hit `POST /analyze-call` or `WS /stream`.

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/check.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; Evaluation &amp; Metrics</h3>

Every run is recorded in the source-of-truth `ml-core/results/ablation_results.csv`
(deduped on `variant, dataset, split, checkpoint`) plus a per-run JSON on Drive. Each row
self-documents its dataset, checkpoint, and every metric:

`accuracy · fpr · fnr · roc_auc · precision · recall · f1 · threshold · epochs · lr · n_freeze · git commit · timestamp`

```bash
# find the best threshold and append a run
python3 -m evaluate --root /content/VoxDetect_data \
    --run-name baseline_team --dataset team \
    --results /content/drive/MyDrive/VoxDetect/ml-core/results/ablation_results.csv \
    --find-threshold --json
```

**Model.** `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification` — Wav2Vec2-XLSR-53
(multilingual, incl. Hindi) fine-tuned for deepfake audio on ASVspoof2019 (vendor: ACC
0.93, F1 0.94, EER 0.04). We **keep this backbone** and fine-tune only the classification
head on our own volunteer+clone data.

**Two experimental tracks, kept separate:**
- **Track A — `garystafford`** open-license backup (`garystafford/deepfake-audio-detection`,
  CC-BY-4.0, ~900 English clips, plain clip-level split) to guarantee a trained model +
  numbers by the deadline. **Honest caveat:** high ACC reflects the corpus, not a
  generalisation claim.
- **Track B — `team`** volunteer+clone clips, evaluated with **leave-one-speaker-out
  cross-validation** (no speaker leaks across train/test). The honest headline metric.

**Fine-tuning guardrails:** label order verified from the pretrained `id2label`; sample
rate read from the feature-extractor config; per-epoch + `best_<tag>` checkpoints with
`--resume` (a Colab runtime drop loses nothing); optional `--holdout <speaker>` for an
honest A/B; a guard that every speaker has both real and cloned clips.

---

<h3 style="display:inline-flex;align-items:center;gap:8px;font-size:22px;margin:8px 0;"><img src="images/icons/security.svg" width="22" height="22" style="vertical-align:middle;"/>&nbsp; Security</h3>

- **No raw audio persisted** — only risk scores and call metadata hit the evidence log.
- **Privacy-first by design** — live buffers are scored in memory and discarded
  (`score_audio`), so the platform detects without storing a copy of the victim's voice.
- **Organisation profiles** isolate thresholds and actions per org.
- Production hardening (rate limiting, CORS, input validation, audit trail, incident
  export) ships across the sprint plan.
