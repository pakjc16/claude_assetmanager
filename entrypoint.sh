#!/bin/sh
set -e

REPO_URL="${GITHUB_REPO:-https://github.com/pakjc16/claude_assetmanager.git}"
BRANCH="${GITHUB_BRANCH:-main}"
PROJECT_DIR="/app/project"

echo "========================================="
echo "  RealtyFlow 개발서버 시작"
echo "========================================="

# 1) 프로젝트 클론 또는 풀
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "[1/3] GitHub에서 프로젝트 다운로드 중..."
  git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
else
  echo "[1/3] 최신 코드 가져오는 중..."
  cd "$PROJECT_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
fi

cd "$PROJECT_DIR"

# 2) 의존성 설치
echo "[2/3] 패키지 설치 중..."
npm install

# 3) 자동 업데이트 백그라운드 실행 (30초마다 GitHub 확인)
echo "[3/3] 자동 업데이트 감시 시작 (30초 간격)"
(
  while true; do
    sleep 30
    cd "$PROJECT_DIR"
    git fetch origin 2>/dev/null
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "origin/$BRANCH")
    if [ "$LOCAL" != "$REMOTE" ]; then
      echo ""
      echo ">>> 새 커밋 감지! 업데이트 중..."
      git reset --hard "origin/$BRANCH"
      npm install --prefer-offline 2>/dev/null
      echo ">>> 업데이트 완료! Vite가 자동으로 반영합니다."
      echo ""
    fi
  done
) &

# 개발 서버 실행
echo ""
echo "========================================="
echo "  웹앱 접속: http://나스IP:3100"
echo "  GitHub 푸시하면 30초 내 자동 반영!"
echo "========================================="
echo ""

npx vite --host 0.0.0.0 --port 3100
