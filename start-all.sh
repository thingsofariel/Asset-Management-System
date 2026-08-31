#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_DIR="$PROJECT_ROOT/.dev-logs"
mkdir -p "$LOG_DIR"

echo "==> Starting Postgres and Redis..."
docker start asset_mgmt_postgres unified-redis

echo "==> Waiting a few seconds for them to be ready..."
sleep 3

echo "==> Starting API server..."
(cd "$BACKEND_DIR" && npm run start:dev) > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!

echo "==> Starting bulk-import worker..."
(cd "$BACKEND_DIR" && npx ts-node src/worker.ts) > "$LOG_DIR/worker.log" 2>&1 &
WORKER_PID=$!

echo "==> Starting frontend..."
(cd "$FRONTEND_DIR" && npm run dev) > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo ""
echo "All three running. Logs below (combined). Press Ctrl+C to stop everything."
echo ""

cleanup() {
  echo ""
  echo "==> Stopping API, worker, and frontend..."
  kill "$API_PID" "$WORKER_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$API_PID" "$WORKER_PID" "$FRONTEND_PID" 2>/dev/null
  echo "==> Done. (Postgres/Redis containers are left running — stop those separately with 'docker stop' if you want.)"
  exit 0
}
trap cleanup SIGINT SIGTERM

tail -f "$LOG_DIR/api.log" "$LOG_DIR/worker.log" "$LOG_DIR/frontend.log"
