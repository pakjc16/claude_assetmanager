
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Building2, Menu, Bell, Users, FileText, Wallet, Settings, ChevronDown, TrendingUp, Wrench, ArrowRight, X, Ruler, Coins, Search, MapPin, Key } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { PropertyManager } from './components/PropertyManager';
import { StakeholderManager } from './components/StakeholderManager';
import { ContractManager } from './components/ContractManager';
import { FinanceManager } from './components/FinanceManager';
import { ValuationManager } from './components/ValuationManager';
import { FacilityManager } from './components/FacilityManager';
import { Property, Unit, Stakeholder, LeaseContract, MaintenanceContract, UtilityContract, PaymentTransaction, DashboardFinancials, Building, Lot, ValuationHistory, MarketComparable, MoneyUnit, AreaUnit, Facility, FacilityLog } from './types';

// ==========================================
// STRICT FORMATTING UTILS
// ==========================================
// 일반 숫자 포맷: 세자리 콤마, 소수점 0이면 생략, 아니면 1자리까지
export const formatNumberInput = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '';
  const decimal = num % 1;
  if (decimal === 0) {
    return Math.floor(num).toLocaleString('ko-KR');
  }
  return num.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

export const parseNumberInput = (str: string): number => {
  return Number(str.replace(/,/g, '')) || 0;
};

// 숫자 포맷 헬퍼: 세자리 콤마 + 소수점 처리
const formatWithComma = (num: number, maxDecimals: number = 1): string => {
  const decimal = num % 1;
  if (decimal === 0 || maxDecimals === 0) {
    return Math.floor(num).toLocaleString('ko-KR');
  }
  return num.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
};

// ==========================================
// APP SETTINGS TYPE
// ==========================================
export type AddressApiType = 'DAUM' | 'VWORLD';

export interface AppSettings {
  addressApi: AddressApiType;
  vworldApiKey: string;
  dataGoKrApiKey: string;  // 공공데이터포털 API 키 (건축물대장 등)
}

const DEFAULT_SETTINGS: AppSettings = {
  addressApi: 'VWORLD',
  vworldApiKey: '',
  dataGoKrApiKey: ''  // 공공데이터포털 API 키
};

// localStorage에서 설정 불러오기
const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('realtyflow_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('설정 불러오기 실패:', e);
  }
  return DEFAULT_SETTINGS;
};

// localStorage에 설정 저장
const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem('realtyflow_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('설정 저장 실패:', e);
  }
};

// ==========================================
// COMPREHENSIVE DUMMY DATA (Full Snapshot)
// ==========================================
const INIT_STAKEHOLDERS: Stakeholder[] = [
  { id: 'sh1', name: '(주)미래전자', type: 'CORPORATE', roles: ['TENANT'], registrationNumber: '110-81-00001', representative: '이건희', contact: { phone: '02-1234-5678', email: 'biz@mirae.com' } },
  { id: 'sh10', name: '(주)리얼티프로', type: 'CORPORATE', roles: ['MANAGER'], registrationNumber: '110-86-00001', representative: '박관리', contact: { phone: '02-777-8888', email: 'pm@realty.com' } },
  { id: 'sh20', name: '오티스엘리베이터', type: 'CORPORATE', roles: ['VENDOR'], registrationNumber: '113-81-12345', contact: { phone: '1577-0603', email: 'service@otis.com' } },
  { id: 'sh30', name: '현대캡스', type: 'CORPORATE', roles: ['VENDOR'], registrationNumber: '211-81-99999', contact: { phone: '1588-0000', email: 'sec@caps.com' } },
];

const BLDG_P1: Building = {
  id: 'b1', propertyId: 'p1', name: '시그니처 타워 A동',
  spec: {
    buildingArea: 850.5, grossFloorArea: 12000.2, floorCount: { underground: 5, ground: 25 },
    completionDate: '2020-03-20', mainUsage: '업무시설', parkingCapacity: 250, elevatorCount: 12,
    floors: Array.from({length: 25}, (_, i) => ({ floorNumber: i+1, area: 480.0, usage: '업무시설' }))
  }
};

const INIT_PROPERTIES: Property[] = [
  { id: 'p1', type: 'LAND_AND_BUILDING', name: '강남 시그니처 센터', masterAddress: { sido: '서울특별시', sigungu: '강남구', eupMyeonDong: '역삼동', bonbun: '100', bubun: '1' }, roadAddress: '서울특별시 강남구 테헤란로 123', lots: [{ id: 'l1', address: { sido: '서울특별시', sigungu: '강남구', eupMyeonDong: '역삼동', bonbun: '100', bubun: '1' }, jimok: '대', area: 1800.4 }], buildings: [BLDG_P1], totalLandArea: 1800.4, managerId: 'sh10' }
];

const INIT_UNITS: Unit[] = [
  { id: 'u1', propertyId: 'p1', buildingId: 'b1', unitNumber: '101', floor: 1, area: 320.5, usage: '카페/근생', status: 'OCCUPIED' },
  { id: 'u2', propertyId: 'p1', buildingId: 'b1', unitNumber: '1501', floor: 15, area: 480.0, usage: '오피스', status: 'OCCUPIED' },
  { id: 'u3', propertyId: 'p1', buildingId: 'b1', unitNumber: '2001', floor: 20, area: 480.0, usage: '오피스', status: 'VACANT' }
];

const INIT_LEASE_CONTRACTS: LeaseContract[] = [
  { id: 'lc1', type: 'LEASE_OUT', targetType: 'UNIT', targetId: 'u1', tenantId: 'sh1', status: 'ACTIVE', term: { contractDate: '2023-01-01', startDate: '2023-02-01', endDate: '2025-01-31', extensionType: 'NEW' }, financialTerms: [{ id: 'ft1', startDate: '2023-02-01', endDate: '2025-01-31', deposit: 100000000, monthlyRent: 8500000, adminFee: 1200000, vatIncluded: true, paymentDay: 5, paymentType: 'PREPAID', managementItems: ['CLEANING', 'SECURITY'] }], conditions: [] },
  { id: 'lc2', type: 'LEASE_OUT', targetType: 'UNIT', targetId: 'u2', tenantId: 'sh1', status: 'ACTIVE', term: { contractDate: '2024-03-01', startDate: '2024-04-01', endDate: '2026-03-31', extensionType: 'NEW' }, financialTerms: [{ id: 'ft2', startDate: '2024-04-01', endDate: '2026-03-31', deposit: 500000000, monthlyRent: 25000000, adminFee: 3500000, vatIncluded: true, paymentDay: 1, paymentType: 'PREPAID', managementItems: ['ELEVATOR'] }], conditions: [] }
];

const INIT_FACILITIES: Facility[] = [
  { id: 'f1', propertyId: 'p1', buildingId: 'b1', category: 'ELEVATOR', name: '메인 고속 승강기 1호기', status: 'OPERATIONAL', installationDate: '2020-03-20', initialCost: 250000000, inspectionCycle: 1, lastInspectionDate: '2024-05-15', nextInspectionDate: '2024-06-15', spec: { model: 'OTIS-ULTRA' }, safetyOfficerId: 'sh10', vendorId: 'sh20' },
  { id: 'f2', propertyId: 'p1', buildingId: 'b1', unitId: 'u1', category: 'HVAC', name: '101호 전용 실외기 세트', status: 'INSPECTION_DUE', installationDate: '2023-02-01', initialCost: 15000000, inspectionCycle: 12, lastInspectionDate: '2023-02-01', nextInspectionDate: '2024-02-01', spec: { model: 'LG-MULTI-V' }, safetyOfficerId: 'sh10', vendorId: 'sh30' }
];

const INIT_VALUATIONS: ValuationHistory[] = [
  { id: 'v1', targetId: 'l1', targetType: 'LOT', year: 2022, officialValue: 45000000, marketValue: 55000000, note: '공시지가 상승분 반영' },
  { id: 'v2', targetId: 'l1', targetType: 'LOT', year: 2023, officialValue: 48000000, marketValue: 60000000, note: '주변 개발 호재' },
  { id: 'v3', targetId: 'l1', targetType: 'LOT', year: 2024, officialValue: 52000000, marketValue: 68000000, note: '최신 공시지가 반영' },
  { id: 'v4', targetId: 'b1', targetType: 'BUILDING', year: 2022, officialValue: 12000000000, marketValue: 15000000000, note: '건물 시가표준액' },
  { id: 'v5', targetId: 'b1', targetType: 'BUILDING', year: 2023, officialValue: 12500000000, marketValue: 16500000000, note: '리모델링 효과 반영' },
  { id: 'v6', targetId: 'b1', targetType: 'BUILDING', year: 2024, officialValue: 13200000000, marketValue: 18000000000, note: '최신 감정가 기준' },
];

const INIT_COMPARABLES: MarketComparable[] = [
  { id: 'c1', propertyId: 'p1', name: '강남 타워 (인근)', address: '서울특별시 강남구 역삼동 101', date: '2024-05-10', deposit: 100000000, monthlyRent: 10000000, adminFee: 1500000, area: 400, floor: 10, distance: 150, note: '역세권 대형 오피스' },
  { id: 'c2', propertyId: 'p1', name: '테헤란 스퀘어', address: '서울특별시 강남구 역삼동 105', date: '2024-04-20', deposit: 200000000, monthlyRent: 12000000, adminFee: 1800000, area: 450, floor: 5, distance: 300, note: '최신 리모델링 완료' },
];

const INIT_MAINTENANCE_CONTRACTS: MaintenanceContract[] = [
  { id: 'mc1', targetType: 'PROPERTY', targetId: 'p1', vendorId: 'sh20', facilityId: 'f1', serviceType: 'ELEVATOR', status: 'ACTIVE', isRecurring: true, paymentDay: 25, term: { startDate: '2024-01-01', endDate: '2024-12-31' }, monthlyCost: 1200000, details: '매월 1회 정기점검 및 긴급출동 포함' }
];

const INIT_TRANSACTIONS: PaymentTransaction[] = [
  { id: 'tx1', contractId: 'lc1', contractType: 'LEASE', targetMonth: '2024-06', type: 'RENT', amount: 8500000, dueDate: '2024-06-05', status: 'PAID', paidDate: '2024-06-04', taxInvoiceIssued: true },
  { id: 'tx2', contractId: 'lc2', contractType: 'LEASE', targetMonth: '2024-06', type: 'RENT', amount: 25000000, dueDate: '2024-06-01', status: 'UNPAID', taxInvoiceIssued: true },
  { id: 'tx_exp1', contractId: 'mc1', contractType: 'MAINTENANCE', targetMonth: '2024-05', type: 'MAINTENANCE_COST', amount: -1200000, dueDate: '2024-05-25', status: 'PAID', taxInvoiceIssued: true },
];

function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [currencyUnit, setCurrencyUnit] = useState<MoneyUnit>('WON');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('M2');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);

  // 설정 변경 시 localStorage에 저장
  useEffect(() => {
    saveSettings(appSettings);
  }, [appSettings]);

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(INIT_STAKEHOLDERS);
  const [properties, setProperties] = useState<Property[]>(INIT_PROPERTIES);
  const [units, setUnits] = useState<Unit[]>(INIT_UNITS);
  const [leaseContracts, setLeaseContracts] = useState<LeaseContract[]>(INIT_LEASE_CONTRACTS);
  const [maintenanceContracts, setMaintenanceContracts] = useState<MaintenanceContract[]>(INIT_MAINTENANCE_CONTRACTS);
  const [utilityContracts, setUtilityContracts] = useState<UtilityContract[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(INIT_TRANSACTIONS);
  const [valuations, setValuations] = useState<ValuationHistory[]>(INIT_VALUATIONS);
  const [facilities, setFacilities] = useState<Facility[]>(INIT_FACILITIES);
  const [facilityLogs, setFacilityLogs] = useState<FacilityLog[]>([]);
  const [comparables, setComparables] = useState<MarketComparable[]>(INIT_COMPARABLES);

  // Formatting Logic
  // 금액 포맷: 원/만원은 소수점 없음, 억원은 소수점 2자리까지
  const formatMoney = (amount: number) => {
    let value = amount;
    let suffix = '원';
    let decimals = 0;

    if (currencyUnit === 'MAN') {
      value = amount / 10000;
      suffix = '만원';
      decimals = 0;
    } else if (currencyUnit === 'EOK') {
      value = amount / 100000000;
      suffix = '억원';
      decimals = 2; // 억원 단위에서만 소수점 2자리
    }

    return formatWithComma(value, decimals) + suffix;
  };

  // 면적 포맷: 세자리 콤마, 소수점 0이면 생략, 아니면 1자리까지
  const formatArea = (area: number) => {
    let value = area;
    let suffix = '㎡';
    if (areaUnit === 'PYEONG') {
      value = area * 0.3025;
      suffix = '평';
    }
    return formatWithComma(value, 1) + suffix;
  };

  const financials: DashboardFinancials = useMemo(() => {
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const collected = transactions.filter(t => t.amount > 0 && t.status === 'PAID').reduce((sum, t) => sum + t.amount, 0);
    return {
      totalRevenue: income, totalExpense: expense, netIncome: income - expense, 
      collectedAmount: collected, overdueAmount: income - collected, 
      collectionRate: income > 0 ? (collected / income) * 100 : 0,
      monthlyHistory: [
          { month: '2024-01', income: 30000000, expense: 5000000 },
          { month: '2024-02', income: 32000000, expense: 5200000 },
          { month: '2024-03', income: 31000000, expense: 4800000 },
          { month: '2024-04', income: 33500000, expense: 6000000 },
          { month: '2024-05', income: 33500000, expense: 5500000 },
          { month: '2024-06', income: 33500000, expense: 5800000 },
      ]
    };
  }, [transactions]);

  const menuItems = [
    { id: 'DASHBOARD', label: '대시보드', icon: <LayoutDashboard size={20}/> },
    { id: 'PROPERTY', label: '자산 관리', icon: <Building2 size={20}/> },
    { id: 'FACILITY', label: '시설 관리', icon: <Wrench size={20}/> },
    { id: 'CONTRACT', label: '계약 관리', icon: <FileText size={20}/> },
    { id: 'STAKEHOLDER', label: '인물/업체', icon: <Users size={20}/> },
    { id: 'FINANCE', label: '납입/청구', icon: <Wallet size={20}/> },
    { id: 'VALUATION', label: '가치 평가', icon: <TrendingUp size={20}/> },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden border-t-4 border-[#1a73e8]">
      <aside className="w-64 border-r border-[#dadce0] flex-shrink-0 hidden md:flex flex-col bg-white">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a73e8] rounded-full flex items-center justify-center text-white shadow-md">
             <Building2 size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#3c4043]">RealtyFlow</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1 py-4">
           {menuItems.map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-3 rounded-full text-sm font-medium transition-all ${activeTab === item.id ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'}`}>
                {item.icon}
                {item.label}
             </button>
           ))}
        </nav>
        <div className="p-6 border-t border-[#dadce0]">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#fbbc05] rounded-full flex items-center justify-center text-white font-bold text-xs">AD</div>
              <div><p className="text-sm font-bold text-[#3c4043]">김관리 매니저</p><p className="text-[10px] text-[#5f6368] font-medium uppercase tracking-wider">Enterprise Plan</p></div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
         <header className="bg-white border-b border-[#dadce0] flex flex-col flex-shrink-0 z-10">
            <div className="h-16 flex items-center justify-between px-10">
               <h2 className="text-xl font-medium text-[#3c4043]">{menuItems.find(m => m.id === activeTab)?.label}</h2>
               <div className="flex items-center gap-6">
                  <div className="relative group w-96 hidden lg:block">
                     <Search size={18} className="absolute left-3 top-2.5 text-[#5f6368]"/>
                     <input type="text" placeholder="통합 검색" className="w-full bg-[#f1f3f4] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-[#1a73e8] outline-none transition-all"/>
                  </div>
                  <button className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-all relative"><Bell size={20}/><span className="absolute top-2 right-2 w-2 h-2 bg-[#ea4335] rounded-full border-2 border-white"></span></button>
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-all"><Settings size={20}/></button>
               </div>
            </div>
            
            <div className="h-14 bg-white flex items-center px-10 justify-end gap-10 border-t border-[#dadce0]">
               <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-widest flex items-center gap-2"><Ruler size={14} className="text-[#1a73e8]"/> 면적</span>
                  <div className="flex bg-[#f1f3f4] rounded-lg p-0.5 border border-[#dadce0]">
                     <button onClick={() => setAreaUnit('M2')} className={`px-5 py-1 text-xs font-bold rounded-md transition-all ${areaUnit === 'M2' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368]'}`}>㎡</button>
                     <button onClick={() => setAreaUnit('PYEONG')} className={`px-5 py-1 text-xs font-bold rounded-md transition-all ${areaUnit === 'PYEONG' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368]'}`}>평</button>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-widest flex items-center gap-2"><Coins size={14} className="text-[#34a853]"/> 금액</span>
                  <div className="flex bg-[#f1f3f4] rounded-lg p-0.5 border border-[#dadce0]">
                     <button onClick={() => setCurrencyUnit('WON')} className={`px-5 py-1 text-xs font-bold rounded-md transition-all ${currencyUnit === 'WON' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368]'}`}>원</button>
                     <button onClick={() => setCurrencyUnit('MAN')} className={`px-5 py-1 text-xs font-bold rounded-md transition-all ${currencyUnit === 'MAN' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368]'}`}>만원</button>
                     <button onClick={() => setCurrencyUnit('EOK')} className={`px-5 py-1 text-xs font-bold rounded-md transition-all ${currencyUnit === 'EOK' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368]'}`}>억원</button>
                  </div>
               </div>
            </div>
         </header>
         
         <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar">
            <div className="max-w-[1500px] mx-auto">
               {activeTab === 'DASHBOARD' && <Dashboard financials={financials} properties={properties} contracts={leaseContracts} units={units} valuations={valuations} facilities={facilities} transactions={transactions} stakeholders={stakeholders} formatMoney={formatMoney} />}
               {activeTab === 'PROPERTY' && (
                  <PropertyManager
                    properties={properties} units={units} facilities={facilities}
                    onAddProperty={p => setProperties(prev => [...prev, p])} onUpdateProperty={p => setProperties(prev => prev.map(pr => pr.id === p.id ? p : pr))} onUpdateBuilding={() => {}}
                    onAddUnit={u => setUnits(prev => [...prev, u])} onUpdateUnit={u => setUnits(prev => prev.map(un => un.id === u.id ? u : un))}
                    formatArea={formatArea} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatMoney} parseMoneyInput={parseNumberInput} moneyLabel={currencyUnit === 'WON' ? '원' : currencyUnit === 'MAN' ? '만원' : '억원'}
                    appSettings={appSettings}
                  />
               )}
               {activeTab === 'FACILITY' && (
                  <FacilityManager 
                    facilities={facilities} facilityLogs={facilityLogs} properties={properties} units={units} stakeholders={stakeholders} maintenanceContracts={maintenanceContracts}
                    onAddFacility={f => setFacilities(prev => [...prev, f])} onUpdateFacility={f => setFacilities(prev => prev.map(fa => fa.id === f.id ? f : fa))} onDeleteFacility={id => setFacilities(prev => prev.filter(f => f.id !== id))}
                    onAddLog={l => setFacilityLogs(prev => [...prev, l])} onDeleteLog={id => setFacilityLogs(prev => prev.filter(l => l.id !== id))}
                    /* Fixed duplicate attributes error by renaming repeated parseNumberInput to parseMoneyInput */
                    formatMoney={formatMoney} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatNumberInput} parseMoneyInput={parseNumberInput} moneyLabel={currencyUnit === 'WON' ? '원' : currencyUnit === 'MAN' ? '만원' : '억원'}
                  />
               )}
               {activeTab === 'CONTRACT' && (
                  <ContractManager 
                    leaseContracts={leaseContracts} maintenanceContracts={maintenanceContracts} utilityContracts={utilityContracts} stakeholders={stakeholders} properties={properties} units={units} facilities={facilities}
                    onAddLease={c => setLeaseContracts(prev => [...prev, c])} onUpdateLease={c => setLeaseContracts(prev => prev.map(co => co.id === c.id ? c : co))}
                    onAddMaintenance={c => setMaintenanceContracts(prev => [...prev, c])} onUpdateMaintenance={c => setMaintenanceContracts(prev => prev.map(co => co.id === c.id ? c : co))}
                    onAddUtility={c => setUtilityContracts(prev => [...prev, c])} onUpdateUtility={c => setUtilityContracts(prev => prev.map(co => co.id === c.id ? c : co))}
                    /* Fixed duplicate attributes error by renaming repeated parseNumberInput to parseMoneyInput */
                    formatMoney={formatMoney} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatNumberInput} parseMoneyInput={parseNumberInput} moneyLabel={currencyUnit === 'WON' ? '원' : currencyUnit === 'MAN' ? '만원' : '억원'}
                  />
               )}
               {activeTab === 'FINANCE' && (
                  <FinanceManager 
                    transactions={transactions} contracts={leaseContracts} utilityContracts={utilityContracts} maintenanceContracts={maintenanceContracts} stakeholders={stakeholders} units={units} properties={properties}
                    onUpdateStatus={(id, status) => setTransactions(prev => prev.map(t => t.id === id ? {...t, status} : t))}
                    onUpdateTransaction={tx => setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t))}
                    onGenerateBills={txs => setTransactions(prev => [...prev, ...txs])}
                    /* Fixed duplicate attributes error by renaming repeated parseNumberInput to parseMoneyInput */
                    formatMoney={formatMoney} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatNumberInput} parseMoneyInput={parseNumberInput}
                  />
               )}
               {activeTab === 'STAKEHOLDER' && <StakeholderManager stakeholders={stakeholders} onAddStakeholder={s => setStakeholders(prev => [...prev, s])} onUpdateStakeholder={s => setStakeholders(prev => prev.map(sh => sh.id === s.id ? s : sh))} leaseContracts={leaseContracts} maintenanceContracts={maintenanceContracts} formatMoney={formatMoney} />}
               {activeTab === 'VALUATION' && (
                 /* Fixed duplicate attributes error by renaming repeated parseNumberInput to parseMoneyInput */
                 <ValuationManager properties={properties} valuations={valuations} comparables={comparables} onAddValuation={v => setValuations(prev => [...prev, v])} onUpdateValuation={v => setValuations(prev => prev.map(va => va.id === v.id ? v : va))} onDeleteValuation={id => setValuations(prev => prev.filter(v => v.id !== id))} onAddComparable={c => setComparables(prev => [...prev, c])} formatMoney={formatMoney} formatArea={formatArea} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatNumberInput} parseMoneyInput={parseNumberInput} moneyLabel={currencyUnit === 'WON' ? '원' : currencyUnit === 'MAN' ? '만원' : '억원'} areaUnit={areaUnit} />
               )}
            </div>
         </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
            <div className="p-6 border-b border-[#dadce0] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#202124] flex items-center gap-3">
                <Settings size={24} className="text-[#1a73e8]" />
                환경설정
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors">
                <X size={20} className="text-[#5f6368]" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 주소 검색 API 설정 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-[#1a73e8]" />
                  <h4 className="font-bold text-[#3c4043]">주소 검색 API</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAppSettings(prev => ({ ...prev, addressApi: 'DAUM' }))}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      appSettings.addressApi === 'DAUM'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]'
                        : 'border-[#dadce0] hover:border-[#1a73e8]'
                    }`}
                  >
                    <p className="font-bold text-[#202124]">다음 우편번호</p>
                    <p className="text-xs text-[#5f6368] mt-1">Kakao 제공, API 키 불필요</p>
                  </button>
                  <button
                    onClick={() => setAppSettings(prev => ({ ...prev, addressApi: 'VWORLD' }))}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      appSettings.addressApi === 'VWORLD'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]'
                        : 'border-[#dadce0] hover:border-[#1a73e8]'
                    }`}
                  >
                    <p className="font-bold text-[#202124]">VWorld API</p>
                    <p className="text-xs text-[#5f6368] mt-1">국토교통부, API 키 필요</p>
                  </button>
                </div>

                {/* VWorld API Key 입력 */}
                {appSettings.addressApi === 'VWORLD' && (
                  <div className="space-y-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#dadce0]">
                    <label className="flex items-center gap-2 text-sm font-bold text-[#3c4043]">
                      <Key size={14} />
                      VWorld API Key
                    </label>
                    <input
                      type="text"
                      value={appSettings.vworldApiKey}
                      onChange={(e) => setAppSettings(prev => ({ ...prev, vworldApiKey: e.target.value }))}
                      placeholder="API 키를 입력하세요"
                      className="w-full border border-[#dadce0] p-3 rounded-lg text-sm focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] outline-none"
                    />
                    <p className="text-xs text-[#5f6368]">
                      <a href="https://www.vworld.kr/dev/v4dv_search2_s001.do" target="_blank" rel="noopener noreferrer" className="text-[#1a73e8] hover:underline">
                        VWorld 개발자센터
                      </a>에서 API 키를 발급받으세요.
                    </p>
                    {appSettings.addressApi === 'VWORLD' && !appSettings.vworldApiKey && (
                      <p className="text-xs text-[#ea4335] font-medium">⚠️ API 키가 없으면 주소 검색이 작동하지 않습니다.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 공공데이터포털 API 설정 (건축물대장) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-[#34a853]" />
                  <h4 className="font-bold text-[#3c4043]">건축물대장 API</h4>
                </div>
                <div className="space-y-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#dadce0]">
                  <label className="flex items-center gap-2 text-sm font-bold text-[#3c4043]">
                    <Key size={14} />
                    공공데이터포털 API Key
                  </label>
                  <input
                    type="text"
                    value={appSettings.dataGoKrApiKey}
                    onChange={(e) => setAppSettings(prev => ({ ...prev, dataGoKrApiKey: e.target.value }))}
                    placeholder="공공데이터포털 API 키를 입력하세요"
                    className="w-full border border-[#dadce0] p-3 rounded-lg text-sm focus:ring-2 focus:ring-[#34a853] focus:border-[#34a853] outline-none"
                  />
                  <p className="text-xs text-[#5f6368]">
                    <a href="https://www.data.go.kr/data/15044713/openapi.do" target="_blank" rel="noopener noreferrer" className="text-[#34a853] hover:underline">
                      공공데이터포털
                    </a>에서 "건축물대장정보 서비스" API 키를 발급받으세요.
                  </p>
                  <div className="mt-2 p-3 bg-white rounded-lg border border-[#dadce0]">
                    <p className="text-xs font-bold text-[#3c4043] mb-1">연동 예정 기능:</p>
                    <ul className="text-xs text-[#5f6368] space-y-1">
                      <li>• 건물 표제부 자동 입력 (동별 건물정보)</li>
                      <li>• 층별 정보 자동 입력</li>
                    </ul>
                  </div>
                  {!appSettings.dataGoKrApiKey && (
                    <p className="text-xs text-[#fbbc05] font-medium">⚠️ API 키가 없으면 건물정보 자동 조회가 작동하지 않습니다.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#dadce0] flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2.5 bg-[#1a73e8] text-white font-bold rounded-lg hover:bg-[#1557b0] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default App;
