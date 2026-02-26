#!/bin/sh
set -e

# /app/node_modules가 없거나 비어있으면 /deps에서 복사
if [ ! -f /app/node_modules/.package-lock.json ]; then
  echo "[entrypoint] node_modules 복사 중 (/deps → /app)..."
  cp -a /deps/node_modules /app/
  echo "[entrypoint] 복사 완료"
else
  echo "[entrypoint] node_modules 이미 존재, 건너뜀"
fi

exec npm run dev
