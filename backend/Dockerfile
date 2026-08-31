# ──────────────────────────────────────────────────────────────────────────────
# VoxDetect Backend Dockerfile
# ──────────────────────────────────────────────────────────────────────────────
# This image installs backend dependencies independently of the host .venv.
# The host .venv is for local development only and is NOT used inside Docker.
#
# ML Core dependencies (torch, transformers, etc.) are NOT installed by default.
# The backend starts without them and returns 503 from ML endpoints until
# they are available. Uncomment the ML deps section below to enable inference.
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install OS-level dependencies needed for audio processing libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Install backend Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Optional: uncomment to enable real ML inference inside Docker ──────────────
# COPY ../ml-core/requirements.txt ml_requirements.txt
# RUN pip install --no-cache-dir -r ml_requirements.txt
# ─────────────────────────────────────────────────────────────────────────────

# Copy backend application source
COPY app/ app/
COPY config/ config/

# Copy ml-core source so the MLService sys.path injection works
# (ml-core contains the P1 code; we only read from it, never modify it)
COPY ../ml-core/src/ ml-core/src/

# Create data directory for SQLite (mounted as volume in compose)
RUN mkdir -p data

# Create non-root user for security
RUN useradd -m -u 1000 voxdetect && chown -R voxdetect:voxdetect /app
USER voxdetect

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
