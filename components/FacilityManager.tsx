
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Facility, FacilityLog, Property, Stakeholder, FacilityCategory, FacilityStatus, MaintenanceContract, Unit,
  ElevatorInfo, ElevatorInsurance, ElevatorSafetyManager, ElevatorInspection,
  ElevatorMalfunction, ElevatorAccident, ElevatorPartDefect, ElevatorMaintenanceContract, Building
} from '../types';
import { Wrench, Plus, AlertCircle, CheckCircle, X, History, Edit2, MapPin, ShieldAlert, Calendar, ClipboardCheck, DollarSign, Zap, Search, Loader2, ChevronLeft, ChevronRight, Printer, Layers, RefreshCw, LayoutGrid, ArrowUpDown, TrendingUp, Flame, Thermometer, Wind, Droplets, Filter, Car, ParkingCircle, Gauge, BatteryCharging, Package, Camera, Settings } from 'lucide-react';

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl rounded-xl shadow-2xl bg-white animate-in zoom-in-95 duration-200 overflow-hidden relative">
        <div className="max-h-[90vh] overflow-y-auto">{children}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent z-10" />
      </div>
    </div>,
    document.body
  );
};

interface FacilityManagerProps {
  facilities: Facility[];
  facilityLogs: FacilityLog[];
  properties: Property[];
  units: Unit[];
  stakeholders: Stakeholder[];
  maintenanceContracts: MaintenanceContract[];
  // 승강기 관련 데이터
  elevatorInsurances: ElevatorInsurance[];
  elevatorSafetyManagers: ElevatorSafetyManager[];
  elevatorInspections: ElevatorInspection[];
  elevatorMalfunctions: ElevatorMalfunction[];
  elevatorAccidents: ElevatorAccident[];
  elevatorPartDefects: ElevatorPartDefect[];
  elevatorMaintenanceContracts: ElevatorMaintenanceContract[];
  // 승강기 관련 콜백
  onAddElevatorInsurance: (data: ElevatorInsurance) => void;
  onAddElevatorSafetyManager: (data: ElevatorSafetyManager) => void;
  onAddElevatorInspection: (data: ElevatorInspection) => void;
  onAddElevatorMalfunction: (data: ElevatorMalfunction) => void;
  onAddElevatorAccident: (data: ElevatorAccident) => void;
  onAddElevatorPartDefect: (data: ElevatorPartDefect) => void;
  onAddElevatorMaintenanceContract: (data: ElevatorMaintenanceContract) => void;
  onDeleteElevatorInsurance: (id: string) => void;
  onDeleteElevatorSafetyManager: (id: string) => void;
  onDeleteElevatorInspection: (id: string) => void;
  onDeleteElevatorMalfunction: (id: string) => void;
  onDeleteElevatorAccident: (id: string) => void;
  onDeleteElevatorPartDefect: (id: string) => void;
  onDeleteElevatorMaintenanceContract: (id: string) => void;
  // 기존 props
  onAddFacility: (fac: Facility) => void;
  onUpdateFacility: (fac: Facility) => void;
  onDeleteFacility: (id: string) => void;
  onAddLog: (log: FacilityLog) => void;
  onDeleteLog: (id: string) => void;
  formatMoney: (amount: number) => string;
  formatNumberInput: (num: number | undefined | null) => string;
  parseNumberInput: (str: string) => number;
  formatMoneyInput: (amount: number | undefined | null) => string;
  parseMoneyInput: (str: string) => number;
  moneyLabel: string;
  apiKey: string;
  referenceDate: string;
}

// ==========================================
// 승강기 API 유틸리티
// ==========================================
const getXmlValue = (doc: Document, tag: string): string => {
  const el = doc.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || '';
};

const getXmlItems = (doc: Document): Element[] => {
  return Array.from(doc.getElementsByTagName('item'));
};

const parseXmlResponse = (text: string): Document => {
  return new DOMParser().parseFromString(text, 'text/xml');
};

// 날짜 포맷 변환: "20240115" → "2024-01-15"
const formatApiDate = (raw: string): string => {
  if (!raw || raw.length < 8) return raw;
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.length === 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  return raw;
};

// 자체점검 월별 요약 데이터
interface SelfCheckMonthlySummary {
  yyyymm: string;
  companyNm: string;
  inspector: string;
  registDt: string;
  result: 'PASS' | 'FAIL' | 'PENDING';
  hasData: boolean;
}

async function fetchElevatorFullData(elevatorNo: string, apiKey: string, refDate: string) {
  const baseUrl = '/api/elevator';
  const encodedKey = encodeURIComponent(apiKey);

  // 기본 3개 API 병렬 호출
  const [viewRes, safetyRes, inspectRes] = await Promise.allSettled([
    // ① 승강기 기본정보 (단건 - pageNo/numOfRows 제외)
    fetch(`${baseUrl}/ElevatorInformationService/getElevatorViewM?serviceKey=${encodedKey}&elevator_no=${elevatorNo}`).then(r => r.text()),
    // ② 안전관리자 목록
    fetch(`${baseUrl}/ElevatorSafeMngrService/getSafeMngrList?serviceKey=${encodedKey}&elevator_no=${elevatorNo}&pageNo=1&numOfRows=99`).then(r => r.text()),
    // ③ 검사이력 조회
    fetch(`${baseUrl}/ElevatorInformationService/getElvtrInspctInqireM?serviceKey=${encodedKey}&elevator_no=${elevatorNo}&pageNo=1&numOfRows=99`).then(r => r.text()),
  ]);

  // ① 기본정보 파싱
  let elevatorInfo: Partial<ElevatorInfo> = {};
  if (viewRes.status === 'fulfilled') {
    const doc = parseXmlResponse(viewRes.value);
    const resultCode = getXmlValue(doc, 'resultCode');
    if (resultCode && resultCode !== '00') {
      throw new Error(`API 오류: ${getXmlValue(doc, 'resultMsg') || '승강기 정보를 찾을 수 없습니다.'}`);
    }
    const items = getXmlItems(doc);
    if (items.length === 0) {
      throw new Error('해당 승강기번호로 조회된 정보가 없습니다.');
    }
    const item = items[0];
    const v = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
    const parseNumFromStr = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return isNaN(n) ? undefined : n; };
    elevatorInfo = {
      elevatorNo: v('elevatorNo') || elevatorNo,
      buldNm: v('buldNm'),
      address1: v('address1'),
      address2: v('address2'),
      manufacturerName: v('manufacturerName'),
      elvtrModel: v('elvtrModel'),
      elvtrKindNm: v('elvtrKindNm'),
      elvtrDivNm: v('elvtrDivNm'),
      elvtrStts: v('elvtrStts'),
      liveLoad: parseNumFromStr(v('liveLoad')),
      ratedCap: parseNumFromStr(v('ratedCap')),
      shuttleSection: v('shuttleSection'),
      shuttleFloorCnt: Number(v('shuttleFloorCnt')) || undefined,
      divGroundFloorCnt: Number(v('divGroundFloorCnt')) || undefined,
      divUndgrndFloorCnt: Number(v('divUndgrndFloorCnt')) || undefined,
      ratedSpeed: parseNumFromStr(v('ratedSpeed')),
      lastInspctDe: formatApiDate(v('lastInspctDe')),
      applcBeDt: formatApiDate(v('applcBeDt')),
      applcEnDt: formatApiDate(v('applcEnDt')),
      frstInstallationDe: formatApiDate(v('frstInstallationDe')),
      installationDe: formatApiDate(v('installationDe')),
      partcpntNm: v('partcpntNm'),
      partcpntTelno: v('partcpntTelno'),
      mntCpnyNm: v('mntCpnyNm'),
      mntCpnyTelno: v('mntCpnyTelno'),
      subcntrCpny: v('subcntrCpny'),
      inspctInstt: v('inspctInstt'),
    };
  }

  // ② 안전관리자 파싱
  const safetyManagers: Partial<ElevatorSafetyManager>[] = [];
  if (safetyRes.status === 'fulfilled') {
    const doc = parseXmlResponse(safetyRes.value);
    getXmlItems(doc).forEach(item => {
      const v = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
      const name = v('shuttleMngrNm');
      if (name) {
        safetyManagers.push({
          managerName: name,
          appointmentDate: formatApiDate(v('appointDt')),
          educationCompletionDate: formatApiDate(v('smEduDt')),
          educationValidPeriod: v('valdStrDt') && v('valdEndDt') ? `${formatApiDate(v('valdStrDt'))} ~ ${formatApiDate(v('valdEndDt'))}` : '',
        });
      }
    });
  }

  // ③ 검사이력 파싱
  const inspections: Partial<ElevatorInspection>[] = [];
  if (inspectRes.status === 'fulfilled') {
    const doc = parseXmlResponse(inspectRes.value);
    getXmlItems(doc).forEach(item => {
      const v = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
      const dt = v('inspctDt');
      if (dt) {
        const resultRaw = v('psexamYn');
        let result: 'PASS' | 'FAIL' | 'CONDITIONAL' | 'PENDING' = 'PENDING';
        if (resultRaw.includes('불합격')) result = 'FAIL';
        else if (resultRaw.includes('조건부')) result = 'CONDITIONAL';
        else if (resultRaw.includes('합격')) result = 'PASS';
        inspections.push({
          inspectionType: v('inspctKind') || '정기검사',
          inspectionDate: formatApiDate(dt),
          suspensionPeriod: v('applcBeDt') && v('applcEnDt') ? `${formatApiDate(v('applcBeDt'))} ~ ${formatApiDate(v('applcEnDt'))}` : '',
          inspectionOrg: v('inspctInsttNm') || '',
          inspector: '',
          result,
        });
      }
    });
  }

  // ④ 자체점검 월별 요약 (yyyymm 필수 → 최근 12개월 병렬 조회)
  const rd = new Date(refDate || new Date().toISOString().split('T')[0]);
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(rd.getFullYear(), rd.getMonth() - i, 1);
    months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const selfCheckResults = await Promise.allSettled(
    months.map(ym =>
      fetch(`${baseUrl}/ElevatorSelfCheckService/getSelfCheckList?serviceKey=${encodedKey}&elevator_no=${elevatorNo}&pageNo=1&numOfRows=200&yyyymm=${ym}`)
        .then(r => r.text())
        .then(text => ({ ym, text }))
    )
  );

  const selfCheckSummaries: SelfCheckMonthlySummary[] = months.map((ym, idx) => {
    const res = selfCheckResults[idx];
    if (res.status !== 'fulfilled') return { yyyymm: ym, companyNm: '', inspector: '', registDt: '', result: 'PENDING' as const, hasData: false };

    const doc = parseXmlResponse(res.value.text);
    const items = getXmlItems(doc);
    if (items.length === 0) return { yyyymm: ym, companyNm: '', inspector: '', registDt: '', result: 'PENDING' as const, hasData: false };

    const first = items[0];
    const fv = (tag: string) => first.getElementsByTagName(tag)[0]?.textContent?.trim() || '';

    // 지적 여부 판단: B(주의관찰), C(긴급수리) 결과가 있으면 지적
    let hasIssue = false;
    items.forEach(item => {
      const v = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
      const cur = v('selChkResult');
      if (cur === 'B' || cur === 'C') hasIssue = true;
    });

    return {
      yyyymm: ym,
      companyNm: fv('companyNm') || '',
      inspector: fv('selchkUsnm') || '',
      registDt: formatApiDate(fv('registDt')),
      result: hasIssue ? 'FAIL' as const : 'PASS' as const,
      hasData: true,
    };
  });

  return { elevatorInfo, safetyManagers, inspections, selfCheckSummaries };
}

// ==========================================
// 자체점검 세부 보고서 타입 및 API
// ==========================================
interface SelfCheckItem {
  selchkNo: string;       // 점검항목번호 (1.1, 1.1.1 등)
  selchkNm: string;       // 점검항목명
  selchkContent: string;  // 점검내용
  beforeResult: string;   // 직전월 결과
  currentResult: string;  // 당월 결과
}

interface SelfCheckReportData {
  yyyymm: string;
  buldNm: string;
  address: string;
  elevatorNo: string;
  installationPlace: string;
  elvtrKindNm: string;
  elvtrModel: string;
  checkDate: string;      // 점검일자 (YYYYMMDD)
  checkStTime: string;    // 점검시작시간 (HHmm)
  checkEnTime: string;    // 점검종료시간 (HHmm)
  registDt: string;       // 전산등록일
  companyNm: string;      // 점검업체
  inspectors: string;     // 점검자 (주점검자 / 보조점검자)
  items: SelfCheckItem[];
}

async function fetchSelfCheckDetail(elevatorNo: string, apiKey: string, yyyymm: string): Promise<SelfCheckReportData> {
  const baseUrl = '/api/elevator';
  const encodedKey = encodeURIComponent(apiKey);
  const url = `${baseUrl}/ElevatorSelfCheckService/getSelfCheckList?serviceKey=${encodedKey}&pageNo=1&numOfRows=200&yyyymm=${yyyymm}&elevator_no=${elevatorNo}`;
  const res = await fetch(url);
  const text = await res.text();
  const doc = parseXmlResponse(text);
  const items = getXmlItems(doc);

  if (items.length === 0) {
    throw new Error(`${yyyymm.slice(0,4)}.${yyyymm.slice(4)}월 자체점검 데이터가 없습니다.`);
  }

  // 첫 번째 item에서 헤더 정보 추출
  const first = items[0];
  const fv = (tag: string) => first.getElementsByTagName(tag)[0]?.textContent?.trim() || '';

  // 점검자 수집 (주점검자 + 보조점검자, 중복 제거)
  const inspectorSet = new Set<string>();
  items.forEach(item => {
    const v = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
    const main = v('selchkUsnm');
    const sub = v('subSelchkUsnm');
    if (main) inspectorSet.add(main);
    if (sub) inspectorSet.add(sub);
  });

  // selChkResult 코드 → 표시값 변환
  const mapResult = (code: string): string => {
    if (!code) return '';
    switch (code) {
      case 'A': return 'A';
      case 'B': return 'B';
      case 'C': return 'C';
      case 'D': case 'E': return '제외';
      default: return code;
    }
  };

  const checkItems: SelfCheckItem[] = items.map(item => {
    const v = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
    return {
      selchkNo: v('titNo'),
      selchkNm: v('selChkItemNm'),
      selchkContent: v('selChkItemDtlNm'),
      beforeResult: '',  // 전월 조회 결과에서 별도 주입
      currentResult: mapResult(v('selChkResult')),
    };
  });

  return {
    yyyymm,
    buldNm: fv('buldNm') || '',
    address: fv('address1') || fv('address') || '',
    elevatorNo: fv('elevatorNo') || elevatorNo,
    installationPlace: fv('installationPlace') || fv('elvtrAsignNo') || '',
    elvtrKindNm: fv('elvtrKindNm') || fv('elvtrDiv') || '',
    elvtrModel: fv('elvtrModel') || '',
    checkDate: fv('selchkBeginDate') || fv('registDt') || '',
    checkStTime: fv('selChkStDt') || '',
    checkEnTime: fv('selChkEnDt') || '',
    registDt: fv('registDt') || '',
    companyNm: fv('companyNm') || '',
    inspectors: Array.from(inspectorSet).join(' / '),
    items: checkItems,
  };
}

const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  ELEVATOR: '승강기',
  ESCALATOR: '에스컬레이터',
  ELECTRICAL: '전기시설',
  FIRE_SAFETY: '소방시설',
  BOILER: '보일러',
  GAS: '가스시설',
  PLUMBING: '급수/배수시설',
  SEPTIC_TANK: '정화조',
  PARKING_MECHANICAL: '기계식주차',
  PARKING_BARRIER: '주차차단기',
  HVAC: '냉난방',
  EV_CHARGER: '전기차충전',
  HOIST: '호이스트',
  SECURITY: '보안설비',
  OTHER: '기타설비'
};

const CATEGORY_ICONS: Record<string, any> = {
  ALL: LayoutGrid,
  ELEVATOR: ArrowUpDown,
  ESCALATOR: TrendingUp,
  ELECTRICAL: Zap,
  FIRE_SAFETY: Flame,
  BOILER: Thermometer,
  GAS: Wind,
  PLUMBING: Droplets,
  SEPTIC_TANK: Filter,
  PARKING_MECHANICAL: Car,
  PARKING_BARRIER: ParkingCircle,
  HVAC: Gauge,
  EV_CHARGER: BatteryCharging,
  HOIST: Package,
  SECURITY: Camera,
  OTHER: Settings,
};

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  ELEVATOR: '승강기',
  ESCALATOR: '에스컬',
  ELECTRICAL: '전기',
  FIRE_SAFETY: '소방',
  BOILER: '보일러',
  GAS: '가스',
  PLUMBING: '급배수',
  SEPTIC_TANK: '정화조',
  PARKING_MECHANICAL: '기계주차',
  PARKING_BARRIER: '차단기',
  HVAC: '냉난방',
  EV_CHARGER: 'EV충전',
  HOIST: '호이스트',
  SECURITY: '보안',
  OTHER: '기타',
};

const STATUS_LABELS: Record<FacilityStatus, {label: string, color: string, icon: any}> = {
  OPERATIONAL: { label: '정상', color: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]', icon: CheckCircle },
  UNDER_REPAIR: { label: '수리중', color: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]', icon: Wrench },
  INSPECTION_DUE: { label: '점검요망', color: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]', icon: AlertCircle },
  MALFUNCTION: { label: '고장', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: ShieldAlert }
};

// 카테고리별 사양 필드 정의
const CATEGORY_SPEC_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'number' | 'select'; options?: string[]; unit?: string; placeholder?: string }[]> = {
  FIRE_SAFETY: [
    { key: 'fireExtinguisherCount', label: '소화기 수량', type: 'number', unit: '개' },
    { key: 'sprinkler', label: '스프링클러', type: 'select', options: ['유', '무'] },
    { key: 'indoorHydrant', label: '옥내소화전', type: 'select', options: ['유', '무'] },
    { key: 'alarmType', label: '경보설비', type: 'text', placeholder: '자동화재탐지, 비상방송 등' },
    { key: 'evacuationType', label: '피난설비', type: 'text', placeholder: '유도등, 비상조명 등' },
    { key: 'safetyManager', label: '소방안전관리자', type: 'text', placeholder: '성명' },
    { key: 'inspectionType', label: '점검종류', type: 'select', options: ['종합정밀점검', '작동기능점검'] },
  ],
  ELECTRICAL: [
    { key: 'receivingCapacity', label: '수전용량', type: 'number', unit: 'kW' },
    { key: 'transformerCapacity', label: '변압기 용량', type: 'number', unit: 'kVA' },
    { key: 'receivingMethod', label: '수전방식', type: 'select', options: ['고압', '저압', '특고압'] },
    { key: 'emergencyGenerator', label: '비상발전기', type: 'select', options: ['유', '무'] },
    { key: 'generatorCapacity', label: '발전기 용량', type: 'number', unit: 'kW' },
    { key: 'safetyManager', label: '전기안전관리자', type: 'text', placeholder: '성명' },
    { key: 'groundingType', label: '접지방식', type: 'text', placeholder: '제1종, 제2종 등' },
  ],
  GAS: [
    { key: 'gasType', label: '가스종류', type: 'select', options: ['도시가스', '액화석유가스(LPG)', '고압가스', '기타'] },
    { key: 'facilityCapacity', label: '사용시설 용량', type: 'text', placeholder: '예: 50,000 kcal/h' },
    { key: 'pipeMaterial', label: '배관재질', type: 'text', placeholder: '강관, PE관 등' },
    { key: 'shutoffDevice', label: '가스차단장치', type: 'select', options: ['유', '무'] },
    { key: 'meterLocation', label: '계량기 위치', type: 'text', placeholder: '위치 설명' },
    { key: 'safetyManager', label: '가스안전관리자', type: 'text', placeholder: '성명' },
  ],
  BOILER: [
    { key: 'boilerType', label: '보일러 종류', type: 'select', options: ['가스보일러', '기름보일러', '전기보일러', '기타'] },
    { key: 'capacity', label: '용량', type: 'number', unit: 'kcal/h' },
    { key: 'pressure', label: '압력', type: 'number', unit: 'MPa' },
    { key: 'manufacturer', label: '제조사', type: 'text' },
    { key: 'safetyManager', label: '보일러 관리자', type: 'text', placeholder: '성명' },
    { key: 'inspectionType', label: '검사종류', type: 'select', options: ['개방검사', '사용중검사', '계속사용검사'] },
  ],
  SEPTIC_TANK: [
    { key: 'treatmentMethod', label: '처리방식', type: 'select', options: ['합병정화조', '단독정화조', '오수처리시설'] },
    { key: 'treatmentCapacity', label: '처리용량', type: 'text', placeholder: '예: 500인용, 50㎥/일' },
    { key: 'cleaningCycle', label: '청소주기', type: 'select', options: ['6개월', '1년', '2년'] },
    { key: 'waterTestCycle', label: '수질측정 주기', type: 'select', options: ['6개월', '1년'] },
    { key: 'cleaningCompany', label: '청소업체', type: 'text' },
  ],
  SECURITY: [
    { key: 'securityType', label: '설비종류', type: 'select', options: ['폐쇄회로TV', '출입통제', '도난방지', '피플카운트', '인터폰', '기타'] },
    { key: 'quantity', label: '수량', type: 'number', unit: '대' },
    { key: 'manufacturer', label: '제조사', type: 'text' },
    { key: 'recorderType', label: '녹화장치', type: 'select', options: ['디지털(DVR)', '네트워크(NVR)', '클라우드', '없음'] },
    { key: 'storageCapacity', label: '저장용량', type: 'number', unit: 'TB' },
    { key: 'retentionDays', label: '보관일수', type: 'number', unit: '일' },
    { key: 'monitoringMethod', label: '관제방식', type: 'select', options: ['상시감시', '원격감시', '무인', '상시+원격'] },
  ],
  HVAC: [
    { key: 'hvacType', label: '냉난방 방식', type: 'select', options: ['중앙냉난방', '개별냉난방', '지열', '기타'] },
    { key: 'coolingCapacity', label: '냉방능력', type: 'text', placeholder: '예: 100RT, 50,000 kcal/h' },
    { key: 'heatingCapacity', label: '난방능력', type: 'text', placeholder: '예: 50,000 kcal/h' },
    { key: 'manufacturer', label: '제조사', type: 'text' },
    { key: 'refrigerant', label: '냉매종류', type: 'text', placeholder: '예: R410A, R32' },
  ],
  PLUMBING: [
    { key: 'waterTankCapacity', label: '저수조 용량', type: 'number', unit: '톤' },
    { key: 'pumpCount', label: '펌프 수량', type: 'number', unit: '대' },
    { key: 'pumpCapacity', label: '펌프 용량', type: 'text', placeholder: '예: 5HP' },
    { key: 'waterTestCycle', label: '수질검사 주기', type: 'select', options: ['6개월', '1년'] },
    { key: 'cleaningCycle', label: '저수조 청소주기', type: 'select', options: ['6개월', '1년'] },
  ],
};

export const FacilityManager: React.FC<FacilityManagerProps> = ({
  facilities, facilityLogs, properties, units, stakeholders, maintenanceContracts,
  elevatorInsurances, elevatorSafetyManagers, elevatorInspections, elevatorMalfunctions,
  elevatorAccidents, elevatorPartDefects, elevatorMaintenanceContracts,
  onAddFacility, onUpdateFacility, onAddLog,
  onAddElevatorInsurance, onAddElevatorSafetyManager, onAddElevatorInspection,
  onAddElevatorMalfunction, onAddElevatorAccident, onAddElevatorPartDefect, onAddElevatorMaintenanceContract,
  onDeleteElevatorInsurance, onDeleteElevatorSafetyManager, onDeleteElevatorInspection,
  onDeleteElevatorMalfunction, onDeleteElevatorAccident, onDeleteElevatorPartDefect, onDeleteElevatorMaintenanceContract,
  formatMoney, formatMoneyInput, parseMoneyInput, apiKey, referenceDate
}) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogHistoryOpen, setIsLogHistoryOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [historyTab, setHistoryTab] = useState<'log' | 'inspection' | 'selfcheck'>('log');
  const [historyFacility, setHistoryFacility] = useState<Facility | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string>(properties[0]?.id || '');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [isElevatorLoading, setIsElevatorLoading] = useState(false);
  const [elevatorApiError, setElevatorApiError] = useState<string>('');

  const [facilityForm, setFacilityForm] = useState<Partial<Facility>>({
    category: 'ELEVATOR', status: 'OPERATIONAL', inspectionCycle: 12, initialCost: 0, buildingId: '', unitId: ''
  });

  const [elevatorInfo, setElevatorInfo] = useState<Partial<ElevatorInfo>>({});
  const [tempInsurances, setTempInsurances] = useState<Partial<ElevatorInsurance>[]>([]);
  const [tempSafetyManagers, setTempSafetyManagers] = useState<Partial<ElevatorSafetyManager>[]>([]);
  const [tempInspections, setTempInspections] = useState<Partial<ElevatorInspection>[]>([]);
  const [tempMalfunctions, setTempMalfunctions] = useState<Partial<ElevatorMalfunction>[]>([]);
  const [tempAccidents, setTempAccidents] = useState<Partial<ElevatorAccident>[]>([]);
  const [tempPartDefects, setTempPartDefects] = useState<Partial<ElevatorPartDefect>[]>([]);
  const [tempMaintenanceContracts, setTempMaintenanceContracts] = useState<Partial<ElevatorMaintenanceContract>[]>([]);
  const [inspectionPage, setInspectionPage] = useState(1);
  const [safetyManagerPage, setSafetyManagerPage] = useState(1);
  const [tempSelfCheckSummaries, setTempSelfCheckSummaries] = useState<SelfCheckMonthlySummary[]>([]);
  const [selfCheckReportMonth, setSelfCheckReportMonth] = useState<string | null>(null);
  const [selfCheckReportData, setSelfCheckReportData] = useState<SelfCheckReportData | null>(null);
  const [selfCheckReportLoading, setSelfCheckReportLoading] = useState(false);
  const [selfCheckReportError, setSelfCheckReportError] = useState('');
  const [selfCheckReportPage, setSelfCheckReportPage] = useState(1);
  const [selfCheckSummaryPage, setSelfCheckSummaryPage] = useState(1);

  const [logForm, setLogForm] = useState<Partial<FacilityLog>>({
    type: 'INSPECTION', date: new Date().toISOString().split('T')[0], cost: 0, isLegal: true, title: ''
  });

  const handleOpenAdd = () => {
    setFacilityForm({ propertyId: selectedPropId, category: 'ELEVATOR', status: 'OPERATIONAL', inspectionCycle: 12, initialCost: 0, name: '' });
    setSelectedFacilityId(null);
    setElevatorInfo({});
    setTempInsurances([]);
    setTempSafetyManagers([]);
    setTempInspections([]);
    setTempMalfunctions([]);
    setTempAccidents([]);
    setTempPartDefects([]);
    setTempMaintenanceContracts([]);
    setTempSelfCheckSummaries([]);
    setInspectionPage(1);
    setSafetyManagerPage(1);
    setIsModalOpen(true);
    setActiveTab('basic');
  };

  const handleOpenEdit = (fac: Facility) => {
    setSelectedFacilityId(fac.id);
    setFacilityForm({...fac});

    // 승강기/에스컬레이터 데이터 로드
    if (fac.category === 'ELEVATOR' || fac.category === 'ESCALATOR') {
      setElevatorInfo((fac.spec as ElevatorInfo) || {});
      setTempInsurances(elevatorInsurances.filter(i => i.facilityId === fac.id));
      setTempSafetyManagers(elevatorSafetyManagers.filter(m => m.facilityId === fac.id));
      setTempInspections(elevatorInspections.filter(i => i.facilityId === fac.id));
      setTempMalfunctions(elevatorMalfunctions.filter(m => m.facilityId === fac.id));
      setTempAccidents(elevatorAccidents.filter(a => a.facilityId === fac.id));
      setTempPartDefects(elevatorPartDefects.filter(d => d.facilityId === fac.id));
      setTempMaintenanceContracts(elevatorMaintenanceContracts.filter(c => c.facilityId === fac.id));
    }

    setIsViewMode(false);
    setIsModalOpen(true);
    setActiveTab('basic');
  };

  // 카드 클릭 → 조회 전용 모달
  const handleOpenView = (fac: Facility) => {
    setSelectedFacilityId(fac.id);
    setFacilityForm({...fac});
    if (fac.category === 'ELEVATOR' || fac.category === 'ESCALATOR') {
      setElevatorInfo((fac.spec as ElevatorInfo) || {});
      setTempInsurances(elevatorInsurances.filter(i => i.facilityId === fac.id));
      setTempSafetyManagers(elevatorSafetyManagers.filter(m => m.facilityId === fac.id));
      setTempInspections(elevatorInspections.filter(i => i.facilityId === fac.id));
      setTempMalfunctions(elevatorMalfunctions.filter(m => m.facilityId === fac.id));
      setTempAccidents(elevatorAccidents.filter(a => a.facilityId === fac.id));
      setTempPartDefects(elevatorPartDefects.filter(d => d.facilityId === fac.id));
      setTempMaintenanceContracts(elevatorMaintenanceContracts.filter(c => c.facilityId === fac.id));
      // 승강기번호가 있으면 API 자동 재조회 (검사이력 + 자체점검 최신화)
      const spec = (fac.spec as ElevatorInfo) || {};
      if (spec.elevatorNo && apiKey) {
        fetchElevatorFullData(spec.elevatorNo, apiKey, referenceDate).then(data => {
          if (data.inspections.length > 0) {
            const seen = new Set<string>();
            const unique = data.inspections.filter(insp => {
              const key = `${(insp.inspectionDate || '').replace(/[^0-9]/g, '')}_${(insp.inspectionType || '').trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setTempInspections(unique);
          }
          if (data.selfCheckSummaries) setTempSelfCheckSummaries(data.selfCheckSummaries);
        }).catch(() => {});
      }
    }
    setIsViewMode(true);
    setIsModalOpen(true);
    setActiveTab('basic');
  };

  // 이력 버튼 클릭 → 이력 모달
  const handleOpenHistory = (fac: Facility) => {
    setSelectedFacilityId(fac.id);
    setHistoryFacility(fac);
    setHistoryTab(fac.category === 'ELEVATOR' || fac.category === 'ESCALATOR' ? 'selfcheck' : 'log');
    // 승강기면 API 조회하여 최신 검사이력/자체점검 로드
    if ((fac.category === 'ELEVATOR' || fac.category === 'ESCALATOR') && apiKey) {
      const spec = (fac.spec as ElevatorInfo) || {};
      if (spec.elevatorNo) {
        setElevatorInfo(spec);
        setIsElevatorLoading(true);
        fetchElevatorFullData(spec.elevatorNo, apiKey, referenceDate).then(data => {
          if (data.inspections.length > 0) {
            const seen = new Set<string>();
            const unique = data.inspections.filter(insp => {
              const key = `${(insp.inspectionDate || '').replace(/[^0-9]/g, '')}_${(insp.inspectionType || '').trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setTempInspections(unique);
          }
          if (data.selfCheckSummaries) setTempSelfCheckSummaries(data.selfCheckSummaries);
          setElevatorInfo(prev => ({ ...prev, ...data.elevatorInfo }));
        }).catch(() => {}).finally(() => setIsElevatorLoading(false));
      }
    }
    setIsLogHistoryOpen(true);
  };

  const handleFetchElevator = async () => {
    const no = elevatorInfo.elevatorNo?.trim();
    if (!no) { setElevatorApiError('승강기번호를 입력해주세요.'); return; }
    if (!apiKey) { setElevatorApiError('환경설정에서 공공데이터포털 API 키를 먼저 등록해주세요.'); return; }

    setIsElevatorLoading(true);
    setElevatorApiError('');

    try {
      const data = await fetchElevatorFullData(no, apiKey, referenceDate);

      // 기본정보 자동입력 + 조회 기준일자 기록
      const newElevatorInfo = { ...elevatorInfo, ...data.elevatorInfo, lastFetchedAt: new Date().toISOString() } as any;
      setElevatorInfo(newElevatorInfo);

      // 설비명칭 자동입력 (비어있을 때만)
      let newName = facilityForm.name;
      if (!facilityForm.name && data.elevatorInfo.buldNm) {
        const kindLabel = data.elevatorInfo.elvtrDivNm || '승강기';
        newName = `${data.elevatorInfo.buldNm} ${kindLabel} (${no})`;
        setFacilityForm(prev => ({ ...prev, name: newName }));
      }

      // 안전관리자 자동입력
      if (data.safetyManagers.length > 0) {
        setTempSafetyManagers(data.safetyManagers);
      }

      // 검사이력 자동입력 (중복 제거: 날짜+종류+기관 기준)
      if (data.inspections.length > 0) {
        const seen = new Set<string>();
        const unique = data.inspections.filter(insp => {
          const dateNorm = (insp.inspectionDate || '').replace(/[^0-9]/g, '');
          const key = `${dateNorm}_${(insp.inspectionType || '').trim()}_${(insp.inspectionOrg || '').trim()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setTempInspections(unique);
      }

      // 자체점검 월별 요약 저장
      if (data.selfCheckSummaries) {
        setTempSelfCheckSummaries(data.selfCheckSummaries);
      }

      // 기존 시설이면 조회 즉시 자동 저장
      if (selectedFacilityId) {
        const fac: Facility = {
          ...facilityForm as Facility,
          id: selectedFacilityId,
          spec: newElevatorInfo,
          lastInspectionDate: newElevatorInfo.lastInspctDe || facilityForm.lastInspectionDate || new Date().toISOString().split('T')[0],
          nextInspectionDate: newElevatorInfo.applcEnDt || facilityForm.nextInspectionDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          installationDate: newElevatorInfo.installationDe || facilityForm.installationDate || new Date().toISOString().split('T')[0],
          ...(newName ? { name: newName } : {}),
        };
        onUpdateFacility(fac);
      }
    } catch (err: any) {
      setElevatorApiError(err.message || '승강기 정보 조회에 실패했습니다.');
    } finally {
      setIsElevatorLoading(false);
    }
  };

  const handleSaveFacility = () => {
    if (!facilityForm.name) return;
    const fac: Facility = {
        id: selectedFacilityId || `fac${Date.now()}`,
        lastInspectionDate: new Date().toISOString().split('T')[0],
        nextInspectionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        spec: {},
        ...facilityForm as Facility
    };
    selectedFacilityId ? onUpdateFacility(fac) : onAddFacility(fac);
    setIsModalOpen(false);
  };

  const handleSaveElevator = () => {
    if (!facilityForm.name) return;

    const facilityId = selectedFacilityId || `fac${Date.now()}`;

    // Facility 저장
    const fac: Facility = {
        id: facilityId,
        lastInspectionDate: elevatorInfo.lastInspctDe || new Date().toISOString().split('T')[0],
        nextInspectionDate: elevatorInfo.applcEnDt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        spec: elevatorInfo,
        installationDate: elevatorInfo.installationDe || new Date().toISOString().split('T')[0],
        ...facilityForm as Facility
    };

    selectedFacilityId ? onUpdateFacility(fac) : onAddFacility(fac);

    // 승강기 관련 데이터 저장
    tempInsurances.forEach(ins => {
      if (ins.insuranceCompany) {
        onAddElevatorInsurance({ ...ins, id: ins.id || `ins${Date.now()}_${Math.random()}`, facilityId } as ElevatorInsurance);
      }
    });
    tempSafetyManagers.forEach(mgr => {
      if (mgr.managerName) {
        onAddElevatorSafetyManager({ ...mgr, id: mgr.id || `mgr${Date.now()}_${Math.random()}`, facilityId } as ElevatorSafetyManager);
      }
    });
    tempInspections.forEach(insp => {
      if (insp.inspectionDate) {
        onAddElevatorInspection({ ...insp, id: insp.id || `insp${Date.now()}_${Math.random()}`, facilityId } as ElevatorInspection);
      }
    });
    tempMalfunctions.forEach(mal => {
      if (mal.malfunctionDate) {
        onAddElevatorMalfunction({ ...mal, id: mal.id || `mal${Date.now()}_${Math.random()}`, facilityId } as ElevatorMalfunction);
      }
    });
    tempAccidents.forEach(acc => {
      if (acc.accidentDate) {
        onAddElevatorAccident({ ...acc, id: acc.id || `acc${Date.now()}_${Math.random()}`, facilityId } as ElevatorAccident);
      }
    });
    tempPartDefects.forEach(def => {
      if (def.inspectionYear) {
        onAddElevatorPartDefect({ ...def, id: def.id || `def${Date.now()}_${Math.random()}`, facilityId } as ElevatorPartDefect);
      }
    });
    tempMaintenanceContracts.forEach(con => {
      if (con.maintenanceCompany1 || con.maintenanceCompany2) {
        onAddElevatorMaintenanceContract({ ...con, id: con.id || `con${Date.now()}_${Math.random()}`, facilityId } as ElevatorMaintenanceContract);
      }
    });

    // 초기화
    setIsModalOpen(false);
    setElevatorInfo({});
    setTempInsurances([]);
    setTempSafetyManagers([]);
    setTempInspections([]);
    setTempMalfunctions([]);
    setTempAccidents([]);
    setTempPartDefects([]);
    setTempMaintenanceContracts([]);
    setTempSelfCheckSummaries([]);
    setInspectionPage(1);
    setSafetyManagerPage(1);
  };

  const handleOpenSelfCheckReport = async (yyyymm: string) => {
    const no = elevatorInfo.elevatorNo?.trim();
    if (!no || !apiKey) return;
    setSelfCheckReportMonth(yyyymm);
    setSelfCheckReportLoading(true);
    setSelfCheckReportError('');
    setSelfCheckReportData(null);
    setSelfCheckReportPage(1);
    try {
      // 전월 YYYYMM 계산
      const y = parseInt(yyyymm.slice(0, 4));
      const m = parseInt(yyyymm.slice(4));
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const prevYm = `${prevY}${String(prevM).padStart(2, '0')}`;

      // 당월 + 전월 병렬 조회
      const [currentData, prevResult] = await Promise.all([
        fetchSelfCheckDetail(no, apiKey, yyyymm),
        fetchSelfCheckDetail(no, apiKey, prevYm).catch(() => null),
      ]);

      // 전월 결과를 selChkItemDtlNm(점검내용) 기준으로 매핑 → 직전 컬럼에 반영
      if (prevResult && prevResult.items.length > 0) {
        const prevMap = new Map<string, string>();
        prevResult.items.forEach(item => {
          if (item.selchkContent) {
            prevMap.set(item.selchkContent, item.currentResult || '');
          }
        });
        currentData.items.forEach(item => {
          if (item.selchkContent && prevMap.has(item.selchkContent)) {
            item.beforeResult = prevMap.get(item.selchkContent)!;
          }
        });
      }

      // elevatorInfo에서 보충
      if (!currentData.buldNm && elevatorInfo.buldNm) currentData.buldNm = elevatorInfo.buldNm;
      if (!currentData.address && elevatorInfo.address1) currentData.address = `${elevatorInfo.address1 || ''} ${elevatorInfo.address2 || ''}`.trim();
      if (!currentData.installationPlace && elevatorInfo.installationPlace) currentData.installationPlace = elevatorInfo.installationPlace;
      if (!currentData.elvtrKindNm && elevatorInfo.elvtrKindNm) currentData.elvtrKindNm = `${elevatorInfo.elvtrKindNm || ''}`;
      if (!currentData.elvtrModel && elevatorInfo.elvtrModel) currentData.elvtrModel = elevatorInfo.elvtrModel;
      setSelfCheckReportData(currentData);
    } catch (err: any) {
      setSelfCheckReportError(err.message || '자체점검 세부 조회에 실패했습니다.');
    } finally {
      setSelfCheckReportLoading(false);
    }
  };

  const handlePrintSelfCheckReport = () => {
    const printArea = document.getElementById('self-check-report-print');
    if (!printArea) return;
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>자체점검결과</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; font-size: 11px; color: #000; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 4px 6px; }
        th { background: #e8f0fe; font-weight: bold; }
        .header-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 16px; }
        .section-title { font-weight: bold; margin: 12px 0 6px; }
        .info-table td { border: 1px solid #999; }
        .info-table .label { background: #f0f0f0; font-weight: bold; width: 15%; }
        .bold-row td { font-weight: bold; background: #fafafa; }
        .page-break { page-break-before: always; }
      </style>
    </head><body>${printArea.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const handleSaveLog = () => {
    if (!logForm.title || !selectedFacilityId) return;
    const log: FacilityLog = { id: `log${Date.now()}`, facilityId: selectedFacilityId, performer: '시설관리팀', description: '', ...logForm } as FacilityLog;
    onAddLog(log);
    setIsAddLogOpen(false);
  };

  const getPropertyAddress = (prop: Property) => {
    const a = prop.masterAddress;
    return `${a.sido} ${a.sigungu} ${a.eupMyeonDong}${a.li ? ' ' + a.li : ''} ${a.bonbun}${a.bubun ? '-' + a.bubun : ''}`;
  };

  const selectedProperty = properties.find(p => p.id === selectedPropId);
  const propertyFacilities = facilities.filter(f => f.propertyId === selectedPropId);
  const availableCategories = Object.entries(CATEGORY_LABELS)
    .filter(([key]) => propertyFacilities.some(f => f.category === key))
    .map(([key, label]) => ({ id: key, label, count: propertyFacilities.filter(f => f.category === key).length }));
  const filteredFacilities = activeCategoryTab === 'ALL'
    ? propertyFacilities
    : propertyFacilities.filter(f => f.category === activeCategoryTab);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* 왼쪽: 물건 목록 */}
      <div className="w-full lg:w-72 bg-white rounded-xl border border-[#dadce0] flex-shrink-0 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-[#dadce0] flex justify-between items-center bg-[#f8f9fa]">
          <h2 className="font-bold text-sm text-[#3c4043] flex items-center gap-2">
            <Layers size={16} className="text-[#1a73e8]"/> 물건 목록
          </h2>
        </div>
        <div className="p-2 space-y-1.5 bg-[#f8f9fa] max-h-[300px] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
          {properties.map(prop => (
            <button key={prop.id}
              onClick={() => { setSelectedPropId(prop.id); setActiveCategoryTab('ALL'); }}
              className={`w-full text-left p-3 rounded-lg transition-all border ${selectedPropId === prop.id ? 'bg-white border-[#1a73e8] shadow-sm' : 'bg-white hover:bg-[#f1f3f4] border-transparent'}`}
            >
              <h3 className={`font-bold text-sm truncate ${selectedPropId === prop.id ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>
                {prop.name}
              </h3>
              <div className="flex items-center text-[10px] text-[#5f6368] mt-1">
                <MapPin size={10} className="mr-1 flex-shrink-0"/>
                <span className="truncate">{getPropertyAddress(prop)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 오른쪽: 선택된 물건의 시설 */}
      <div className="flex-1 min-w-0">
        {selectedProperty ? (
          <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
            {/* 헤더 */}
            <div className="p-3 md:p-6 border-b border-[#f1f3f4] bg-white flex flex-col sm:flex-row justify-between items-start gap-2 md:gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-2xl font-bold text-[#202124] mb-1 md:mb-2 truncate">{selectedProperty.name}</h1>
                <p className="text-[#5f6368] flex items-center text-[11px] md:text-sm font-medium">
                  <MapPin size={14} className="mr-1 text-[#1a73e8] flex-shrink-0"/>
                  <span className="truncate">{getPropertyAddress(selectedProperty)}</span>
                </p>
              </div>
              <button onClick={handleOpenAdd} className="bg-[#1a73e8] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black flex items-center gap-1 md:gap-2 hover:bg-[#1557b0] shadow-xl transition-all active:scale-95 whitespace-nowrap flex-shrink-0">
                <Plus size={14} className="md:w-[18px] md:h-[18px]"/> 설비 등록
              </button>
            </div>

            {/* 세로 카테고리 탭 + 카드 영역 */}
            <div className="flex flex-row min-h-[300px]">

              {/* 세로 카테고리 탭 */}
              <div className="w-[52px] md:w-16 flex-shrink-0 bg-[#f8f9fa] border-r border-[#dadce0] flex flex-col overflow-y-auto">
                {/* 전체 탭 */}
                {(() => {
                  const isAll = activeCategoryTab === 'ALL';
                  return (
                    <button onClick={() => setActiveCategoryTab('ALL')}
                      className={`relative flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all border-b border-gray-200 ${isAll ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:bg-gray-200 hover:text-[#202124]'}`}>
                      {isAll && <span className="absolute left-0 inset-y-0 w-0.5 bg-white rounded-r"/>}
                      <LayoutGrid size={15}/>
                      <span className="text-[8px] font-black leading-tight">전체</span>
                      <span className={`text-[7px] font-black px-1 rounded-full leading-tight ${isAll ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'}`}>{propertyFacilities.length}</span>
                    </button>
                  );
                })()}
                {/* 카테고리별 탭 */}
                {availableCategories.map(cat => {
                  const Icon = CATEGORY_ICONS[cat.id] || Settings;
                  const shortLabel = CATEGORY_SHORT_LABELS[cat.id] || cat.label;
                  const isActive = activeCategoryTab === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setActiveCategoryTab(cat.id)}
                      className={`relative flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all border-b border-gray-200 ${isActive ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:bg-gray-200 hover:text-[#202124]'}`}>
                      {isActive && <span className="absolute left-0 inset-y-0 w-0.5 bg-white rounded-r"/>}
                      <Icon size={15}/>
                      <span className="text-[7px] font-black leading-tight text-center px-0.5 break-words w-full">{shortLabel}</span>
                      <span className={`text-[7px] font-black px-1 rounded-full leading-tight ${isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'}`}>{cat.count}</span>
                    </button>
                  );
                })}
              </div>

              {/* 카드 목록 */}
              <div className="flex-1 min-w-0 p-2 md:p-3 overflow-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                  {filteredFacilities.map(fac => {
                    const status = STATUS_LABELS[fac.status];
                    return (
                      <div key={fac.id} className="bg-white rounded-lg border border-[#dadce0] p-2 md:p-3 hover:shadow-md transition-all relative group flex flex-col border-b-2 border-b-gray-100 hover:border-b-[#1a73e8] cursor-pointer" onClick={() => handleOpenView(fac)}>
                        <div className="flex justify-between items-start mb-1.5 gap-1">
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-black text-[#5f6368] uppercase tracking-wide bg-gray-50 px-1 py-0.5 rounded border border-gray-100">{CATEGORY_LABELS[fac.category]}</span>
                            <h3 className="text-xs md:text-sm font-black text-[#202124] mt-1 group-hover:text-[#1a73e8] transition-colors truncate">{fac.name}</h3>
                          </div>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black border flex items-center gap-1 whitespace-nowrap ${status.color}`}>
                            <status.icon size={9}/>
                            <span>{status.label}</span>
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] font-bold flex-1">
                          <div className="flex justify-between items-center bg-[#f8f9fa] px-2 py-1 rounded border border-gray-100">
                            <span className="text-[#5f6368] flex items-center gap-1"><Calendar size={10} className="text-gray-400"/> 점검일</span>
                            <span className={`font-black ${fac.status === 'INSPECTION_DUE' ? 'text-red-600' : 'text-gray-700'}`}>{fac.nextInspectionDate || '-'}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-1.5 pt-2 border-t border-[#f1f3f4]">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenHistory(fac); }} className="flex-1 py-1 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded text-[9px] font-black transition-all flex items-center justify-center gap-1 active:scale-95">
                            <History size={11}/> 이력
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredFacilities.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 font-bold text-xs bg-[#f8f9fa] rounded-xl border-2 border-dashed border-gray-200">
                      {propertyFacilities.length === 0 ? '등록된 설비가 없습니다.' : '해당 카테고리에 설비가 없습니다.'}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-32 text-gray-400 font-bold text-sm bg-white rounded-xl border border-[#dadce0]">
            물건을 선택해주세요
          </div>
        )}
      </div>

      {isModalOpen && (
         <Modal onClose={() => { setIsModalOpen(false); setIsViewMode(false); }} disableOverlayClick={true}>
            <div className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-6">
                  <h3 className="font-black text-xl md:text-2xl text-[#3c4043] flex items-center gap-3">
                     <Wrench size={24} className="text-[#1a73e8]"/>
                     {isViewMode ? '설비 상세' : selectedFacilityId ? '설비 수정' : '설비 등록'}
                  </h3>
                  <div className="flex items-center gap-2">
                     {isViewMode && (
                        <button onClick={() => setIsViewMode(false)} className="px-3 py-1.5 text-xs font-bold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] rounded-lg transition-colors">
                           수정
                        </button>
                     )}
                     <button onClick={() => { setIsModalOpen(false); setIsViewMode(false); }} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={24}/>
                     </button>
                  </div>
               </div>

               {/* 기본 정보 (모든 설비 동일) */}
               <div className={`space-y-6 ${isViewMode ? '[&_input]:bg-gray-50 [&_input]:cursor-default [&_select]:bg-gray-50 [&_select]:cursor-default [&_textarea]:bg-gray-50 [&_textarea]:cursor-default [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none' : ''}`}>
                     <div>
                        <label className="text-xs font-bold text-gray-600 block mb-2">설비 명칭 <span className="text-red-500">*</span></label>
                        <input
                           className="w-full border border-[#dadce0] p-3 rounded-xl font-bold"
                           value={facilityForm.name || ''}
                           onChange={e => setFacilityForm({...facilityForm, name: e.target.value})}
                           placeholder="예: 중앙 승강기 1호기"
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label className="text-xs font-bold text-gray-600 block mb-2">설비 카테고리</label>
                           <select
                              className="w-full border border-[#dadce0] p-3 rounded-xl bg-white font-bold"
                              value={facilityForm.category}
                              onChange={e => setFacilityForm({...facilityForm, category: e.target.value as any})}
                           >
                              {Object.keys(CATEGORY_LABELS).map(k => <option key={k} value={k}>{CATEGORY_LABELS[k as FacilityCategory]}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-600 block mb-2">가동 상태</label>
                           <select
                              className="w-full border border-[#dadce0] p-3 rounded-xl bg-white font-bold"
                              value={facilityForm.status}
                              onChange={e => setFacilityForm({...facilityForm, status: e.target.value as any})}
                           >
                              {Object.keys(STATUS_LABELS).map(k => <option key={k} value={k}>{STATUS_LABELS[k as FacilityStatus].label}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-600 block mb-2">점검 주기 (개월)</label>
                           <input
                              type="number"
                              className="w-full border border-[#dadce0] p-3 rounded-xl bg-white font-bold"
                              value={facilityForm.inspectionCycle}
                              onChange={e => setFacilityForm({...facilityForm, inspectionCycle: Number(e.target.value)})}
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label className="text-xs font-bold text-gray-600 block mb-2">물건</label>
                           <select
                              className="w-full border border-[#dadce0] p-3 rounded-xl bg-white font-bold"
                              value={facilityForm.propertyId}
                              onChange={e => setFacilityForm({...facilityForm, propertyId: e.target.value, buildingId: '', unitId: ''})}
                           >
                              <option value="">선택</option>
                              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-600 block mb-2">건물</label>
                           <select
                              className="w-full border border-[#dadce0] p-3 rounded-xl bg-white font-bold"
                              value={facilityForm.buildingId}
                              onChange={e => setFacilityForm({...facilityForm, buildingId: e.target.value, unitId: ''})}
                           >
                              <option value="">선택</option>
                              {properties.find(p => p.id === facilityForm.propertyId)?.buildings.map(b =>
                                 <option key={b.id} value={b.id}>{b.name}</option>
                              )}
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-600 block mb-2">호실</label>
                           <select
                              className="w-full border border-[#dadce0] p-3 rounded-xl bg-white font-bold"
                              value={facilityForm.unitId}
                              onChange={e => setFacilityForm({...facilityForm, unitId: e.target.value})}
                           >
                              <option value="">공용</option>
                              {units.filter(u => u.buildingId === facilityForm.buildingId).map(u =>
                                 <option key={u.id} value={u.id}>{u.unitNumber}호</option>
                              )}
                           </select>
                        </div>
                     </div>
               </div>

               {/* 카테고리별 사양 (승강기/에스컬레이터 제외) */}
               {facilityForm.category && facilityForm.category !== 'ELEVATOR' && facilityForm.category !== 'ESCALATOR' && CATEGORY_SPEC_FIELDS[facilityForm.category] && (
                  <div className={`mt-8 ${isViewMode ? '[&_input]:bg-gray-50 [&_input]:cursor-default [&_select]:bg-gray-50 [&_select]:cursor-default [&_input]:pointer-events-none [&_select]:pointer-events-none' : ''}`}>
                     <div className="bg-[#f8f9fa] p-4 md:p-6 rounded-xl border border-gray-200">
                        <h4 className="font-black text-sm md:text-base text-[#1a73e8] flex items-center gap-2 border-b border-[#1a73e8] pb-2 mb-4">
                           <ClipboardCheck size={16}/> {CATEGORY_LABELS[facilityForm.category as FacilityCategory]} 사양
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {CATEGORY_SPEC_FIELDS[facilityForm.category].map(field => (
                              <div key={field.key}>
                                 <label className="text-xs font-bold text-gray-600 block mb-1.5">
                                    {field.label}{field.unit ? <span className="text-gray-400 font-normal ml-1">({field.unit})</span> : ''}
                                 </label>
                                 {field.type === 'select' ? (
                                    <select
                                       className="w-full border border-gray-300 p-2.5 rounded-lg bg-white font-bold text-sm"
                                       value={(facilityForm.spec as any)?.[field.key] || ''}
                                       onChange={e => setFacilityForm({...facilityForm, spec: {...(facilityForm.spec || {}), [field.key]: e.target.value}})}
                                    >
                                       <option value="">선택</option>
                                       {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                 ) : (
                                    <input
                                       type={field.type}
                                       className="w-full border border-gray-300 p-2.5 rounded-lg font-bold text-sm"
                                       value={(facilityForm.spec as any)?.[field.key] || ''}
                                       onChange={e => setFacilityForm({...facilityForm, spec: {...(facilityForm.spec || {}), [field.key]: field.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value}})}
                                       placeholder={field.placeholder || ''}
                                    />
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}

               {/* 승강기 상세 정보 (승강기/에스컬레이터만 표시) */}
               {(facilityForm.category === 'ELEVATOR' || facilityForm.category === 'ESCALATOR') && (
                  <div className="mt-8 space-y-6">
                     {/* ① 승강기 정보 조회 */}
                     <div className="bg-[#f8f9fa] p-4 md:p-6 rounded-xl border border-gray-200">
                        <h4 className="font-black text-sm md:text-base text-[#1a73e8] flex items-center gap-2 border-b border-[#1a73e8] pb-2 mb-4">
                           <Zap size={16}/> 승강기 정보 조회
                        </h4>
                        {/* 승강기번호 + 조회 버튼 */}
                        <div className="flex gap-2 items-center mb-4 flex-wrap">
                           <input
                              className="w-48 border border-gray-300 p-2 rounded font-bold text-sm"
                              value={elevatorInfo.elevatorNo || ''}
                              onChange={e => { setElevatorInfo({...elevatorInfo, elevatorNo: e.target.value}); setElevatorApiError(''); }}
                              placeholder="승강기번호 (7자리)"
                              maxLength={10}
                           />
                           <button
                              onClick={handleFetchElevator}
                              disabled={isElevatorLoading}
                              className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-1.5 transition-all active:scale-95 ${
                                 isElevatorLoading
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : (elevatorInfo as any).lastFetchedAt
                                      ? 'bg-[#34a853] text-white hover:bg-[#2d9045] shadow-md'
                                      : 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-md'
                              }`}
                           >
                              {isElevatorLoading ? <Loader2 size={14} className="animate-spin"/> : (elevatorInfo as any).lastFetchedAt ? <RefreshCw size={14}/> : <Search size={14}/>}
                              {isElevatorLoading ? '조회 중...' : (elevatorInfo as any).lastFetchedAt ? '새로고침' : '조회'}
                           </button>
                           {elevatorApiError && (
                              <span className="text-xs text-[#ea4335] font-bold flex items-center gap-1">
                                 <AlertCircle size={12}/> {elevatorApiError}
                              </span>
                           )}
                           {!elevatorApiError && elevatorInfo.buldNm && !isElevatorLoading && (
                              <span className="text-xs text-[#34a853] font-bold flex items-center gap-1">
                                 <CheckCircle size={12}/> 조회 완료
                                 {(elevatorInfo as any).lastFetchedAt && (
                                   <span className="text-[#5f6368] font-normal ml-1">
                                     ({new Date((elevatorInfo as any).lastFetchedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 기준)
                                   </span>
                                 )}
                              </span>
                           )}
                        </div>
                        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                           <table className="w-full text-xs md:text-sm">
                              <tbody>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600 w-1/4">건물명</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.buldNm || ''} onChange={e => setElevatorInfo({...elevatorInfo, buldNm: e.target.value})}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600 w-1/4">소재지</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={`${elevatorInfo.address1 || ''} ${elevatorInfo.address2 || ''}`.trim()} onChange={e => setElevatorInfo({...elevatorInfo, address1: e.target.value, address2: ''})}/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">제조업체</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.manufacturerName || ''} onChange={e => setElevatorInfo({...elevatorInfo, manufacturerName: e.target.value})}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">모델명</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.elvtrModel || ''} onChange={e => setElevatorInfo({...elevatorInfo, elvtrModel: e.target.value})}/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">종류</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={`${elevatorInfo.elvtrKindNm || ''} / ${elevatorInfo.elvtrDivNm || ''}`.replace(/^ \/ $/, '')} onChange={e => { const parts = e.target.value.split('/').map(s => s.trim()); setElevatorInfo({...elevatorInfo, elvtrKindNm: parts[0] || '', elvtrDivNm: parts[1] || ''}); }}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">상태</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.elvtrStts || ''} onChange={e => setElevatorInfo({...elevatorInfo, elvtrStts: e.target.value})}/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">적재하중</td>
                                    <td className="p-2 md:p-3"><input type="number" className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.liveLoad || ''} onChange={e => setElevatorInfo({...elevatorInfo, liveLoad: Number(e.target.value)})} placeholder="Kg"/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">최대정원</td>
                                    <td className="p-2 md:p-3"><input type="number" className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.ratedCap || ''} onChange={e => setElevatorInfo({...elevatorInfo, ratedCap: Number(e.target.value)})} placeholder="인승"/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">운행구간</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.shuttleSection || ''} onChange={e => setElevatorInfo({...elevatorInfo, shuttleSection: e.target.value})}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">운행층수</td>
                                    <td className="p-2 md:p-3"><input type="number" className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.shuttleFloorCnt || ''} onChange={e => setElevatorInfo({...elevatorInfo, shuttleFloorCnt: Number(e.target.value)})}/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">지상층수</td>
                                    <td className="p-2 md:p-3"><input type="number" className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.divGroundFloorCnt || ''} onChange={e => setElevatorInfo({...elevatorInfo, divGroundFloorCnt: Number(e.target.value)})}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">지하층수</td>
                                    <td className="p-2 md:p-3"><input type="number" className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.divUndgrndFloorCnt || ''} onChange={e => setElevatorInfo({...elevatorInfo, divUndgrndFloorCnt: Number(e.target.value)})}/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">정격속도</td>
                                    <td className="p-2 md:p-3"><input type="number" className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.ratedSpeed || ''} onChange={e => setElevatorInfo({...elevatorInfo, ratedSpeed: Number(e.target.value)})} placeholder="m/min"/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">최종검사일</td>
                                    <td className="p-2 md:p-3"><input type="date" className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.lastInspctDe || ''} onChange={e => setElevatorInfo({...elevatorInfo, lastInspctDe: e.target.value})}/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">검사유효기간</td>
                                    <td className="p-2 md:p-3">
                                       <div className="flex gap-1 items-center">
                                          <input type="date" className="flex-1 border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.applcBeDt || ''} onChange={e => setElevatorInfo({...elevatorInfo, applcBeDt: e.target.value})}/>
                                          <span className="text-gray-400">~</span>
                                          <input type="date" className="flex-1 border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.applcEnDt || ''} onChange={e => setElevatorInfo({...elevatorInfo, applcEnDt: e.target.value})}/>
                                       </div>
                                    </td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">설치일/최초설치일</td>
                                    <td className="p-2 md:p-3">
                                       <div className="flex gap-1 items-center">
                                          <input type="date" className="flex-1 border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.installationDe || ''} onChange={e => setElevatorInfo({...elevatorInfo, installationDe: e.target.value})}/>
                                          <span className="text-gray-400">/</span>
                                          <input type="date" className="flex-1 border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.frstInstallationDe || ''} onChange={e => setElevatorInfo({...elevatorInfo, frstInstallationDe: e.target.value})}/>
                                       </div>
                                    </td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">관리주체</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.partcpntNm || ''} onChange={e => setElevatorInfo({...elevatorInfo, partcpntNm: e.target.value})}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">관리주체 연락처</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.partcpntTelno || ''} onChange={e => setElevatorInfo({...elevatorInfo, partcpntTelno: e.target.value})}/></td>
                                 </tr>
                                 <tr className="border-b border-gray-100">
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">유지관리업체</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.mntCpnyNm || ''} onChange={e => setElevatorInfo({...elevatorInfo, mntCpnyNm: e.target.value})}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">유지관리업체 연락처</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.mntCpnyTelno || ''} onChange={e => setElevatorInfo({...elevatorInfo, mntCpnyTelno: e.target.value})}/></td>
                                 </tr>
                                 <tr>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">하도급업체</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.subcntrCpny || ''} onChange={e => setElevatorInfo({...elevatorInfo, subcntrCpny: e.target.value})}/></td>
                                    <td className="bg-gray-50 p-2 md:p-3 font-bold text-gray-600">최종검사기관</td>
                                    <td className="p-2 md:p-3"><input className="w-full border border-gray-300 p-1.5 md:p-2 rounded text-xs md:text-sm" value={elevatorInfo.inspctInstt || ''} onChange={e => setElevatorInfo({...elevatorInfo, inspctInstt: e.target.value})}/></td>
                                 </tr>
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* ② 안전관리자 정보 */}
                     {(() => {
                        const SM_PAGE_SIZE = 4;
                        const smTotalPages = Math.max(1, Math.ceil(tempSafetyManagers.length / SM_PAGE_SIZE));
                        const smCurrentPage = Math.min(safetyManagerPage, smTotalPages);
                        const pagedSafetyManagers = tempSafetyManagers.slice((smCurrentPage - 1) * SM_PAGE_SIZE, smCurrentPage * SM_PAGE_SIZE);
                        return (
                     <div className="bg-[#f8f9fa] p-4 md:p-6 rounded-xl border border-gray-200">
                        <h4 className="font-black text-sm md:text-base text-[#1a73e8] flex items-center gap-2 border-b border-[#1a73e8] pb-2 mb-4">
                           <ShieldAlert size={16}/> 안전관리자 정보
                           {tempSafetyManagers.length > 0 && <span className="text-xs font-normal text-gray-500 ml-auto">총 {tempSafetyManagers.length}건</span>}
                        </h4>
                        <div className="bg-white rounded-lg overflow-x-auto border border-gray-200">
                           <table className="w-full text-xs md:text-sm min-w-[500px]">
                              <thead className="bg-gray-50">
                                 <tr className="text-[10px] md:text-xs text-gray-600 font-bold">
                                    <th className="p-2 md:p-3 text-center">안전관리자명</th>
                                    <th className="p-2 md:p-3 text-center">선임일</th>
                                    <th className="p-2 md:p-3 text-center">교육 이수일</th>
                                    <th className="p-2 md:p-3 text-center">교육 유효기간</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {pagedSafetyManagers.length > 0 ? pagedSafetyManagers.map((mgr, i) => (
                                    <tr key={i} className="border-t border-gray-100 text-center">
                                       <td className="p-2 md:p-3 font-bold">{mgr.managerName}</td>
                                       <td className="p-2 md:p-3">{mgr.appointmentDate}</td>
                                       <td className="p-2 md:p-3">{mgr.educationCompletionDate}</td>
                                       <td className="p-2 md:p-3">{mgr.educationValidPeriod}</td>
                                    </tr>
                                 )) : (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-400 font-bold">안전관리자 정보가 없습니다.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                        {smTotalPages > 1 && (
                           <div className="flex items-center justify-center gap-1 mt-3">
                              <button onClick={() => setSafetyManagerPage(p => Math.max(1, p - 1))} disabled={smCurrentPage === 1}
                                 className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">◀</button>
                              {Array.from({ length: smTotalPages }, (_, idx) => idx + 1).map(pg => (
                                 <button key={pg} onClick={() => setSafetyManagerPage(pg)}
                                    className={`px-2.5 py-1 text-xs rounded border ${smCurrentPage === pg ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'border-gray-300 hover:bg-gray-100'}`}>
                                    {pg}
                                 </button>
                              ))}
                              <button onClick={() => setSafetyManagerPage(p => Math.min(smTotalPages, p + 1))} disabled={smCurrentPage === smTotalPages}
                                 className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">▶</button>
                           </div>
                        )}
                     </div>
                        );
                     })()}

                     {/* ③ 검사이력 */}
                     {(() => {
                        const inspList = tempInspections
                           .filter(i => i.inspectionType !== '자체점검')
                           .sort((a, b) => (b.inspectionDate || '').localeCompare(a.inspectionDate || ''));
                        const PAGE_SIZE = 6;
                        const totalPages = Math.max(1, Math.ceil(inspList.length / PAGE_SIZE));
                        const currentPage = Math.min(inspectionPage, totalPages);
                        const pagedList = inspList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
                        return (
                     <div className="bg-[#f8f9fa] p-4 md:p-6 rounded-xl border border-gray-200">
                        <h4 className="font-black text-sm md:text-base text-[#1a73e8] flex items-center gap-2 border-b border-[#1a73e8] pb-2 mb-4">
                           <ClipboardCheck size={16}/> 검사이력
                           {inspList.length > 0 && <span className="text-xs font-normal text-gray-500 ml-auto">총 {inspList.length}건</span>}
                        </h4>
                        <div className="bg-white rounded-lg overflow-x-auto border border-gray-200">
                           <table className="w-full text-xs md:text-sm min-w-[600px]">
                              <thead className="bg-gray-50">
                                 <tr className="text-[10px] md:text-xs text-gray-600 font-bold">
                                    <th className="p-2 md:p-3 text-center">검사종류</th>
                                    <th className="p-2 md:p-3 text-center">검사일자</th>
                                    <th className="p-2 md:p-3 text-center">운행유효기간</th>
                                    <th className="p-2 md:p-3 text-center">검사기관</th>
                                    <th className="p-2 md:p-3 text-center">검사원</th>
                                    <th className="p-2 md:p-3 text-center">합격유무</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {pagedList.length > 0 ? pagedList.map((insp, i) => (
                                    <tr key={i} className="border-t border-gray-100 text-center">
                                       <td className="p-2 md:p-3 font-bold">{insp.inspectionType}</td>
                                       <td className="p-2 md:p-3">{insp.inspectionDate}</td>
                                       <td className="p-2 md:p-3 text-xs">{insp.suspensionPeriod}</td>
                                       <td className="p-2 md:p-3">{insp.inspectionOrg}</td>
                                       <td className="p-2 md:p-3">{insp.inspector}</td>
                                       <td className="p-2 md:p-3">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${insp.result === 'PASS' ? 'bg-green-50 text-green-700' : insp.result === 'FAIL' ? 'bg-red-50 text-red-700' : insp.result === 'CONDITIONAL' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'}`}>
                                             {insp.result === 'PASS' ? '합격' : insp.result === 'FAIL' ? '불합격' : insp.result === 'CONDITIONAL' ? '조건부 합격' : '보류'}
                                          </span>
                                       </td>
                                    </tr>
                                 )) : (
                                    <tr><td colSpan={6} className="p-4 text-center text-gray-400 font-bold">검사이력이 없습니다.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                        {totalPages > 1 && (
                           <div className="flex items-center justify-center gap-2 mt-3">
                              <button onClick={() => setInspectionPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                                 className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                 <ChevronLeft size={16}/>
                              </button>
                              <span className="text-xs text-gray-600 font-bold">{currentPage} / {totalPages}</span>
                              <button onClick={() => setInspectionPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                                 className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                 <ChevronRight size={16}/>
                              </button>
                           </div>
                        )}
                     </div>
                        );
                     })()}

                     {/* ④ 자체점검 이력 (최근 12개월 개략 - API 실조회 결과) */}
                     <div className="bg-[#f8f9fa] p-4 md:p-6 rounded-xl border border-gray-200">
                        <h4 className="font-black text-sm md:text-base text-[#1a73e8] flex items-center gap-2 border-b border-[#1a73e8] pb-2 mb-4">
                           <ClipboardCheck size={16}/> 자체점검 이력
                           <span className="text-xs font-normal text-gray-500 ml-auto">최근 12개월 (클릭 시 세부 보고서)</span>
                        </h4>
                        <div className="bg-white rounded-lg overflow-x-auto border border-gray-200">
                           <table className="w-full text-xs md:text-sm min-w-[500px]">
                              <thead className="bg-gray-50">
                                 <tr className="text-[10px] md:text-xs text-gray-600 font-bold">
                                    <th className="p-2 md:p-3 text-center">점검년월</th>
                                    <th className="p-2 md:p-3 text-center">점검업체</th>
                                    <th className="p-2 md:p-3 text-center">점검자</th>
                                    <th className="p-2 md:p-3 text-center">등록일자</th>
                                    <th className="p-2 md:p-3 text-center">결과</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {tempSelfCheckSummaries.length > 0 ? (() => {
                                    const SUMMARY_PAGE_SIZE = 4;
                                    const totalSummaryPages = Math.ceil(tempSelfCheckSummaries.length / SUMMARY_PAGE_SIZE);
                                    const safePageNum = Math.min(selfCheckSummaryPage, totalSummaryPages);
                                    const pageItems = tempSelfCheckSummaries.slice((safePageNum - 1) * SUMMARY_PAGE_SIZE, safePageNum * SUMMARY_PAGE_SIZE);
                                    return (<>
                                       {pageItems.map(summary => {
                                          const displayYm = `${summary.yyyymm.slice(0,4)}.${summary.yyyymm.slice(4)}`;
                                          return (
                                             <tr key={summary.yyyymm}
                                                className={`border-t border-gray-100 text-center ${summary.hasData ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                                                onClick={() => summary.hasData && handleOpenSelfCheckReport(summary.yyyymm)}
                                             >
                                                <td className="p-2 md:p-3 font-bold">{displayYm}</td>
                                                <td className="p-2 md:p-3">{summary.hasData ? summary.companyNm || '-' : '-'}</td>
                                                <td className="p-2 md:p-3">{summary.hasData ? summary.inspector || '-' : '-'}</td>
                                                <td className="p-2 md:p-3">{summary.hasData ? summary.registDt || '-' : '-'}</td>
                                                <td className="p-2 md:p-3">
                                                   {summary.hasData ? (
                                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${summary.result === 'FAIL' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                         {summary.result === 'FAIL' ? '지적' : '양호'}
                                                      </span>
                                                   ) : (
                                                      <span className="text-gray-300 text-[10px]">-</span>
                                                   )}
                                                </td>
                                             </tr>
                                          );
                                       })}
                                       {totalSummaryPages > 1 && (
                                          <tr>
                                             <td colSpan={5} className="p-2">
                                                <div className="flex items-center justify-center gap-2">
                                                   <button onClick={(e) => { e.stopPropagation(); setSelfCheckSummaryPage(p => Math.max(1, p - 1)); }} disabled={safePageNum <= 1}
                                                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                                      <ChevronLeft size={14}/>
                                                   </button>
                                                   <span className="text-[10px] text-gray-500 font-bold">{safePageNum} / {totalSummaryPages}</span>
                                                   <button onClick={(e) => { e.stopPropagation(); setSelfCheckSummaryPage(p => Math.min(totalSummaryPages, p + 1)); }} disabled={safePageNum >= totalSummaryPages}
                                                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                                      <ChevronRight size={14}/>
                                                   </button>
                                                </div>
                                             </td>
                                          </tr>
                                       )}
                                    </>);
                                 })() : (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-400 font-bold">승강기 조회 후 자체점검 이력이 표시됩니다.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* ⑦ 유지관리 계약현황 (계약관리 연동) */}
                     {(() => {
                        // 현재 시설에 연결된 유지보수 계약 필터링
                        const linkedContracts = maintenanceContracts.filter(c =>
                           c.facilityId === selectedFacilityId ||
                           (c.serviceType === 'ELEVATOR' && c.targetId === facilityForm.propertyId)
                        );
                        return (
                           <div className="bg-[#f8f9fa] p-4 md:p-6 rounded-xl border border-gray-200">
                              <h4 className="font-black text-sm md:text-base text-[#1a73e8] flex items-center gap-2 border-b border-[#1a73e8] pb-2 mb-4">
                                 <Wrench size={16}/> 유지관리 계약현황
                                 <span className="text-xs font-normal text-gray-500 ml-auto">계약관리 탭에서 등록</span>
                              </h4>
                              <div className="bg-white rounded-lg overflow-x-auto border border-gray-200">
                                 <table className="w-full text-xs md:text-sm min-w-[400px]">
                                    <thead className="bg-gray-50">
                                       <tr className="text-[10px] md:text-xs text-gray-600 font-bold">
                                          <th className="p-2 md:p-3 text-left">유지관리업체</th>
                                          <th className="p-2 md:p-3 text-center">계약기간</th>
                                          <th className="p-2 md:p-3 text-center w-[80px]">계약서</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {linkedContracts.length > 0 ? linkedContracts.map(con => {
                                          const vendor = stakeholders.find(s => s.id === con.vendorId);
                                          return (
                                             <tr key={con.id} className="border-t border-gray-100">
                                                <td className="p-2 md:p-3 font-bold text-[#202124]">{vendor?.name || '-'}</td>
                                                <td className="p-2 md:p-3 text-center text-gray-600 whitespace-nowrap">
                                                   {con.term.startDate} ~ {con.term.endDate}
                                                </td>
                                                <td className="p-2 md:p-3 text-center">
                                                   <button className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold text-gray-600 transition-colors">
                                                      보기
                                                   </button>
                                                </td>
                                             </tr>
                                          );
                                       }) : (
                                          <tr><td colSpan={3} className="p-4 text-center text-gray-400 font-bold">
                                             등록된 유지관리 계약이 없습니다.
                                          </td></tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        );
                     })()}
                  </div>
               )}

               {/* 저장/닫기 버튼 */}
               <div className="flex justify-end gap-3 pt-8 border-t border-gray-100 mt-8">
                  <button
                     onClick={() => { setIsModalOpen(false); setIsViewMode(false); }}
                     className="px-8 py-4 text-sm font-black text-[#5f6368] hover:bg-gray-100 rounded-xl transition-colors"
                  >
                     {isViewMode ? '닫기' : '취소'}
                  </button>
                  {!isViewMode && (
                     <button
                        onClick={(facilityForm.category === 'ELEVATOR' || facilityForm.category === 'ESCALATOR') ? handleSaveElevator : handleSaveFacility}
                        className="px-14 py-4 bg-[#1a73e8] text-white font-black rounded-xl shadow-xl hover:bg-[#1557b0] transition-all active:scale-95"
                     >
                        저장
                     </button>
                  )}
               </div>
            </div>
         </Modal>
      )}

      {isLogHistoryOpen && selectedFacilityId && (() => {
         const isElevatorFac = historyFacility && (historyFacility.category === 'ELEVATOR' || historyFacility.category === 'ESCALATOR');
         const PAGE_SIZE_HIST = 6;
         const sortedInsp = [...tempInspections].sort((a, b) => ((b.inspectionDate || '') > (a.inspectionDate || '') ? 1 : -1));
         const inspPages = Math.ceil(sortedInsp.length / PAGE_SIZE_HIST);
         return (
         <Modal onClose={() => setIsLogHistoryOpen(false)} disableOverlayClick={true}>
            <div className="p-6 md:p-10 h-[85vh] flex flex-col">
               <div className="border-b border-gray-100 flex justify-between items-center pb-4 mb-4">
                  <div>
                     <h3 className="font-black text-xl md:text-2xl text-[#3c4043] flex items-center gap-3"><History size={24} className="text-[#1a73e8]"/> {historyFacility?.name || '설비'} 이력</h3>
                  </div>
                  <button onClick={() => setIsLogHistoryOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
               </div>

               {/* 탭 */}
               {isElevatorFac && (
                  <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                     {[
                        { key: 'selfcheck' as const, label: '자체점검 이력' },
                        { key: 'inspection' as const, label: '검사이력' },
                        { key: 'log' as const, label: '점검 기록' },
                     ].map(tab => (
                        <button key={tab.key} onClick={() => { setHistoryTab(tab.key); setSelfCheckSummaryPage(1); }}
                           className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${historyTab === tab.key ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                           {tab.label}
                        </button>
                     ))}
                  </div>
               )}

               <div className="flex-1 overflow-y-auto pr-2">
                  {/* 자체점검 이력 탭 */}
                  {historyTab === 'selfcheck' && isElevatorFac && (
                     <div>
                        {isElevatorLoading ? (
                           <div className="text-center py-16"><Loader2 size={32} className="animate-spin mx-auto text-[#1a73e8] mb-3"/><p className="text-sm text-gray-500 font-bold">자체점검 이력 조회 중...</p></div>
                        ) : (
                           <div className="bg-white rounded-lg overflow-x-auto border border-gray-200">
                              <table className="w-full text-xs md:text-sm min-w-[500px]">
                                 <thead className="bg-gray-50">
                                    <tr className="text-[10px] md:text-xs text-gray-600 font-bold">
                                       <th className="p-2 md:p-3 text-center">점검년월</th>
                                       <th className="p-2 md:p-3 text-center">점검업체</th>
                                       <th className="p-2 md:p-3 text-center">점검자</th>
                                       <th className="p-2 md:p-3 text-center">등록일자</th>
                                       <th className="p-2 md:p-3 text-center">결과</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {tempSelfCheckSummaries.length > 0 ? (() => {
                                       const SUMMARY_PAGE_SIZE = 4;
                                       const totalSummaryPages = Math.ceil(tempSelfCheckSummaries.length / SUMMARY_PAGE_SIZE);
                                       const safePageNum = Math.min(selfCheckSummaryPage, totalSummaryPages);
                                       const pageItems = tempSelfCheckSummaries.slice((safePageNum - 1) * SUMMARY_PAGE_SIZE, safePageNum * SUMMARY_PAGE_SIZE);
                                       return (<>
                                          {pageItems.map(summary => {
                                             const displayYm = `${summary.yyyymm.slice(0,4)}.${summary.yyyymm.slice(4)}`;
                                             return (
                                                <tr key={summary.yyyymm}
                                                   className={`border-t border-gray-100 text-center ${summary.hasData ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                                                   onClick={() => summary.hasData && handleOpenSelfCheckReport(summary.yyyymm)}
                                                >
                                                   <td className="p-2 md:p-3 font-bold">{displayYm}</td>
                                                   <td className="p-2 md:p-3">{summary.hasData ? summary.companyNm || '-' : '-'}</td>
                                                   <td className="p-2 md:p-3">{summary.hasData ? summary.inspector || '-' : '-'}</td>
                                                   <td className="p-2 md:p-3">{summary.hasData ? summary.registDt || '-' : '-'}</td>
                                                   <td className="p-2 md:p-3">
                                                      {summary.hasData ? (
                                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${summary.result === 'FAIL' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                            {summary.result === 'FAIL' ? '지적' : '양호'}
                                                         </span>
                                                      ) : (
                                                         <span className="text-gray-300 text-[10px]">-</span>
                                                      )}
                                                   </td>
                                                </tr>
                                             );
                                          })}
                                          {totalSummaryPages > 1 && (
                                             <tr>
                                                <td colSpan={5} className="p-2">
                                                   <div className="flex items-center justify-center gap-2">
                                                      <button onClick={() => setSelfCheckSummaryPage(p => Math.max(1, p - 1))} disabled={safePageNum <= 1}
                                                         className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft size={14}/></button>
                                                      <span className="text-[10px] text-gray-500 font-bold">{safePageNum} / {totalSummaryPages}</span>
                                                      <button onClick={() => setSelfCheckSummaryPage(p => Math.min(totalSummaryPages, p + 1))} disabled={safePageNum >= totalSummaryPages}
                                                         className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight size={14}/></button>
                                                   </div>
                                                </td>
                                             </tr>
                                          )}
                                       </>);
                                    })() : (
                                       <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">자체점검 이력이 없습니다.</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-2 text-center">행 클릭 시 세부 보고서를 확인할 수 있습니다.</p>
                     </div>
                  )}

                  {/* 검사이력 탭 */}
                  {historyTab === 'inspection' && isElevatorFac && (
                     <div>
                        {isElevatorLoading ? (
                           <div className="text-center py-16"><Loader2 size={32} className="animate-spin mx-auto text-[#1a73e8] mb-3"/><p className="text-sm text-gray-500 font-bold">검사이력 조회 중...</p></div>
                        ) : sortedInsp.length > 0 ? (
                           <div className="bg-white rounded-lg overflow-x-auto border border-gray-200">
                              <table className="w-full text-xs md:text-sm min-w-[500px]">
                                 <thead className="bg-gray-50">
                                    <tr className="text-[10px] md:text-xs text-gray-600 font-bold">
                                       <th className="p-2 md:p-3 text-center">검사종류</th>
                                       <th className="p-2 md:p-3 text-center">검사일자</th>
                                       <th className="p-2 md:p-3 text-center">유효기간</th>
                                       <th className="p-2 md:p-3 text-center">검사기관</th>
                                       <th className="p-2 md:p-3 text-center">결과</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {sortedInsp.slice((selfCheckSummaryPage - 1) * PAGE_SIZE_HIST, selfCheckSummaryPage * PAGE_SIZE_HIST).map((insp, idx) => {
                                       const result = insp.result || '';
                                       const isFail = result.includes('불합격');
                                       const isCond = result.includes('조건부');
                                       const isPass = !isFail && !isCond && result.includes('합격');
                                       return (
                                          <tr key={idx} className="border-t border-gray-100 text-center">
                                             <td className="p-2 md:p-3 font-bold">{insp.inspectionType || '-'}</td>
                                             <td className="p-2 md:p-3">{formatApiDate(insp.inspectionDate || '')}</td>
                                             <td className="p-2 md:p-3 text-gray-500 text-[10px]">{insp.validFrom && insp.validTo ? `${formatApiDate(insp.validFrom)}~${formatApiDate(insp.validTo)}` : '-'}</td>
                                             <td className="p-2 md:p-3">{insp.inspectionOrg || '-'}</td>
                                             <td className="p-2 md:p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isFail ? 'bg-red-50 text-red-700' : isCond ? 'bg-yellow-50 text-yellow-700' : isPass ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                                   {result || '-'}
                                                </span>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    {inspPages > 1 && (
                                       <tr>
                                          <td colSpan={5} className="p-2">
                                             <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setSelfCheckSummaryPage(p => Math.max(1, p - 1))} disabled={selfCheckSummaryPage <= 1}
                                                   className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft size={14}/></button>
                                                <span className="text-[10px] text-gray-500 font-bold">{selfCheckSummaryPage} / {inspPages}</span>
                                                <button onClick={() => setSelfCheckSummaryPage(p => Math.min(inspPages, p + 1))} disabled={selfCheckSummaryPage >= inspPages}
                                                   className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight size={14}/></button>
                                             </div>
                                          </td>
                                       </tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        ) : (
                           <div className="text-center py-16"><p className="text-gray-400 font-bold">검사이력이 없습니다.</p></div>
                        )}
                     </div>
                  )}

                  {/* 점검 기록 탭 */}
                  {(historyTab === 'log' || !isElevatorFac) && (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center">
                           <h4 className="text-[12px] font-black text-[#5f6368] uppercase tracking-widest flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#1a73e8]"></div> 시설 관리 타임라인</h4>
                           <button onClick={() => setIsAddLogOpen(true)} className="bg-[#1a73e8] text-white px-4 py-2 rounded-xl text-xs font-black transition-all hover:bg-[#1557b0] active:scale-95 shadow-lg">+ 기록 추가</button>
                        </div>
                        <div className="relative border-l-4 border-[#f1f3f4] ml-6 pl-10 space-y-8">
                          {facilityLogs.filter(l => l.facilityId === selectedFacilityId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                             <div key={log.id} className="relative bg-white rounded-2xl border border-[#dadce0] p-5 shadow-sm hover:shadow-xl hover:border-[#1a73e8] transition-all group border-l-8 border-l-[#1a73e8]">
                                <div className="absolute -left-[54px] top-5 w-6 h-6 bg-white border-4 border-[#1a73e8] rounded-full z-10 shadow-sm"></div>
                                <div className="flex justify-between items-start mb-3">
                                   <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black text-[#1a73e8] bg-blue-50 px-3 py-1 rounded-full">{log.date}</span>
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${log.type === 'REPAIR' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{log.type}</span>
                                   </div>
                                   <span className="font-black text-[#ea4335] text-sm">{formatMoney(log.cost)}</span>
                                </div>
                                <h5 className="font-black text-base text-[#202124] mb-2">{log.title}</h5>
                                <p className="text-sm text-[#5f6368] leading-relaxed font-medium bg-[#f8f9fa] p-3 rounded-xl">{log.description || '상세 내용 없음'}</p>
                                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-gray-400">
                                   <span>점검자: {log.performer}</span>
                                   {log.isLegal && <span className="flex items-center gap-1 text-[#34a853]"><CheckCircle size={12}/> 법정 점검</span>}
                                </div>
                             </div>
                          ))}
                          {facilityLogs.filter(l => l.facilityId === selectedFacilityId).length === 0 && (
                            <div className="text-center py-16 -ml-10">
                              <History size={48} className="mx-auto text-gray-200 mb-4"/>
                              <p className="text-gray-400 font-bold text-sm">등록된 점검 기록이 없습니다.</p>
                            </div>
                          )}
                        </div>
                     </div>
                  )}
               </div>

               <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button onClick={() => setIsLogHistoryOpen(false)} className="px-8 py-3 text-sm font-black text-[#5f6368] hover:bg-gray-100 rounded-xl transition-colors">닫기</button>
               </div>
            </div>
         </Modal>
         );
      })()}

      {/* 자체점검 세부 보고서 모달 */}
      {selfCheckReportMonth && (
         <Modal onClose={() => { setSelfCheckReportMonth(null); setSelfCheckReportData(null); setSelfCheckReportError(''); }} disableOverlayClick={true}>
            <div className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                  <h3 className="font-black text-lg md:text-xl text-[#3c4043] flex items-center gap-2">
                     <ClipboardCheck size={22} className="text-[#1a73e8]"/>
                     자체점검결과 ({selfCheckReportMonth.slice(0,4)}.{selfCheckReportMonth.slice(4)}월)
                  </h3>
                  <div className="flex items-center gap-2">
                     {selfCheckReportData && (
                        <button onClick={handlePrintSelfCheckReport} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                           <Printer size={14}/> 인쇄
                        </button>
                     )}
                     <button onClick={() => { setSelfCheckReportMonth(null); setSelfCheckReportData(null); setSelfCheckReportError(''); }} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={22}/>
                     </button>
                  </div>
               </div>

               {selfCheckReportLoading && (
                  <div className="py-20 text-center">
                     <Loader2 size={32} className="animate-spin mx-auto text-[#1a73e8] mb-3"/>
                     <p className="text-sm text-gray-500 font-bold">자체점검 세부 데이터 조회 중...</p>
                  </div>
               )}

               {selfCheckReportError && (
                  <div className="py-16 text-center">
                     <AlertCircle size={32} className="mx-auto text-red-400 mb-3"/>
                     <p className="text-sm text-red-600 font-bold">{selfCheckReportError}</p>
                  </div>
               )}

               {selfCheckReportData && (() => {
                  const data = selfCheckReportData;
                  const ROWS_PER_PAGE_FIRST = 25;
                  const ROWS_PER_PAGE = 35;
                  const totalItems = data.items.length;
                  const pages: SelfCheckItem[][] = [];
                  if (totalItems > 0) {
                     pages.push(data.items.slice(0, ROWS_PER_PAGE_FIRST));
                     let offset = ROWS_PER_PAGE_FIRST;
                     while (offset < totalItems) {
                        pages.push(data.items.slice(offset, offset + ROWS_PER_PAGE));
                        offset += ROWS_PER_PAGE;
                     }
                  }
                  const totalPages = pages.length;
                  const currentPage = Math.min(selfCheckReportPage, totalPages);
                  const displayYm = `${data.yyyymm.slice(0,4)}.${data.yyyymm.slice(4)}`;
                  const registDtFormatted = data.registDt ? formatApiDate(data.registDt) : '';
                  // 점검일시 포맷: YYYYMMDD HH:MM~HH:MM
                  const checkDateFormatted = (() => {
                     const d = data.checkDate;
                     if (!d) return '-';
                     const datePart = d.length >= 8 ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}` : d;
                     const st = data.checkStTime;
                     const en = data.checkEnTime;
                     const timePart = (st && en) ? ` ${st.slice(0,2)}:${st.slice(2)}~${en.slice(0,2)}:${en.slice(2)}` : '';
                     return datePart + timePart;
                  })();

                  return (
                     <div>
                        {/* 페이지네이션 상단 */}
                        {totalPages > 1 && (
                           <div className="flex items-center justify-center gap-2 mb-4">
                              <button onClick={() => setSelfCheckReportPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                                 className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                 <ChevronLeft size={16}/>
                              </button>
                              <span className="text-xs text-gray-600 font-bold">{currentPage} / {totalPages} 페이지 (총 {totalItems}항목)</span>
                              <button onClick={() => setSelfCheckReportPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                                 className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                 <ChevronRight size={16}/>
                              </button>
                           </div>
                        )}

                        {/* 인쇄용 숨김 영역 (전체 페이지) */}
                        <div id="self-check-report-print" style={{display: 'none'}}>
                           {pages.map((pageItems, pi) => (
                              <div key={pi} className={pi > 0 ? 'page-break' : ''}>
                                 {pi === 0 && (
                                    <>
                                       <div className="header-title">승강기 자체점검결과({displayYm}월)</div>
                                       <div className="section-title">□ 기본정보</div>
                                       <table className="info-table" style={{marginBottom: '12px'}}>
                                          <tbody>
                                             <tr>
                                                <td className="label">건물정보</td>
                                                <td colSpan={3}>{data.buldNm}{data.address ? ` (${data.address})` : ''}</td>
                                             </tr>
                                             <tr>
                                                <td className="label">승강기고유번호</td>
                                                <td>{data.elevatorNo}</td>
                                                <td className="label">호기(설치장소)</td>
                                                <td>{data.installationPlace || '-'}</td>
                                             </tr>
                                             <tr>
                                                <td className="label">승강기종류</td>
                                                <td>{data.elvtrKindNm || '-'}</td>
                                                <td className="label">승강기모델</td>
                                                <td>{data.elvtrModel || '-'}</td>
                                             </tr>
                                             <tr>
                                                <td className="label">점검일시</td>
                                                <td colSpan={3}>{checkDateFormatted}{registDtFormatted ? ` (전산등록일: ${registDtFormatted})` : ''}</td>
                                             </tr>
                                             <tr>
                                                <td className="label">점검자</td>
                                                <td colSpan={3}>{data.companyNm}{data.inspectors ? ` ${data.inspectors}` : ''}</td>
                                             </tr>
                                          </tbody>
                                       </table>
                                       <div className="section-title">□ 점검항목별 자체점검결과 <span style={{fontWeight:'normal', fontSize:'10px', marginLeft:'12px'}}>* 점검결과 : A-양호, B-주의관찰, C-긴급수리, 제외-점검주기 아님</span></div>
                                    </>
                                 )}
                                 <table>
                                    <thead>
                                       <tr>
                                          <th style={{width:'12%'}}>점검항목</th>
                                          <th>점검내용</th>
                                          <th style={{width:'8%'}} colSpan={2}>점검결과</th>
                                       </tr>
                                       <tr>
                                          <th></th><th></th>
                                          <th style={{width:'8%'}}>직전</th>
                                          <th style={{width:'8%'}}>당월</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {pageItems.map((item, idx) => {
                                          const depth = (item.selchkNo.match(/\./g) || []).length;
                                          const isBold = depth <= 1;
                                          return (
                                             <tr key={idx} className={isBold ? 'bold-row' : ''}>
                                                <td>{item.selchkNo}</td>
                                                <td>{isBold ? item.selchkNm : item.selchkContent || item.selchkNm}</td>
                                                <td style={{textAlign:'center'}}>{item.beforeResult || ''}</td>
                                                <td style={{textAlign:'center'}}>{item.currentResult || ''}</td>
                                             </tr>
                                          );
                                       })}
                                    </tbody>
                                 </table>
                              </div>
                           ))}
                        </div>

                        {/* 화면 표시 영역 (현재 페이지만) */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                           {/* 제목 */}
                           <div className="bg-white py-4 text-center border-b border-gray-300">
                              <h2 className="text-lg md:text-xl font-black text-[#202124]">승강기 자체점검결과({displayYm}월)</h2>
                           </div>

                           {/* 기본정보 (첫 페이지만) */}
                           {currentPage === 1 && (
                              <div className="p-4">
                                 <p className="text-xs font-bold text-gray-700 mb-2">□ 기본정보</p>
                                 <table className="w-full text-xs border-collapse">
                                    <tbody>
                                       <tr>
                                          <td className="bg-gray-100 border border-gray-300 p-2 font-bold w-[15%]">건물정보</td>
                                          <td className="border border-gray-300 p-2" colSpan={3}>{data.buldNm}{data.address ? ` (${data.address})` : ''}</td>
                                       </tr>
                                       <tr>
                                          <td className="bg-gray-100 border border-gray-300 p-2 font-bold">승강기고유번호</td>
                                          <td className="border border-gray-300 p-2 w-[35%]">{data.elevatorNo}</td>
                                          <td className="bg-gray-100 border border-gray-300 p-2 font-bold w-[15%]">호기(설치장소)</td>
                                          <td className="border border-gray-300 p-2">{data.installationPlace || '-'}</td>
                                       </tr>
                                       <tr>
                                          <td className="bg-gray-100 border border-gray-300 p-2 font-bold">승강기종류</td>
                                          <td className="border border-gray-300 p-2">{data.elvtrKindNm || '-'}</td>
                                          <td className="bg-gray-100 border border-gray-300 p-2 font-bold">승강기모델</td>
                                          <td className="border border-gray-300 p-2">{data.elvtrModel || '-'}</td>
                                       </tr>
                                       <tr>
                                          <td className="bg-gray-100 border border-gray-300 p-2 font-bold">점검일시</td>
                                          <td className="border border-gray-300 p-2" colSpan={3}>{checkDateFormatted}{registDtFormatted ? ` (전산등록일: ${registDtFormatted})` : ''}</td>
                                       </tr>
                                       <tr>
                                          <td className="bg-gray-100 border border-gray-300 p-2 font-bold">점검자</td>
                                          <td className="border border-gray-300 p-2" colSpan={3}>{data.companyNm}{data.inspectors ? ` ${data.inspectors}` : ''}</td>
                                       </tr>
                                    </tbody>
                                 </table>
                              </div>
                           )}

                           {/* 점검항목 테이블 */}
                           <div className="p-4">
                              {currentPage === 1 && (
                                 <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-700">□ 점검항목별 자체점검결과</p>
                                    <p className="text-[10px] text-gray-500">* 점검결과 : A-양호, B-주의관찰, C-긴급수리, 제외-점검주기 아님</p>
                                 </div>
                              )}
                              <div className="overflow-x-auto">
                                 <table className="w-full text-xs border-collapse min-w-[600px]">
                                    <thead>
                                       <tr className="bg-[#e8f0fe]">
                                          <th className="border border-gray-300 p-2 text-center w-[12%]" rowSpan={2}>점검항목</th>
                                          <th className="border border-gray-300 p-2 text-center" rowSpan={2}>점검내용</th>
                                          <th className="border border-gray-300 p-2 text-center w-[16%]" colSpan={2}>점검결과</th>
                                       </tr>
                                       <tr className="bg-[#e8f0fe]">
                                          <th className="border border-gray-300 p-1.5 text-center w-[8%]">직전</th>
                                          <th className="border border-gray-300 p-1.5 text-center w-[8%]">당월</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {(pages[currentPage - 1] || []).map((item, idx) => {
                                          const depth = (item.selchkNo.match(/\./g) || []).length;
                                          const isBold = depth <= 1;
                                          return (
                                             <tr key={idx} className={isBold ? 'bg-[#fafafa]' : ''}>
                                                <td className={`border border-gray-300 p-1.5 ${isBold ? 'font-bold' : ''}`}>{item.selchkNo}</td>
                                                <td className={`border border-gray-300 p-1.5 ${isBold ? 'font-bold' : ''}`}>
                                                   {isBold ? item.selchkNm : (item.selchkContent || item.selchkNm)}
                                                </td>
                                                <td className="border border-gray-300 p-1.5 text-center">{item.beforeResult || ''}</td>
                                                <td className="border border-gray-300 p-1.5 text-center">{item.currentResult || ''}</td>
                                             </tr>
                                          );
                                       })}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        </div>

                        {/* 페이지네이션 하단 */}
                        {totalPages > 1 && (
                           <div className="flex items-center justify-center gap-2 mt-4">
                              <button onClick={() => setSelfCheckReportPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                                 className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                 <ChevronLeft size={16}/>
                              </button>
                              <span className="text-xs text-gray-600 font-bold">{currentPage} / {totalPages} 페이지</span>
                              <button onClick={() => setSelfCheckReportPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                                 className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                 <ChevronRight size={16}/>
                              </button>
                           </div>
                        )}
                     </div>
                  );
               })()}
            </div>
         </Modal>
      )}

      {isAddLogOpen && (
         <Modal onClose={() => setIsAddLogOpen(false)} disableOverlayClick={true}>
            <div className="p-10 space-y-8">
               <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="font-black text-2xl text-[#202124] flex items-center gap-3"><ClipboardCheck size={24} className="text-[#1a73e8]"/> 시설 유지보수 기록 상세 등록</h3>
                  <button onClick={() => setIsAddLogOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                    <label className="text-[11px] font-black text-[#5f6368] mb-2 block uppercase tracking-widest">점검 및 수리 제목 <span className="text-red-500">*</span></label>
                    <input className="w-full border border-[#dadce0] p-4 rounded-xl focus:ring-4 focus:ring-[#e8f0fe] font-black text-lg" value={logForm.title} onChange={e => setLogForm({...logForm, title: e.target.value})} placeholder="예: 메인 승강기 부품 노후로 인한 와이어 교체"/>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-[#5f6368] mb-2 block uppercase tracking-widest">발생 비용 (VAT 포함) <span className="text-red-500">*</span></label>
                    <input className="w-full border border-[#dadce0] p-4 rounded-xl font-black text-[#ea4335]" value={formatMoneyInput(logForm.cost || 0)} onChange={e => setLogForm({...logForm, cost: parseMoneyInput(e.target.value)})}/>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-[#5f6368] mb-2 block uppercase tracking-widest">실시 일자 <span className="text-red-500">*</span></label>
                    <input type="date" className="w-full border border-[#dadce0] p-4 rounded-xl font-black" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})}/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-black text-[#5f6368] mb-2 block uppercase tracking-widest">점검 결과 상세 내용</label>
                    <textarea className="w-full border border-[#dadce0] p-5 rounded-xl font-bold h-32 resize-none" value={logForm.description} onChange={e => setLogForm({...logForm, description: e.target.value})} placeholder="작업 상세 내역, 부품 사양, 향후 점검 시 고려사항 등을 입력해 주세요."></textarea>
                  </div>
               </div>
               <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
                  <button onClick={() => setIsAddLogOpen(false)} className="px-8 py-4 text-sm font-black text-[#5f6368] hover:bg-gray-100 rounded-xl transition-colors">취소</button>
                  <button onClick={handleSaveLog} className="px-14 py-4 bg-[#1a73e8] text-white font-black rounded-xl shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">이력 저장 완료</button>
               </div>
            </div>
         </Modal>
      )}

    </div>
  );
};
