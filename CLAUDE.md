# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

RealtyFlow는 React 19 + TypeScript + Vite로 구축된 임대 부동산 관리 대시보드입니다. 한국 사용자를 위해 설계되어 한국어 로케일 포맷, 화폐 단위(원, 만원, 억원), 면적 단위(㎡, 평), 부동산 전문 용어를 지원합니다.

## 빌드 및 개발 명령어

```bash
npm install       # 의존성 설치
npm run dev       # 개발 서버 실행 (localhost:3000)
npm run build     # 프로덕션 빌드 (dist/)
npm run preview   # 프로덕션 빌드 미리보기
```

## Git 워크플로우

**브랜치 전략**: 기능별 브랜치 생성 후 개발

```bash
# 새 기능 개발 시
git checkout -b feature/기능명
# 개발 완료 후
git add .
git commit -m "기능 설명"
git checkout main
git merge feature/기능명
git push
```

**커밋 시 포함 항목**:
- 변경된 소스 코드
- `.claude/` 디렉토리 (Claude Code 설정)
- `CLAUDE.md` 업데이트 (기능 변경 시)

## 아키텍처

**상태 관리**: `App.tsx`에서 useState 훅으로 중앙 집중 관리, props로 하위 컴포넌트에 전달. 외부 상태 관리 라이브러리 미사용.

**핵심 파일**:
- `App.tsx` - 중앙 상태 관리, 글로벌 설정(면적/화폐 단위), 탭 기반 네비게이션
- `types.ts` - 부동산 도메인 TypeScript 인터페이스 (Property, Building, Unit, Lot, LeaseContract, Facility 등)

**컴포넌트** (`components/`):
- `Dashboard.tsx` - Recharts 시각화가 포함된 분석 위젯
- `PropertyManager.tsx` - 물건, 건물, 호실, 토지 CRUD (건물별 호실 그룹화)
- `AddressSearch.tsx` - 주소 검색 (다음 우편번호 API / VWorld API 선택 가능)
- `ContractManager.tsx` - 임대차 계약 생명주기 관리
- `FacilityManager.tsx` - 시설 인벤토리 및 유지보수 추적
- `StakeholderManager.tsx` - 임차인/협력업체/관리자 디렉토리
- `FinanceManager.tsx` - 거래 및 수납 추적
- `ValuationManager.tsx` - 자산 감정 이력

## 기술 스택

- **React 19** + TypeScript 5
- **Vite 6** 빌드 도구
- **Tailwind CSS** CDN 방식
- **Recharts** 차트 (Area, Line, Pie)
- **Lucide React** 아이콘
- **다음 우편번호 API** - 주소 검색 (기본, API 키 불필요)
- **VWorld API** - 주소 검색 (선택, API 키 필요)

## 코드 컨벤션

- 한국어 로케일 포맷: `toLocaleString('ko-KR')`
- 숫자 포맷: 3자리마다 콤마, 소수점 있으면 1자리 표시
- 화폐 단위: 원(소수점 없음), 만원(소수점 없음), 억원(소수점 2자리)
- 면적 단위: ㎡(소수점 1자리), 평(소수점 1자리, ㎡ × 0.3025)
- 모든 스타일링은 Tailwind 클래스 사용

## 부동산 용어 (한국어)

- 물건 = Property (부동산 자산)
- 토지/필지 = Lot
- 지번 = JibunAddress (본번-부번)
- 지목 = Jimok (대, 전, 답, 임야 등)
- 호실 = Unit
- 건축면적 = Building Area
- 연면적 = Gross Floor Area
- 전용면적 = Exclusive Area

## 참고 사항

- **백엔드 미연동** - 모든 데이터는 클라이언트 사이드, 새로고침 시 초기화
- **테스트/린팅 미설정** - 프로젝트 확장 시 추가 권장
- **`.claude/`** - Claude Code 로컬 설정 (settings.local.json)
