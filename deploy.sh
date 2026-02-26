#!/bin/bash
# =============================================
# RealtyFlow 시놀로지 NAS 배포 스크립트
# =============================================
# 사용법:
#   ./deploy.sh          → 개발 모드 (Vite HMR, 실시간 편집)
#   ./deploy.sh prod     → 프로덕션 모드 (nginx, 빌드 후 서빙)
#   ./deploy.sh update   → git pull 후 개발 컨테이너 재시작
#   ./deploy.sh rebuild  → node_modules 포함 완전 재빌드

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 색상 출력
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[RealtyFlow]${NC} $1"; }
warn() { echo -e "${YELLOW}[경고]${NC} $1"; }
err() { echo -e "${RED}[오류]${NC} $1"; }

case "${1:-dev}" in
  dev)
    log "개발 모드 시작 (Vite HMR, 포트 3000)"
    log "파일 수정 시 브라우저 자동 반영됩니다"
    docker compose up dev --build -d
    log "실행 완료! http://<NAS_IP>:8847 에서 확인하세요"
    docker compose logs -f dev
    ;;

  prod)
    log "프로덕션 빌드 시작..."

    # dist 폴더가 없으면 먼저 빌드
    if [ ! -d "dist" ]; then
      log "dist 폴더 없음 → 빌드 실행 중..."
      docker run --rm -v "$SCRIPT_DIR":/app -w /app node:20-alpine sh -c "npm ci && npm run build"
    fi

    docker compose up prod --build -d
    log "프로덕션 실행 완료! http://<NAS_IP>:8847 에서 확인하세요"
    ;;

  update)
    log "git pull 실행 중..."
    git pull origin main

    if docker compose ps dev --status running -q 2>/dev/null | grep -q .; then
      log "개발 컨테이너 재시작..."
      docker compose restart dev
      log "업데이트 완료! Vite가 자동으로 변경사항을 감지합니다"
    else
      warn "개발 컨테이너가 실행 중이 아닙니다. './deploy.sh dev'로 시작하세요"
    fi
    ;;

  rebuild)
    log "완전 재빌드 (node_modules 초기화)..."
    docker compose down dev 2>/dev/null || true
    docker compose build --no-cache dev
    docker compose up dev -d
    log "재빌드 완료! http://<NAS_IP>:8847 에서 확인하세요"
    docker compose logs -f dev
    ;;

  stop)
    log "컨테이너 중지..."
    docker compose down
    log "중지 완료"
    ;;

  logs)
    docker compose logs -f dev
    ;;

  *)
    echo "사용법: $0 {dev|prod|update|rebuild|stop|logs}"
    echo ""
    echo "  dev      - 개발 모드 시작 (기본값, Vite HMR)"
    echo "  prod     - 프로덕션 모드 (nginx)"
    echo "  update   - git pull + 컨테이너 재시작"
    echo "  rebuild  - node_modules 포함 완전 재빌드"
    echo "  stop     - 모든 컨테이너 중지"
    echo "  logs     - 개발 서버 로그 보기"
    ;;
esac
