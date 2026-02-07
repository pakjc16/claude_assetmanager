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
- **VWorld API** - 주소 검색 및 토지정보 조회 (API 키 필요)
- **data.go.kr 건축물대장 API** - 표제부/층별개요 조회 (API 키 필요)

## 외부 API 연동

### VWorld API
- **토지임야목록조회**: `/api/land` → `https://api.vworld.kr/ned/data`
- PNU 기반 토지 정보 (지목, 면적) 자동 조회

### 건축물대장 API (data.go.kr)
- **표제부 조회**: `/api/building/getBrTitleInfo`
- **층별개요 조회**: `/api/building/getBrFlrOulnInfo`
- Vite 프록시 설정: `vite.config.ts`

### PNU 변환 로직
PNU(필지고유번호) 19자리 구조:
```
시군구코드(5) + 법정동코드(5) + 대지구분(1) + 본번(4) + 부번(4)
```

**중요**: PNU → 건축물대장 API 변환 시 대지구분코드(11번째 자리)는 **-1 적용** 필요
- PNU: 1=대지, 2=산
- API: 0=대지, 1=산

```typescript
const apiPlatGbCd = String(parseInt(pnu.substring(10, 11)) - 1);
```

## 코드 컨벤션

- 한국어 로케일 포맷: `toLocaleString('ko-KR')`
- 숫자 포맷: 3자리마다 콤마, 소수점 있으면 1자리 표시
- 화폐 단위: 원(소수점 없음), 만원(소수점 없음), 억원(소수점 2자리)
- 면적 단위: ㎡(소수점 1자리), 평(소수점 1자리, ㎡ × 0.3025)
- 모든 스타일링은 Tailwind 클래스 사용

## 모바일 반응형 코딩 표준

모든 UI 컴포넌트는 모바일 퍼스트로 작성하고, `md:` 접두사로 데스크탑 스타일 추가.

### 테이블 반응형 패턴

```tsx
// 테이블 컨테이너: 가로 스크롤 허용
<div className="overflow-x-auto">
  <table className="w-full text-xs md:text-sm min-w-[400px]">

// 테이블 헤더
<thead className="bg-[#f8f9fa]">
  <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold tracking-tight md:tracking-normal">
    <th className="p-1.5 md:p-3 text-center whitespace-nowrap">컬럼명</th>
    <th className="p-1.5 md:p-3 text-center hidden md:table-cell">모바일숨김</th>

// 테이블 셀
<td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#202124] whitespace-nowrap tracking-tight">

// 합계 행 (tfoot)
<tfoot className="bg-[#e8f0fe] border-t-2 border-[#1a73e8]">
  <tr className="font-bold text-[#1a73e8] text-[10px] md:text-sm">
```

### 카드/버튼 반응형 패턴

```tsx
// 카드 패딩
<div className="p-2 md:p-4 rounded-lg md:rounded-xl">

// 버튼
<button className="px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold">
  <Plus size={12} className="md:w-4 md:h-4"/> 추가
</button>

// 섹션 헤더
<h3 className="font-black text-sm md:text-base flex items-center gap-1 md:gap-2">
  <Icon size={16} className="md:w-[18px] md:h-[18px]"/> 제목
</h3>
```

### 핵심 클래스 규칙

| 용도 | 모바일 | 데스크탑 |
|------|--------|----------|
| 본문 텍스트 | `text-xs` | `md:text-sm` |
| 작은 텍스트 | `text-[10px]` | `md:text-xs` |
| 아주 작은 텍스트 | `text-[8px]` | `md:text-[10px]` |
| 테이블 셀 패딩 | `p-1.5` | `md:p-3` |
| 카드 패딩 | `p-2` | `md:p-4` |
| 아이콘 | `size={12}` | `md:w-3.5 md:h-3.5` |
| 갭 | `gap-1` | `md:gap-2` |

### 모바일 최적화 기법

- `whitespace-nowrap`: 숫자/금액/면적 줄바꿈 방지
- `tracking-tight`: 자간 축소 (숫자 데이터)
- `truncate`: 긴 텍스트 말줄임
- `hidden md:table-cell`: 모바일에서 불필요한 열 숨김
- `hidden md:inline`: 모바일에서 보조 텍스트 숨김
- `min-w-[400px]`: 테이블 최소 너비 (가로 스크롤 보장)
- `md:opacity-0 md:group-hover:opacity-100`: 데스크탑만 호버 효과

## 부동산 용어 (한국어)

- 물건 = Property (부동산 자산)
- 토지/필지 = Lot
- 지번 = JibunAddress (본번-부번)
- 지목 = Jimok (대, 전, 답, 임야 등)
- 호실 = Unit
- 건축면적 = Building Area
- 연면적 = Gross Floor Area
- 전용면적 = Exclusive Area
- 건폐율 = 건축면적/대지면적×100
- 용적률 = 연면적/대지면적×100

## UI/UX 가이드라인

### 색상 팔레트
- **주색상**: #1a73e8 (파란색)
- **배경**: 흰색, #f8f9fa (연회색)
- **테두리**: #dadce0
- **텍스트**: #202124 (진회색), #5f6368 (중회색)
- **강조하지 않음**: 알록달록한 그라데이션 사용 금지

### 자산관리 개요 페이지 레이아웃
- 상단: 대표 사진(16:9, 갤러리 오픈) + 2x2 지표 카드
- 지표 카드: 총 대지면적, 총 건축면적, 총 연면적, 월 임대수입
- 건폐율/용적률은 건축/연면적 카드 내 표시

### 주요 기능
- **사진 갤러리**: 클릭 시 전체화면 모달, 추가/삭제 가능
- **건물 자동 등록**: 토지 추가 시 PNU로 건축물대장 조회 후 일괄 등록
- **층별 정보 테이블**: 면적 단위 토글 반영 (㎡/평)
- **호실 층수**: 건물 층수 범위 내 드롭다운 선택

## 참고 사항

- **백엔드 미연동** - 모든 데이터는 클라이언트 사이드, 새로고침 시 초기화
- **테스트/린팅 미설정** - 프로젝트 확장 시 추가 권장
- **`.claude/`** - Claude Code 로컬 설정 (settings.local.json)
- **API 키 관리** - `.env` 파일 또는 설정 페이지에서 관리 (VWorld, data.go.kr)

## 개발 이력

### 2025-02-07: 모바일 반응형 UI 전면 개선 (앱 전체 적용)

**적용된 컴포넌트**:
- `PropertyManager.tsx` - 자산 관리 (토지/건물/층별/호실 테이블, 개요 카드)
- `ContractManager.tsx` - 계약 관리 (임대차/유틸리티/유지보수 탭, 계약 테이블)
- `FacilityManager.tsx` - 시설 관리 (시설 카드 그리드, 상태 표시)
- `FinanceManager.tsx` - 납입/청구 (청구 테이블, 수납 버튼)
- `StakeholderManager.tsx` - 인물/업체 (검색, 필터 탭, 인물 카드)
- `Dashboard.tsx` - 대시보드 (위젯 설정, 차트, 계약 만료 테이블)
- `StatsCard.tsx` - 통계 카드 (재무 현황 지표)

**주요 변경사항**:
- 모든 테이블에 `overflow-x-auto`, `min-w-[400px]` 적용
- 폰트 크기 반응형: `text-[10px] md:text-sm`, `text-[8px] md:text-[10px]`
- 패딩 반응형: `p-2 md:p-5`, `p-1.5 md:p-3`
- 아이콘 크기 반응형: `size={12} className="md:w-4 md:h-4"`
- 줄바꿈 방지: `whitespace-nowrap`, `tracking-tight`
- 모바일에서 불필요한 열/텍스트 숨김: `hidden md:table-cell`
- 모바일 반응형 코딩 표준 문서화 (향후 개발 기준)

### 2025-02-05: 건축물대장 API 연동 및 UI 개선
- data.go.kr 건축물대장 API 연동 (표제부/층별개요)
- PNU 기반 건물 자동 조회 및 일괄 등록 기능 구현
- 건물 상세정보 확장 (주차상세, 승강기상세, 내진설계 등)
- 사진 갤러리 모달 추가 (추가/삭제/탐색)
- 개요 페이지 레이아웃 재구성 (사진 + 2x2 지표)
- 층별정보 테이블 면적 단위 토글 반영
- 기본정보 섹션 제거로 UI 간소화
- 색상 통일 (파란색 #1a73e8 + 회색 톤)

### 알려진 이슈
- HMR Fast Refresh 경고 발생 (기능에는 영향 없음)
- 대용량 물건 목록 시 성능 최적화 필요
