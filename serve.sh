#!/usr/bin/env bash
# Launch the local clone of monopo.vn
# Usage: ./serve.sh   (then open http://localhost:8765)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8765}"

echo "Serving $DIR on http://localhost:$PORT"
exec python3 -m http.server "$PORT" --directory "$DIR"
