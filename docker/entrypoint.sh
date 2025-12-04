#!/bin/sh
set -eu

mkdir -p /app/maps /app/artworks

cat > /app/public/runtime-env.js <<EOF
window.__KERNEL_ENV__ = {
  WS_PORT: "${WS_PORT:-}",
};
EOF

node dist/server/src/index.js &
WS_PID=$!

node node_modules/.bin/next start --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}" &
APP_PID=$!

terminate_children() {
  kill "$WS_PID" "$APP_PID" 2>/dev/null || true
  wait "$WS_PID" "$APP_PID" 2>/dev/null || true
}

trap terminate_children INT TERM

while :; do
  if ! kill -0 "$WS_PID" 2>/dev/null; then
    wait "$WS_PID" || true
    terminate_children
    exit 1
  fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    wait "$APP_PID" || true
    terminate_children
    exit 1
  fi
  sleep 1
done
