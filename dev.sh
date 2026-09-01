#!/usr/bin/env bash
# dev.sh — one command to run the whole VoxDetect app locally for testing/demo.
#
#   ./dev.sh          -> start backend + frontend, both in foreground (Ctrl-C stops both)
#   ./dev.sh up       -> start both in the background (logs in /tmp/vox_*.log)
#   ./dev.sh down     -> stop the background processes
#   ./dev.sh status   -> show what is running
#
# Requires: backend/.venv already created + deps installed (see BACKEND_DEPS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend/web"
BACKEND_PORT=8000
FRONTEND_PORT=5173
PY="$BACKEND_DIR/.venv/bin/python"

echo_ok()   { printf '\033[32m%s\033[0m\n' "$1"; }
echo_err()  { printf '\033[31m%s\033[0m\n' "$1"; }

# The one-time dependency install (only needed when .venv does not exist yet).
BACKEND_DEPS_VERSION="3.14"
install_backend() {
  echo_ok "Creating backend/.venv and installing dependencies (one-time)..."
  python3 -m venv "$BACKEND_DIR/.venv"
  "$PY" -m pip install --upgrade pip
  "$PY" -m pip install -r "$BACKEND_DIR/requirements.txt"
  "$PY" -m pip install torch torchaudio transformers librosa soundfile numpy scipy huggingface_hub
  echo_ok "Backend deps installed. The model weights (~1.2GB) will download on first backend start."
}

ensure_backend() {
  if [ ! -x "$PY" ]; then
    install_backend
  fi
  # The lists is a smoke-test that imports (and thus deps) work.
  if ! "$PY" -c "import torch, transformers, librosa, soundfile, numpy, scipy" 2>/dev/null; then
    echo_err "Backend .venv exists but is missing deps. Reinstalling..."
    install_backend
  fi
  # Download the model weights now (cached to ~/.cache/huggingface), so first real start is instant.
  if [ "${1:-}" = "with-model" ]; then
    "$PY" - <<'EOF'
from huggingface_hub import snapshot_download
snapshot_download("Gustking/wav2vec2-large-xlsr-deepfake-audio-classification")
print("Model weights cached.")
EOF
  fi
}

backend_cmd() {
  (cd "$BACKEND_DIR" && exec "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT")
}

frontend_cmd() {
  (cd "$FRONTEND_DIR" && exec npm run dev)
}

wait_backend() {
  echo -n "Waiting for backend "
  for _ in $(seq 1 60); do
    if curl -s --max-time 2 "http://127.0.0.1:$BACKEND_PORT/v1/health" >/dev/null 2>&1; then
      echo_ok " ready."
      return 0
    fi
    echo -n "."
    sleep 2
  done
  echo_err " backend did not become ready in time. Check backend log: /tmp/vox_backend.log"
  return 1
}

case "${1:-fg}" in
  up)
    ensure_backend
    echo_ok "Starting backend in background -> /tmp/vox_backend.log"
    backend_cmd >"/tmp/vox_backend.log" 2>&1 &
    echo $! >"/tmp/vox_backend.pid"
    echo_ok "Starting frontend in background -> /tmp/vox_frontend.log"
    frontend_cmd >"/tmp/vox_frontend.log" 2>&1 &
    echo $! >"/tmp/vox_frontend.pid"
    wait_backend
    echo_ok "All up:"
    printf '  Frontend : http://localhost:%s/analyze\n' "$FRONTEND_PORT"
    printf '  Backend  : http://localhost:%s/v1/health\n' "$BACKEND_PORT"
    echo "  Stop with: $0 down"
    ;;
  down)
    # Kill from pidfiles first (written by `up`).
    kill "$(cat /tmp/vox_backend.pid 2>/dev/null)" 2>/dev/null && echo_ok "Backend pidfile killed" || true
    kill "$(cat /tmp/vox_frontend.pid 2>/dev/null)" 2>/dev/null && echo_ok "Frontend pidfile killed" || true
    rm -f /tmp/vox_backend.pid /tmp/vox_frontend.pid

    # The frontend's vite/node survive the pidfile kill (npm wrapper only),
    # so also stop any real uvicorn/vite processes for this project.
    pkill -f "uvicorn app.main:app" 2>/dev/null && echo_ok "Backend uvicorn stopped" || true
    pkill -f "vite" 2>/dev/null && echo_ok "Frontend vite stopped" || true
    pkill -f "node.*frontend/web" 2>/dev/null && echo_ok "Frontend node stopped" || true
    sleep 1

    b="stopped"; curl -s --max-time 2 http://127.0.0.1:$BACKEND_PORT/v1/health >/dev/null 2>&1 && b="STILL RUNNING"
    f="stopped"; curl -s --max-time 2 -o /dev/null http://localhost:$FRONTEND_PORT 2>/dev/null && f="STILL RUNNING"
    echo "backend : $b"
    echo "frontend: $f"
    if [ "$b" = "STILL RUNNING" ] || [ "$f" = "STILL RUNNING" ]; then
      echo_err "Some processes did not stop. Killing whatever holds the ports..."
      kill $(lsof -ti tcp:$BACKEND_PORT) 2>/dev/null || true
      kill $(lsof -ti tcp:$FRONTEND_PORT) 2>/dev/null || true
      sleep 1
    fi
    echo_ok "Done."
    ;;
    status)
    b="not-running"; curl -s --max-time 2 http://127.0.0.1:$BACKEND_PORT/v1/health >/dev/null 2>&1 && b="RUNNING"
    f="not-running"; curl -s --max-time 2 -o /dev/null http://localhost:$FRONTEND_PORT 2>/dev/null && f="RUNNING"
    echo "backend : $b  (http://localhost:$BACKEND_PORT/v1/health)"
    echo "frontend: $f  (http://localhost:$FRONTEND_PORT/analyze)"
    ;;
  setup)
    ensure_backend with-model
    echo_ok "Setup complete."
    ;;
  *)
    ensure_backend
    echo_ok "Starting backend (foreground)..."
    backend_cmd &
    BGPID=$!
    trap 'kill "$BGPID" 2>/dev/null' EXIT INT TERM
    if ! wait_backend; then exit 1; fi
    echo_ok "Starting frontend (foreground)..."
    frontend_cmd
    echo_err "Frontend exited. Stopping backend."
    ;;
esac
