# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

RealtyFlow는 React 19 + TypeScript + Vite로 구축된 AI 기반 임대 부동산 관리 대시보드입니다. Google Gemini를 연동하여 자산 분석, 법률 자문, 매물 설명 생성 기능을 제공합니다. 한국 사용자를 위해 설계되어 한국어 로케일 포맷, 화폐 단위(원, 천, 만, 억), 법률 참조(주택임대차보호법, 상가임대차보호법)를 지원합니다.

## 빌드 및 개발 명령어

```bash
npm install       # 의존성 설치
npm run dev       # 개발 서버 실행 (localhost:3000)
npm run build     # 프로덕션 빌드 (dist/)
npm run preview   # 프로덕션 빌드 미리보기
```

## 아키텍처

**상태 관리**: `App.tsx`에서 useState 훅으로 중앙 집중 관리, props로 하위 컴포넌트에 전달. 외부 상태 관리 라이브러리 미사용.

**핵심 파일**:
- `App.tsx` - 중앙 상태 관리, 더미 데이터 초기화, 탭 기반 네비게이션
- `types.ts` - 부동산 도메인 TypeScript 인터페이스 (Stakeholder, Property, Unit, Building, Lot, LeaseContract, Facility 등)

**컴포넌트** (`components/`):
- `Dashboard.tsx` - Recharts 시각화가 포함된 분석 위젯
- `PropertyManager.tsx` - 자산, 건물, 호실, 필지 CRUD
- `ContractManager.tsx` - 임대차 계약 생명주기 관리
- `FacilityManager.tsx` - 시설 인벤토리 및 유지보수 추적
- `StakeholderManager.tsx` - 임차인/협력업체/관리자 디렉토리
- `FinanceManager.tsx` - 거래 및 수납 추적
- `ValuationManager.tsx` - 자산 감정 이력

## 기술 스택

- **React 19.2** + TypeScript 5.8
- **Vite 6.2** 빌드 도구
- **Tailwind CSS** CDN 방식 (로컬 CSS 파일 없음)
- **Recharts** 차트 (Area, Line, Pie)
- **Lucide React** 아이콘

## 코드 컨벤션

- 한국어 로케일 포맷: 숫자/날짜에 `toLocaleString('ko-KR')` 사용
- 화폐 단위: `MoneyUnit` enum (WON, THOUSAND, MAN, MILLION, EOK)
- 면적 단위: `AreaUnit` enum (M2, PYEONG)
- 모든 스타일링은 Tailwind 클래스 사용 - 별도 CSS 파일 없음

## 참고 사항

- **백엔드 미연동** - 모든 데이터는 클라이언트 사이드, 새로고침 시 초기화
- **테스트/린팅 미설정** - 프로젝트 확장 시 추가 권장
