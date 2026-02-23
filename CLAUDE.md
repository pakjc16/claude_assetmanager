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
- `Dashboard.tsx` - Recharts 시각화 위젯 + 이벤트 캘린더
- `PropertyManager.tsx` - 물건, 건물, 호실, 토지 CRUD (건물별 호실 그룹화) + 로드뷰/갤러리
- `AddressSearch.tsx` - 주소 검색 (다음 우편번호 API / VWorld API 선택 가능)
- `ContractManager.tsx` - 임대차 계약 생명주기 관리
- `FacilityManager.tsx` - 시설 인벤토리 및 유지보수 추적
- `StakeholderManager.tsx` - 임차인/협력업체/관리자 디렉토리 + 우편 라벨 인쇄
- `FinanceManager.tsx` - 거래 및 수납 추적
- `ValuationManager.tsx` - 자산 감정 이력
- `LoginPage.tsx` - 로그인 / 초기설정 (신규)

## 기술 스택

- **React 19** + TypeScript 5
- **Vite 6** 빌드 도구
- **Tailwind CSS** CDN 방식
- **Recharts** 차트 (Area, Line, Pie)
- **Lucide React** 아이콘
- **다음 우편번호 API** - 주소 검색 (기본, API 키 불필요)
- **VWorld API** - 주소 검색 및 토지정보 조회 (API 키 필요)
- **data.go.kr 건축물대장 API** - 표제부/층별개요 조회 (API 키 필요)
- **data.go.kr 국가승강기정보 API** - 승강기 기본정보/안전관리자/검사이력/자체점검 조회 (API 키 필요)

## 외부 API 연동

### VWorld API
- **토지임야목록조회**: `/api/land` → `https://api.vworld.kr/ned/data`
- PNU 기반 토지 정보 (지목, 면적) 자동 조회

### 건축물대장 API (data.go.kr)
- **표제부 조회**: `/api/building/getBrTitleInfo`
- **층별개요 조회**: `/api/building/getBrFlrOulnInfo`
- Vite 프록시 설정: `vite.config.ts`

### 국가승강기정보 API (data.go.kr)
- **프록시**: `/api/elevator` → `https://apis.data.go.kr/B553664`
- **주의**: 각 오퍼레이션마다 서비스명이 다름 (프록시에는 서비스명 미포함, fetch URL에 직접 지정)
- 4개 API 병렬 호출 (`Promise.allSettled`):

| # | 서비스명 | 오퍼레이션 | 용도 |
|---|---------|-----------|------|
| ① | ElevatorInformationService | getElevatorViewM | 승강기 기본정보 (단건, pageNo 없음) |
| ② | ElevatorSafeMngrService | getSafeMngrList | 안전관리자 목록 |
| ③ | ElevatorInformationService | getElvtrInspctInqireM | 검사이력 |
| ④ | ElevatorSelfCheckService | getSelfCheckList | 자체점검 목록 |

- **XML 응답** 파싱: `DOMParser`로 파싱, `getXmlValue`/`getXmlItems` 유틸 사용
- **단위 포함 문자열**: `liveLoad`("1000 Kg"), `ratedCap`("15 인승"), `ratedSpeed`("1 m/min") → `parseNumFromStr`로 숫자 추출
- **날짜 포맷**: YYYYMMDD 또는 YYYY-MM-DD → `formatApiDate`로 정규화
- **검사결과 판별 순서**: 불합격 → 조건부 합격 → 합격 → 보류 (조건부 합격을 합격으로 처리하지 않음)
- **검사이력 UI**: 최신순 정렬, 10건 단위 페이지네이션
- **참고 문서**: `D:\AI툴 개발\구글\api\승강기관리\참고.txt`

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

## Claude Code 작업 원칙 (토큰 낭비 방지)

### 핵심 원칙: 한 번에 제대로 하기

**반복 수정으로 토큰을 낭비하지 않기 위한 필수 체크리스트**

#### 1. 요구사항 정확히 파악하기
- ❌ **금지**: 사용자의 말을 대충 해석하고 바로 코딩 시작
- ✅ **필수**: 요구사항이 모호하면 **먼저 질문**하고, 명확해진 후 코딩 시작
- ✅ **필수**: 기능의 **전체 범위**를 파악한 후 작업 시작 (부분 구현 후 "아 그것도요" 방지)
- ✅ **필수**: 사용자가 레퍼런스 이미지/스크린샷을 제공하면 **꼼꼼히 분석** 후 작업

#### 2. 기존 코드 반드시 읽고 이해하기
- ❌ **금지**: 기존 코드 안 읽고 추측으로 수정
- ✅ **필수**: 수정 대상 파일의 **전체 구조** 파악 후 작업
- ✅ **필수**: 관련 컴포넌트의 **props 인터페이스** 확인 (App.tsx ↔ 하위 컴포넌트 연결)
- ✅ **필수**: `types.ts`의 기존 인터페이스 확인 후 확장 설계

#### 3. 아키텍처 패턴 준수
- 이 프로젝트는 **App.tsx 중앙 상태 관리** 패턴 사용
- 새 데이터 타입 추가 시: `types.ts` 인터페이스 → `App.tsx` useState → props 전달 → 컴포넌트 수신
- props가 많아질 때: 한 번에 모든 props를 추가하고 연결 (빠뜨리면 다시 돌아와야 함)

#### 4. 한 번에 완성도 높게 구현
- ❌ **금지**: "일단 기본 틀만 만들고" → 사용자 피드백 → 재수정 반복
- ✅ **필수**: 모바일 반응형, 에러 처리, 빈 상태 UI까지 **첫 구현에 포함**
- ✅ **필수**: CRUD 기능이면 Create/Read/Update/Delete **모두 한 번에** 구현
- ✅ **필수**: 테이블이면 정렬, 빈 상태 메시지, 합계 행까지 한 번에

#### 5. 수정 범위 최소화
- ❌ **금지**: 요청받지 않은 리팩토링, 코드 정리, 주석 추가
- ❌ **금지**: 동작하는 코드의 포맷/스타일만 변경 (whitespace, 줄바꿈 정리 등)
- ❌ **금지**: 사용자가 명시적으로 지정하지 않은 코드/섹션의 삭제 또는 수정 (예: "A, B 삭제해" 요청 시 A, B**만** 삭제하고 C는 절대 건드리지 않음)
- ✅ **필수**: 요청된 기능 변경에 **직접 필요한 부분만** 수정
- ✅ **필수**: 삭제/수정 요청 시 명시된 대상**만** 정확히 처리, 연관되어 보이더라도 언급되지 않은 항목은 그대로 유지

#### 6. 대규모 변경 시 계획 먼저
- 3개 이상 파일 수정이 예상되면 **변경 계획을 먼저 설명**
- types.ts → App.tsx → Component.tsx 순서로 **의존성 순서대로** 작업
- 중간에 빌드 에러 나지 않도록 **일관된 변경** 보장

### 실제 발생했던 토큰 낭비 사례들

**사례 1: 요구사항 불완전 파악**
- 문제: 승강기 관리 기능 요청 시 "기본 정보만" 구현 → 사용자가 "검사이력, 보험, 사고이력도" 추가 요청 → 재작업
- 교훈: 도메인 기능은 **관련 하위 기능 전체**를 먼저 파악하고 한 번에 구현

**사례 2: 기존 코드 미확인**
- 문제: FacilityManager props 구조를 확인 안 하고 수정 → 타입 에러 → 재수정
- 교훈: 수정 전 **반드시 현재 인터페이스와 props 확인**

**사례 3: 부분 구현 후 반복 추가**
- 문제: 층별 테이블에 전용면적 컬럼만 추가 → "전용률도요" → "보증금/월차임/관리비도요" → 3번 수정
- 교훈: 테이블 컬럼 추가 시 **관련 필드 전부** 한 번에 추가

**사례 4: UI 수정 반복 (CSS vs HTML 구조)**
- 문제: 정렬 안 맞는 걸 CSS만 계속 수정 → 원인은 HTML 이중 래핑 → 구조 수정 후 해결
- 교훈: UI 버그는 **HTML 구조 → CSS 순서로** 디버깅 (위의 체크리스트 참조)

**사례 5: 명시되지 않은 항목까지 삭제/수정**
- 문제: "고장이력, 사고이력 삭제해" 요청 시 자체점검 이력 섹션 번호까지 변경
- 교훈: 사용자가 **명시적으로 지정한 항목만** 삭제/수정, 언급되지 않은 항목은 절대 건드리지 않음

**사례 6: API 참고 문서 무시하고 웹 검색**
- 문제: 사용자가 이미 제공한 참고 문서(`참고.txt`) 대신 웹에서 오래된 API 문서 검색 → 잘못된 URL 구조 사용
- 교훈: 사용자가 제공한 **로컬 참고 문서를 최우선** 참조, 웹 검색은 문서에 정보가 없을 때만

**사례 7: 조건 분기 순서 오류 (조건부 합격)**
- 문제: `includes('합격')`이 "조건부 합격"에도 매칭되어 합격으로 처리됨
- 교훈: 문자열 포함 판별 시 **구체적인 조건(불합격, 조건부)을 먼저 체크**하고 일반적인 조건(합격)은 마지막에

## 코드 컨벤션

- 한국어 로케일 포맷: `toLocaleString('ko-KR')`
- 숫자 포맷: 3자리마다 콤마, 소수점 있으면 1자리 표시
- 화폐 단위: 원(소수점 없음), 만원(소수점 없음), 억원(소수점 2자리)
- 면적 단위: ㎡(소수점 1자리), 평(소수점 1자리, ㎡ × 0.3025)
- 모든 스타일링은 Tailwind 클래스 사용

### 직관적인 UI 작명 규칙

**버튼 및 기능 명칭은 최대한 간결하고 직관적으로 작성**

- ✅ **권장**: "저장", "삭제", "추가", "수정", "인쇄", "다운로드", "업로드"
- ❌ **금지**: "A4 출력", "CSV 내보내기", "엑셀 다운로드", "PDF 저장" 등 구체적 기술 용어 포함
- **원칙**: 사용자가 즉시 이해할 수 있는 일상 용어 사용
- **예외**: 전문 용어가 업계 표준인 경우만 허용 (예: 부동산 용어)

### UI 버그 디버깅 체크리스트

**UI 정렬/스타일 문제 발생 시 반드시 순서대로 확인**

1. ✅ **HTML 구조 먼저 확인**
   - JSX 이중 래핑 여부: `<span>{함수가_이미_span_반환()}</span>` ← 금지
   - 불필요한 래퍼 요소 확인
   - 실제 렌더링되는 코드 직접 확인 (정의부 아님!)

2. ✅ **CSS 클래스 적용 확인**
   - 브라우저 개발자 도구에서 실제 적용된 클래스 확인
   - 공통 클래스(예: `badgeBase`) 사용 시 모든 사용처에서 동일하게 적용되는지 확인
   - `inline-flex`는 `vertical-align` 영향을 받음 → `align-middle` 추가 필요

3. ✅ **스타일 속성 조정**
   - HTML 구조 문제가 아닌 경우에만 CSS 수정
   - 높이 정렬: `h-5` (고정) + `items-center justify-center`
   - 라인 높이: `leading-none` 또는 정확한 픽셀 값

**금지 사항**:
- ❌ HTML 구조 확인 없이 CSS만 계속 수정
- ❌ 스타일 정의부만 보고 실제 사용처 미확인
- ❌ 브라우저 개발자 도구 확인 없이 추측으로 수정

**실제 사례** (2025-02-09):
- 문제: 태그 버튼 세로 정렬 안 맞음
- 원인: `{roles.map(r => <span>{getRoleBadge(r)}</span>)}` 이중 래핑
- 해결: `{roles.map(r => getRoleBadge(r, r))}` 직접 사용
- 교훈: CSS 수정 전 **HTML 구조부터 확인**

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

### 2026-02-23: 인물/업체 관리 대폭 개선 (OCR/라벨/서류/CSV/필터)

#### OCR 인식률 개선 (StakeholderManager.tsx)
- **normalizeLine 강화**: 전각→반각 변환(`（→(`, `）→)`, `：→:`), 괄호 앞뒤 공백 제거(`\s+\(→(`)
- **findValue 유연 매칭**: 1차 exact match 실패 시 2차 flexible regex (`\s*` 조인) fallback
- **PDF/이미지 분리 처리**: PDF는 fullText 직접 사용(바운딩박스 재구성 안 함), 이미지만 바운딩박스 기반 라인 재구성
- **한글 공백 제거**: 이미지 전용(`!isPdf` 조건), PDF의 정돈된 텍스트는 보존
- **cleanOcrNoise 개선**: `[A-Z]{2,}` 워터마크 제거(경계 없음), `nts.go.kr` URL 노이즈 제거, dedup 함수 적용
- **업태/종목 중복제거**: OCR 추출 + UI 양쪽에서 자동 dedup

#### 통장사본 OCR (StakeholderManager.tsx)
- **runBankbookOcr**: Google Vision 바운딩박스 Y좌표 기반 라인 재구성
- **추출 순서**: 계좌번호(숫자-하이픈 패턴) → 예금주(계좌번호 위 라인 전체) → 은행명(퍼지 매칭)
- **KOREAN_BANKS 상수**: 24개 한국 은행명 리스트
- **matchBankName**: 정확 매칭 + 영문 별칭(KB→국민, NH→농협, IBK→기업 등) 퍼지 매칭
- **은행명 UI**: input → select 드롭다운 (KOREAN_BANKS 목록)
- **예금주 추출 개선**: `[가-힣]{2,5}` 고정길이 → 계좌번호 위 전체 라인 (법인명 대응)

#### 업태/종목 뱃지 UI (StakeholderManager.tsx)
- 텍스트 입력 → 뱃지/태그 형태 UI 변경
- 콤마 구분 값을 개별 뱃지로 표시 (업태: 파랑, 종목: 보라)
- X 버튼으로 개별 삭제, Enter/콤마로 추가
- 자동 중복 제거: `.filter((v, i, a) => a.indexOf(v) === i)`

#### 우편라벨 인쇄 개선 (StakeholderManager.tsx)
- A4 세로, 라벨 95×67mm (2열×4행=페이지당 8개)
- "귀중" 삭제, 전화번호 삭제
- 이름 폰트 길이별 축소 (8자↓18pt, 12자↓16pt, 18자↓14pt, 25자↓12pt)
- 주소 미등록 경고: confirm으로 제외 대상 안내

#### 서류이력 관리 (StakeholderManager.tsx + types.ts)
- **StakeholderDocument 인터페이스**: id, type(BUSINESS_LICENSE/BANKBOOK/OTHER), fileName, fileData, uploadedAt, note
- **이력 모달 탭 확장**: 계약이력 + 서류이력 2탭
- **서류 업로드**: 구분 선택 + 파일 업로드 → documents 배열에 자동 추가
- **서류 열람**: 행 클릭 → 새 창에서 원본 열람 (이미지/PDF)
- **자동 문서 이력**: 사업자등록증/통장사본 저장 시 documents에 자동 추가

#### CSV 입출력 (StakeholderManager.tsx)
- **CSV 다운로드**: UTF-8 BOM 포함, 16개 컬럼, 필터 기준 내보내기
- **CSV 업로드 개선**: BOM 처리, 따옴표 내 콤마 처리, 한글/영어 헤더 자동 매핑
- **UI**: 단일 "CSV" 버튼 → "업로드" + "다운로드" 2개 버튼 분리

#### 필터/정렬/그룹핑 (StakeholderManager.tsx)
- **정렬**: 기본/이름순(오름차순·내림차순)/유형별/역할별/수동정렬 6가지
- **그룹핑**: 없음/유형별/역할별 3가지, 그룹 헤더(라벨+건수+구분선)
- **수동정렬**: HTML5 드래그앤드롭, GripVertical 핸들, sortOrder 저장
- **통합 필터바**: 기존 3줄(역할탭+자산필터+정렬그룹) → 1줄 통합 UI
- **자산 필터 버그 수정**: 소유권만 체크 → 임대차계약+용역계약 관계까지 포함

#### types.ts 확장
- `StakeholderDocument` 인터페이스 신규
- Stakeholder에 추가: `bankbookBase64?`, `documents?`, `sortOrder?`, `primaryAddressType?`, `headOfficeAddress?`, `headOfficePostalCode?`, `headOfficeAddressDetail?`, `businessSector?`, `businessType?`

#### vite.config.ts 프록시 추가
- `/api/nts-businessman` → `api.odcloud.kr` (국세청 사업자등록 상태조회)
- `/api/vision` → `vision.googleapis.com` (Google Cloud Vision OCR)

### 2026-02-22: 로그인/사용자관리, 갤러리/로드뷰 개선, 캘린더, 우편 라벨

#### 로그인 및 사용자 관리 (LoginPage.tsx + App.tsx + types.ts)
- **초기설정 플로우**: 사용자 0명 → 회사정보 + 관리자 계정 등록 2단계 위자드
- **로그인 페이지**: 사용자명+비밀번호 입력, 비밀번호 보기/숨기기 토글, 오류 메시지
- **비밀번호 저장**: `btoa()` 인코딩 (`passwordHash`), 초기화 시 `btoa('1234')`
- **세션 유지**: `localStorage.rf_currentUserId` 저장, 새로고침 후 자동 복원
- **로그아웃**: 헤더 우상단 버튼, `localStorage.rf_currentUserId` 삭제
- **설정 모달 탭 확장**: API 설정 / 기본 정보(회사) / 사용자 관리 3탭
  - 사용자 추가/수정/활성화비활성화/비밀번호초기화
  - 회사정보: 이름, 사업자번호, 대표자, 연락처, 이메일, 홈페이지, 로고
- **types.ts 추가**: `AppUser`, `CompanyInfo`, `UserRole` ('ADMIN'|'MANAGER'|'VIEWER') 인터페이스
- **localStorage 키**: `rf_users`, `rf_companyInfo`, `rf_currentUserId`
- **아바타 색상**: 6가지 색상 순환 자동 배정 (`AVATAR_COLORS`)

#### 대시보드 이벤트 캘린더 (Dashboard.tsx)
- `EventCalendarWidget` 컴포넌트 신규 추가
- 이벤트 카테고리: 계약만료, 납부일, 유지보수, 공과금 (색상 구분)
- 월별 달력 뷰 + 이전/다음 월 이동
- 필터 토글: 카테고리별 on/off
- 날짜 클릭 → 해당일 이벤트 목록 표시

#### 로드뷰 스크린샷 개선 (PropertyManager.tsx)
- **getDisplayMedia 방식**: WebGL/CORS 우회 → 브라우저 화면 공유 API 사용
- **영역 지정 크롭 UI**: 캡처 후 사각형 드래그 → 마우스 업 즉시 저장 (별도 저장 버튼 없음)
  - portal 기반 전체화면 overlay, 선택 영역 외 반투명 어둠, 크기 실시간 표시
- **클립보드 동시 복사**: `navigator.clipboard.write([new ClipboardItem({...})])`
- **buildLocationCard 제거**: 위치 카드 fallback 및 captureStream 코드 전체 삭제
- **isCapturing 상태**: 캡처 중 미니맵/라벨/버튼 visibility:hidden (DOM 유지)

#### 대표 사진 + 갤러리 모달 개편 (PropertyManager.tsx + types.ts)
- `PropertyPhoto.isMain?: boolean` 필드 추가
- **개요 화면**: 대표 사진 있으면 `<img>` 표시, 없으면 로드뷰 (미니맵 없음)
- **갤러리 모달 구조 개편**:
  - 메인 뷰: 로드뷰 ↔ 저장된 사진 전환 (visibility 방식, 로드뷰 재초기화 없음)
  - 하단 썸네일 스트립: `120×80px` (이전 96×64px), 로드뷰 썸네일 + 사진 썸네일
  - 썸네일 클릭 → 메인 뷰 전환, 현재 선택 하단 컬러 바 표시
  - 사진 뷰에서 "대표로 설정" 버튼 직접 노출
  - 사진 없을 때 안내 문구 표시
- `handleSetMainPhoto`: 클릭된 사진만 `isMain:true`, 나머지 `false`
- `galleryViewPhotoId` state: null=로드뷰, photoId=해당 사진

#### KakaoRoadview 미니맵 prop 분리 (PropertyManager.tsx)
- `showMinimap?: boolean` prop 추가 (기본값 true)
- 개요 화면 소형 뷰: `showMinimap={false}` — 미니맵 없이 로드뷰만
- 갤러리 전체화면: 기본값 true → 미니맵 표시
- `visibility` CSS로 숨김 처리 (Kakao SDK ref DOM 유지)

#### 위치지도 뷰 토글 (PropertyManager.tsx)
- `KakaoMapPin` 컴포넌트에 `MapViewType` 상태 추가
- 우상단 토글 버튼: **일반** / **위성** / **지적도**
- 일반: `kakao.maps.MapTypeId.ROADMAP`
- 위성: `kakao.maps.MapTypeId.HYBRID` (위성사진 + 도로명 레이블)
- 지적도: ROADMAP + `addOverlayMapTypeId(USE_DISTRICT)` (필지 경계선 오버레이)

#### 개요 사진/지도 반응형 높이 (PropertyManager.tsx)
- 기존 고정 `h-[200px] md:h-[240px]` → 뷰포트 기반 반응형
- 모바일(< 768px, grid-cols-1 세로배치): `h-[44vw]`
- 태블릿(md): `h-[28vh]` 최대 352px
- 데스크탑(lg): `h-[30vh]` 최대 352px

#### 인물/업체 우편 라벨 인쇄 (StakeholderManager.tsx)
- 체크박스로 복수 선택 후 "라벨 인쇄" 버튼
- A4 용지 기준 우편번호 박스 + 주소 + 수신인명 레이아웃
- 우편번호 5자리 개별 박스 렌더링 (인쇄용 HTML 생성)
- `window.open` 새 창에서 자동 인쇄 후 닫기

### 2026-02-20: 평면도 뷰어 4가지 대폭 개선 (툴바/조각/레이어/실행취소)

**도구바 레이아웃 개편 (FloorPlanViewer.tsx)**:
- 기존 왼쪽 세로 사이드바(`w-14`) → **상단 가로 툴바**로 전면 변경
- FHD 100% 기준 모든 도구가 한 줄에 표시 (아이콘 16px, `p-1.5`)
- 도구 그룹: 선택/이동 | 그리기(다각형/사각형/삼각형/점편집) | 실행취소/다시실행 | 줌(축소/퍼센트/확대/맞춤) | 표시토글 | 자동감지
- 그룹 간 세로 구분선(`w-px h-5 bg-[#dadce0]`)으로 시각적 분리
- 줌 퍼센트를 툴바 중앙에 텍스트로 표시 (기존 캔버스 좌하단 오버레이 제거)

**다각형 불리언 연산 polygon-clipping 라이브러리 교체**:
- 기존 수제 알고리즘(Sutherland-Hodgman, 각도정렬) → **polygon-clipping 0.15.7** NPM 패키지
- `isPointInPolygon`, `getLineIntersection`, `isLeftOfLine`, `computePolygonIntersection`, `computePolygonSubtract`, `computePolygonUnion` 함수 모두 삭제
- `toClipPoly()`: ZonePoint[] → polygon-clipping 포맷 변환 (닫힌 링 보장)
- `fromClipResult()`: polygon-clipping 결과 → ZonePoint[][] 변환 (MultiPolygon 지원)
- `createZoneFromPoints()`: 결과 FloorZone 생성 헬퍼
- 합집합: `polygonClipping.union()`, 교집합: `polygonClipping.intersection()`, 빼기: `polygonClipping.difference()`
- MultiPolygon 결과 시 각 조각을 별도 zone으로 생성
- Convex Hull(외곽선)과 점 유지는 기존 로직 유지

**조각내기(Fragment) 기능 추가 (FloorPlanViewer.tsx)**:
- PPT 도형 병합의 "조각" 연산 구현
- 2개 선택: A-B(나머지) + A∩B(교차영역) + B-A(나머지) = 최대 3조각
- 3개+ 선택: 각 zone의 고유 영역(difference) + 쌍별 교차 영역(intersection)
- 영역 연산 UI 하단에 갈색 "조각" 버튼 추가 (3×3 그리드)
- 겹치지 않는 영역은 alert로 안내

**레이어 드래그 순서 변경 (FloorPlanViewer.tsx)**:
- `zoneOrder` state: zone ID 배열로 레이어 순서 관리
- `currentZoneIds` 기반 useEffect로 zone 추가/삭제 시 자동 동기화
- HTML5 드래그앤드롭: `handleLayerDragStart/DragOver/Drop/DragEnd`
- 목록 상단 = 최상위 레이어 (캔버스에서 맨 앞), 하단 = 최하위
- 캔버스 렌더링: `[...orderedZones].reverse()` (목록 역순으로 렌더 → 상단 레이어가 마지막에 그려짐)
- `GripVertical` 아이콘 드래그 핸들 추가, `dragOverIdx`로 드롭 위치 시각적 표시
- 목록 헤더: "조닝 목록" → "레이어", 힌트: "드래그로 순서 변경"

**실행취소/다시실행 ref 기반 재구현 (FloorPlanViewer.tsx)**:
- 기존: `useState` 기반 → redo 시 같은 상태 복원되는 버그 (수정 후 상태가 히스토리에 저장 안 됨)
- 변경: `zoneHistoryRef`/`historyIndexRef` **ref 기반** + `useEffect` 자동 히스토리 저장
- `useEffect`로 `floorZones` 변경 감지 → 자동으로 히스토리에 새 상태 저장 (undo/redo 중에는 건너뜀)
- `currentZonesRef`로 stale closure 방지 → `handleUndo`/`handleRedo`의 deps 최소화
- `requestAnimationFrame` 이중 호출로 React 배치 업데이트 완료 후 `isUndoRedoRef` 플래그 해제
- `saveZoneWithHistory`/`deleteZoneWithHistory` 래퍼 함수 제거 → 직접 `onSaveZone`/`onDeleteZone` 호출
- `saveToHistory()` 수동 호출 제거 (useEffect가 자동 처리)
- `canUndo`/`canRedo` derived 값으로 버튼 disabled 상태 관리

**이전 세션 수정 사항 (컨텍스트 압축 전)**:
- 이미지 업로드 시 캔버스에 즉시 맞춤 (`fitImageToCanvas` DOM 직접 읽기)
- OpenCV 자동 감지 3가지 모드: threshold/canny/adaptive + 내부 공간 감지 옵션
- 점 편집 렌더링 분리: Zone Group에서 분리하여 좌표 계산 버그 수정
- `hitStrokeWidth` 18px로 점 선택 영역 확대
- 바닥 영역 별도 삭제 가능 (도면 삭제 없이)
- 임의 영역을 바닥 영역으로 지정 버튼

### 2026-02-19: 계약관리 단면도 UX 대폭 개선 (6가지 + 병합/인쇄)

**단면도 호실 블록 2줄 레이아웃 (ContractManager.tsx)**:
- 기존 3줄(호실+상태, 임차인, 금액) → **2줄(호실+임차인+상태, 금액)** 압축
- 정보 밀도 줄이고 더 많은 층을 한 화면에 표시
- 수직 패딩 축소: `py-1.5 → py-1`, `md:py-2 → md:py-1.5`

**수리중(UNDER_REPAIR) 구분 제거**:
- 단면도에서 수리중 노란색 구분 삭제 → 공실과 동일 표시
- LEGEND 4개 → 3개 (임대중/공실/미등록)
- types.ts의 Unit.status는 유지 (다른 컴포넌트 사용)

**단면도 필터 기능 (ContractManager.tsx)**:
- `diagramFilters` state: floorFrom, floorTo, statuses[], tenantSearch, expiryMonths
- **퀵 프리셋**: 지상/지하/공실 원클릭 필터
- **확장 패널**: 층 범위, 상태 토글(임대중/공실/만료), 임차인 검색, 만료 임박(1/3/6/12개월)
- **입주율 바**: 필터 결과 기반 가로 진행률 표시
- 비매칭 호실 `opacity-20 pointer-events-none`으로 dim 처리 (숨기지 않고 흐리게)
- `filteredFloorNumbers`: floorFrom/floorTo 적용된 층 목록
- 물건/건물 전환 시 필터 자동 초기화

**층별 합계 푸터**:
- 스크롤 영역 아래 고정 합계 행: `border-t-2 border-[#1a73e8] bg-[#e8f0fe]`
- 표시 항목: 면적, 임차인 수, 보증금, 월차임(/월), 관리비(/월)
- 호실+층+건물 계약 모두 포함, 계약 ID 기준 중복 방지 (Set)
- 필터 적용 시 필터된 결과만 합산
- 면적은 `formatArea` prop으로 글로벌 단위 변환(㎡/평) 적용

**금액 단위 천원/백만원 추가 (App.tsx)**:
- `formatMoney`에 THOUSAND(÷1000, '천원') / MILLION(÷1000000, '백만원') 분기 추가
- 금액 단위 선택 버튼 3개→5개: 원/천원/만원/백만원/억원
- MoneyUnit 타입은 types.ts에 이미 정의되어 있었음 (THOUSAND/MILLION)

**단면도 금액 표시 만원 고정**:
- `diagramMoney()` 헬퍼: 글로벌 설정과 무관하게 항상 만원 단위 표시
- renderUnitBlock, 층별 계약, 미지정 구역, 건물 계약, 합계 푸터 모두 적용

**다중선택 후 계약 삭제 (ContractManager.tsx)**:
- `onDeleteLease` prop 추가 (App.tsx에서 `setLeaseContracts` 필터)
- `handleDeleteFromSelection()`: selectedZoneIds 매칭 계약 수집, 중복 제거, confirm 후 삭제
- 플로팅 액션바에 빨간색 "삭제" 버튼 (계약 있는 구역 선택 시만)

**계약 병합 기능 (ContractManager.tsx)**:
- `handleMergeFromSelection()`: 선택된 구역의 계약 수집
  - 단일 계약 + 공실 → 자동 병합 (confirm)
  - 복수 계약 → 모달에서 기준 계약 선택
- `executeMerge(baseContract, allZoneIds)`: 다른 계약 삭제, 기준 계약에 targetIds 통합
- 플로팅 액션바에 초록색 "병합" 버튼 (Merge 아이콘, 2개+ 구역 선택 시)

**A4 인쇄 기능 (ContractManager.tsx)**:
- `id="floor-diagram-rows"` DOM 클로닝 방식
- 선택 오버레이, 체크마크, 버튼 등 웹 UI 요소 제거
- `print-color-adjust: exact` + `-webkit-print-color-adjust: exact` 컬러 인쇄
- Tailwind 클래스 → 순수 CSS 매핑 (CDN 의존 없음)
- 층 수 기반 자동 행 높이 계산 (26~40px, 20층 → ~35px)
- 헤더: 물건명·건물명, 날짜, "금액단위: 만원"
- 범례 + 층별 행 + 합계 푸터 포함

**단면도 높이 확대**:
- `calc(100vh - 380px)` → `calc(100vh - 260px)`: ~10개 층 표시 가능

### 2026-02-12: 계약관리 레이아웃 개편, 시설카테고리 확장, 더미데이터 분리

**계약관리 레이아웃 리디자인 (ContractManager.tsx)**:
- 기존 전체 너비 테이블 → **왼쪽 물건목록 사이드바 + 오른쪽 카드 그리드** 구조로 전환
- PropertyManager/FacilityManager와 동일한 `lg:w-72` 사이드바 패턴 적용
- 사이드바 헤더에 `Layers` 아이콘 통일
- 물건별 계약 건수 표시
- 계약 유형 탭 확장: 기존 3탭(임대차/유지보수/공과금) → **6탭(임대차/전대차/용역계약/도급계약/보험계약/보증보험)**
- 임대차/전대차 구분: LeaseContract.type (LEASE_OUT/IN vs SUBLEASE_OUT/IN)으로 필터링
- 용역계약: 기존 MaintenanceContract 연동
- 도급계약/보험계약/보증보험: 탭 배치 (데이터 미구현 상태)
- 카드형 UI: 호실, 임차인/업체, 기간, 보증금/임대료, 상태 뱃지 표시
- 등록 모달: 탭별(임대차/전대차/용역) 폼 분기, 선택된 물건 기준 호실 필터링

**시설관리 카테고리 확장 (FacilityManager.tsx + types.ts)**:
- FacilityCategory에 `SECURITY`(보안설비) 추가, `FACTORY`/`CCTV` 제거
- `CATEGORY_SPEC_FIELDS` 설정 객체 추가: 카테고리별 상세 필드 동적 렌더링
  - 소방설비: 소화기수량, 스프링클러, 경보설비, 피난설비
  - 전기설비: 수전용량, 변압기용량, 수전방식, 설치년도
  - 가스시설: 가스종류, 사용시설용량, 배관길이, 계량기위치
  - 보일러: 종류, 용량, 제조사, 설치년도
  - 정화조: 처리방식, 처리용량, 대상인원, 설치년도
  - 보안설비: 카메라종류, 저장장치종류, 채널수, 저장용량
  - 냉난방: 냉방방식, 난방방식, 냉방용량, 난방용량
  - 급배수: 급수방식, 배수방식, 수조용량, 펌프용량
- spec 데이터는 Facility.spec (Record<string, any>)에 저장
- 사이드바 아이콘 `Wrench` → `Layers` 통일

**더미데이터 분리 (dummyData.ts 신규 파일)**:
- App.tsx 인라인 더미데이터 → `dummyData.ts` 별도 파일로 분리
- 3개 물건(강남 시그니처 센터, 서초 메디컬 센터, 마포 역세권 상가) 기준 종합 데이터
- 13명 인물/업체, 17개 호실, 7개 임대차계약, 5개 용역계약, 3개 공과금계약
- 14개 시설(카테고리별 spec 데이터 포함), 8개 시설로그, 13개 감정, 17개 거래
- Export: INIT_STAKEHOLDERS, INIT_PROPERTIES, INIT_UNITS, INIT_LEASE_CONTRACTS 등 11개 상수

**App.tsx 정리**:
- 더미데이터 import 방식으로 전환 (인라인 → dummyData.ts import)
- utilityContracts, facilityLogs 초기 데이터 연결 (기존 빈 배열 → 더미데이터)
- ContractManager props에서 불필요한 formatMoneyInput/parseMoneyInput/moneyLabel 제거

**UI 한국어화 원칙 강화**:
- 모든 select 옵션에서 영어 제거: LPG→액화석유가스(LPG), CCTV→폐쇄회로TV, DVR→디지털(DVR), NVR→네트워크(NVR)
- 용어 통일: "이해관계자" → "인물/업체" (실무 용어)
- 학술/법률 조어 사용 금지 (예: "법정시설" 등 일반적이지 않은 합성어)

### 2026-02-10: 시설관리 레이아웃 개편, 자산 삭제/재조회, 모달 UX 개선

**시설관리 레이아웃 PropertyManager 패턴 적용 (FacilityManager.tsx)**:
- 기존 카드 그리드 전체 나열 → **왼쪽 물건목록 + 오른쪽 카테고리 탭** 구조로 전환
- 왼쪽 패널: `lg:w-72` 물건 목록 사이드바 (선택 시 파란색 강조)
- 오른쪽 패널: 물건명/주소 헤더 + 설비등록 버튼 + 카테고리 탭 + 필터링된 카드 그리드
- 카테고리 탭: "전체" + 해당 물건에 존재하는 카테고리만 동적 표시 (건수 포함)
- `selectedPropId` setter 추가, `activeCategoryTab` state 추가
- 필터링: `facilities.filter(f => f.propertyId && f.category)` 이중 필터
- 기존 모달/핸들러/API 로직 100% 유지

**자산관리 물건 삭제 + 소재지 변경 시 재조회 (PropertyManager.tsx + App.tsx)**:
- `onDeleteProperty` prop 추가: App.tsx에서 `setProperties(prev => prev.filter(...))`
- `handleDeleteProperty`: confirm 확인 후 삭제, 다른 물건으로 자동 선택
- 헤더에 수정 버튼 옆 삭제 버튼 추가 (빨간색 테두리)
- 물건 수정 시 PNU 변경 감지 → confirm으로 토지/건물 재조회 여부 확인
- 동의 시 `registerAllBuildings()`로 건축물대장 API 재조회 후 기존 토지/건물 대체

**모달 스크롤 페이드 효과 (글로벌 적용)**:
- 모달 구조 변경: 외부 `overflow-hidden relative` + 내부 `overflow-y-auto` 분리
- `absolute` 그라데이션 오버레이로 상하 흰색 페이드 (h-6, from-white to-transparent)
- 스크롤바가 rounded 코너 안쪽에서 자동 클리핑
- 적용 파일: FacilityManager, PropertyManager, ContractManager, StakeholderManager (모든 모달)

### 2026-02-10: 자체점검 보고서 및 시설관리 UX 대폭 개선

**자체점검 세부 보고서 기능 (FacilityManager.tsx)**:
- 자체점검 이력 12개월 개략 테이블: API 실조회(`numOfRows=200`) 결과 기반 양호/지적 판별
- 지적 판단: 전체 항목 중 `selChkResult`가 B(주의관찰) 또는 C(긴급수리) → "지적" 표시
- 행 클릭 시 `fetchSelfCheckDetail` 호출 → A4 형식 세부 보고서 모달
- 보고서 컬럼: 점검항목(`titNo`), 점검내용(`selChkItemDtlNm`), 점검결과 직전/당월
- 직전결과: 전월 API 병렬 조회 후 `selChkItemDtlNm` 기준 매핑
- 결과코드 변환: A→A, B→B, C→C, D/E→제외
- 점검일시: `selChkStDt`~`selChkEnDt` 시간 포함 표시
- 점검자: `selchkUsnm` + `subSelchkUsnm` (주/보조)
- A4 페이지네이션(25/35행) + 인쇄 기능
- 개략 테이블 4건 단위 페이지네이션

**XML 필드 매핑 (getSelfCheckList API)**:
- `titNo` → 점검항목번호 (1.1.1.1 등)
- `selChkItemNm` → 점검항목명
- `selChkItemDtlNm` → 점검내용
- `selChkResult` → 당월 점검결과 (A/B/C/D/E)
- `selChkStDt`/`selChkEnDt` → 점검시작/종료시간 (HHmm)
- `subSelchkUsnm` → 보조점검자

**시설관리 UX 개선 (FacilityManager.tsx)**:
- **카드 클릭 → 조회 전용 모달**: `isViewMode` 상태로 input 비활성, 저장 버튼 숨김
  - 모달 상단 "수정" 버튼으로 편집 모드 전환 가능
  - CSS 선택자(`[&_input]`) 기반 일괄 비활성화
- **카드 UI 버그 수정**: `min-w-0 flex-1` + `flex-shrink-0` → 설비명칭 오버플로우/태그 밀림 해결
- **수정 버튼 제거**: 카드에서 Edit2 아이콘 버튼 삭제, 카드 전체가 클릭 영역
- **이력 모달 탭 기반 개선**: 승강기 → "자체점검 이력" | "검사이력" | "점검 기록" 3탭
  - 이력 버튼 클릭 시 API 자동 재조회 (`fetchElevatorFullData`)
  - 자체점검 이력 탭에서 행 클릭 → 세부 보고서 모달
- **API 자동 재조회**: 카드 클릭(조회)/이력 버튼 클릭 시 승강기번호 있으면 최신 데이터 자동 갱신
- **유지관리 계약현황**: 계약관리(ContractManager) 연동 → 업체명, 계약기간, 계약서보기 버튼
- **검사이력 PAGE_SIZE**: 10 → 6 변경

### 2026-02-09: 승강기 API 자동조회 연동 및 시설관리 고도화

**승강기 API 자동조회 기능 (FacilityManager.tsx)**:
- 승강기번호 7자리 입력 → "조회" 버튼 클릭 시 4개 API 병렬 호출
- XML 응답 파싱 및 자동입력 (기본정보, 안전관리자, 검사이력, 자체점검)
- Vite 프록시 추가: `/api/elevator` → `https://apis.data.go.kr/B553664`
- App.tsx에서 `apiKey` prop 전달
- 검사결과 판별: 불합격 → 조건부 합격(노란색) → 합격(초록색) → 보류(회색)
- 검사이력 최신순 정렬 + 10건 단위 페이지네이션
- 고장이력/사고이력 섹션 제거 (불필요)
- UI 5개 섹션 구성: ① 승강기 정보 ② 안전관리자 ③ 검사이력 ④ 자체점검 ⑤ 유지관리 계약

**승강기 관리 전용 기능 추가 (FacilityManager.tsx)**:
- 승강기 상세정보 인터페이스 추가 (ElevatorInfo): 제조사, 모델, 적재하중, 정원, 운행구간 등
- 5개 승강기 관련 하위 데이터 관리:
  - **보험정보** (ElevatorInsurance): 보험사, 상품명, 기간
  - **안전관리자** (ElevatorSafetyManager): 관리자명, 임명일, 교육이수
  - **검사이력** (ElevatorInspection): 검사종류, 일자, 결과(합격/조건부합격/불합격)
  - **자재결함** (ElevatorPartDefect): 점검년도, 결함명, 관리
  - **유지관리계약** (ElevatorMaintenanceContract): 업체, 계약번호
- FacilityManager 탭 기반 UI로 전환 (기본정보 / 승강기 상세)
- App.tsx에 7개 상태 + 14개 콜백(추가/삭제) props 연결

**층별정보 테이블 확장 (PropertyManager.tsx)**:
- FloorDetail에 `deposit`, `monthlyRent`, `maintenanceFee` 필드 추가
- 건물 등록 모달 층별 테이블 확장: 전용면적, 전용률, 보증금, 월차임, 관리비 편집 가능
- 전용면적 ↔ 전용률 자동 연동 계산
- 건물 상세 층별 테이블에 전용면적/전용률 컬럼 조건부 표시 (데이터 있을 때만)

**types.ts 확장**:
- `FloorDetail`: deposit, monthlyRent, maintenanceFee 추가
- 승강기 관련 8개 인터페이스 신규 추가

### 2025-02-09: 조직도 UI 개선 및 전용 모달 추가

**조직도 레이아웃 대폭 개선**:
- **CSS Grid 레이아웃 적용**: 하위 부서를 Grid로 배치하여 정확한 정렬 보장
- **연결선 픽셀 단위 계산**: 백분율 대신 절대 좌표(px)로 연결선 배치
  - 각 Grid 셀 너비: 110px
  - 부서 박스 최소 너비: 80px
  - 연결선 계산: `left: 55 + index * 110px` (각 박스 중앙)
- **이중 래핑 버그 수정**: `{roles.map(r => <span>{getRoleBadge(r)}</span>)}` → `{roles.map(r => getRoleBadge(r, r))}`
- **태그 정렬 개선**: `badgeBase` 클래스 통일 (`h-5`, `items-center`, `align-middle`)

**조직도 전용 모달 추가**:
- 인물/업체 카드에 **조직도 버튼** 추가 (GitBranch 아이콘)
- 조직도가 있는 법인/내부조직만 버튼 표시
- 별도 모달에서 조직도 확인 가능
- 수정 모달의 모든 조직도 기능 포함:
  - 줌/팬 컨트롤 (확대/축소/리셋)
  - 마우스 휠 줌, 드래그 이동
  - 인쇄 기능
  - 조직도 다이어그램 (재귀 렌더링)

**기준일자 선택 기능**:
- 상단 툴바에 기준일자 선택 추가
- 날짜 입력 + "오늘" 버튼
- 향후 기준일 기반 계산에 활용 예정

**UI/UX 개선**:
- 버튼 명칭 직관화: "A4 출력" → "인쇄"
- 직관적인 UI 작명 규칙 문서화 (CLAUDE.md)
- UI 버그 디버깅 체크리스트 추가 (HTML 구조 → CSS 순서)

**types.ts 추가**:
- `Stakeholder.contact.addressDetail` 추가
- `Stakeholder.additionalContacts` 추가 (복수 연락처)

**App.tsx 추가**:
- `referenceDate` 상태 추가 (기준일자)
- StakeholderManager에 props 추가 (`onDeleteStakeholder`, `properties`, `units`, `referenceDate`)

### 2025-02-08: 인물/업체 관리 고도화 - 조직도 및 조직장/구성원 관리

**types.ts 확장**:
- `StakeholderType`에 `SOLE_PROPRIETOR`, `INTERNAL_ORG`, `CUSTOM_GROUP` 추가
- `Department`, `RelatedPerson`, `BankAccount` 인터페이스 추가
- `Stakeholder` 인터페이스에 확장 필드 추가:
  - 조직 관련: `companyId`, `departmentId`, `isLeader`, `position`, `jobTitle`, `jobFunction`
  - 재무 관련: `bankAccounts`, `taxInvoiceAddress`
  - 관계 관련: `relatedPersons`, `memberIds`, `groupName`, `departments`
- `Building`, `Lot`, `Property`, `Unit`에 `ownerId` 필드 추가

**StakeholderManager.tsx 주요 기능**:
- **5가지 인물/업체 타입 지원**:
  - 개인 (INDIVIDUAL)
  - 개인사업자 (SOLE_PROPRIETOR)
  - 법인사업자 (CORPORATE)
  - 내부조직 (INTERNAL_ORG)
  - 임의그룹 (CUSTOM_GROUP)

- **조직도 관리 (다이어그램 시각화)**:
  - 무한 depth 계층 구조 지원 (재귀 렌더링)
  - 부서별 색상 구분 (최상위: indigo gradient, 하위: blue shades)
  - 조직장과 구성원 구분 표시:
    - **조직장**: 부서명 아래 서브타이틀 형식 (직책 + 이름)
    - **구성원**: 부서 아래 별도 섹션 (직급 + 이름)
  - 클릭 시 해당 인물 수정 모달 오픈
  - 부서 추가/수정/삭제 인라인 편집

- **필터 및 검색**:
  - 역할별 필터 (임차인, 임대인, 관리자, 업체)
  - 자산 기반 필터 (물건별 소유자 필터링)
  - 개인 타입 표시/숨김 체크박스 (기본값: 숨김)
  - 이름/연락처 실시간 검색

- **개인 정보 관리**:
  - 소속회사 및 소속부서 선택
  - 조직장 여부 체크박스
  - 직급/직책 datalist 자동완성 (수동 입력 가능)
  - 연관인물 추가/수정/삭제 (배우자, 가족, 동업자 등)

- **사업자 정보 관리**:
  - 복수 계좌정보 등록 (은행명, 계좌번호, 예금주)
  - 세금계산서 발행주소
  - 사업자등록번호/법인등록번호 관리

- **CSV 대량 등록**: 인물/업체 일괄 등록 기능

- **소유 자산 표시**: 임대인의 경우 소유 자산 목록 자동 표시 (물건/토지/건물/호실)

**UI/UX 개선**:
- 타입별 아이콘 및 색상 구분
- 모바일 반응형 디자인 적용
- 조직도 연결선 자동 생성
- 호버 시 편집/삭제 버튼 표시

**개발 패턴 참고**:
- 조직도 재귀 렌더링: `renderDepartment(dept, level)` 함수 패턴
- 필터링 로직: 역할, 검색어, 타입, 자산 소유 여부 복합 조건
- datalist를 활용한 자동완성: 선택 및 수동 입력 동시 지원

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
