
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Building2, Menu, Bell, Users, FileText, Wallet, Settings, ChevronDown, TrendingUp, Wrench, ArrowRight, X, Ruler, Coins, MapPin, Key, Calendar, ParkingSquare, LogOut, Plus, Edit2, UserCheck, UserX, Shield, Eye, EyeOff, Upload, Trash2 } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { PropertyManager } from './components/PropertyManager';
import { StakeholderManager } from './components/StakeholderManager';
import { ContractManager } from './components/ContractManager';
import { FinanceManager } from './components/FinanceManager';
import { ValuationManager } from './components/ValuationManager';
import { FacilityManager } from './components/FacilityManager';
import { ParkingManager } from './components/ParkingManager';
import { LoginPage } from './components/LoginPage';
import {
  Property, Unit, Stakeholder, LeaseContract, MaintenanceContract, UtilityContract,
  PaymentTransaction, DashboardFinancials, Building, Lot, ValuationHistory, MarketComparable,
  MoneyUnit, AreaUnit, Facility, FacilityLog,
  ElevatorInfo, ElevatorInsurance, ElevatorSafetyManager, ElevatorInspection,
  ElevatorMalfunction, ElevatorAccident, ElevatorPartDefect, ElevatorMaintenanceContract,
  FloorPlan, FloorZone, ParkingSpot, AppUser, CompanyInfo, UserRole
} from './types';

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
  kakaoMapApiKey: string;  // 카카오맵 JavaScript API 키 (로드뷰)
}

const DEFAULT_SETTINGS: AppSettings = {
  addressApi: 'VWORLD',
  vworldApiKey: '',
  dataGoKrApiKey: '',
  kakaoMapApiKey: '',
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
// 더미 데이터 (별도 파일)
// ==========================================
import {
  INIT_STAKEHOLDERS, INIT_PROPERTIES, INIT_UNITS, INIT_LEASE_CONTRACTS,
  INIT_MAINTENANCE_CONTRACTS, INIT_UTILITY_CONTRACTS, INIT_TRANSACTIONS,
  INIT_VALUATIONS, INIT_COMPARABLES, INIT_FACILITIES, INIT_FACILITY_LOGS
} from './dummyData';

function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [currencyUnit, setCurrencyUnit] = useState<MoneyUnit>('WON');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('M2');
  const [referenceDate, setReferenceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'api' | 'company' | 'users'>('api');
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);

  // 설정 변경 시 localStorage에 저장
  useEffect(() => {
    saveSettings(appSettings);
  }, [appSettings]);

  // ── 사용자 / 회사 정보 ──
  const [users, setUsers] = useState<AppUser[]>(() => {
    try { const s = localStorage.getItem('rf_users'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    try { const s = localStorage.getItem('rf_companyInfo'); return s ? JSON.parse(s) : { name: '' }; } catch { return { name: '' }; }
  });
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const uid = localStorage.getItem('rf_currentUserId');
      if (!uid) return null;
      const us: AppUser[] = JSON.parse(localStorage.getItem('rf_users') || '[]');
      return us.find(u => u.id === uid && u.isActive) || null;
    } catch { return null; }
  });

  // 사용자 관리 UI 상태 (설정 모달 내)
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({ username: '', name: '', email: '', password: '', confirmPw: '', role: 'MANAGER' as UserRole });
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', role: 'MANAGER' as UserRole });
  const [showNewUserPw, setShowNewUserPw] = useState(false);
  const [userFormError, setUserFormError] = useState('');

  // 회사정보 편집 폼
  const [editCompany, setEditCompany] = useState<CompanyInfo>(companyInfo);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── 사용자/회사 localStorage 동기화 ──
  useEffect(() => { try { localStorage.setItem('rf_users', JSON.stringify(users)); } catch {} }, [users]);
  useEffect(() => { try { localStorage.setItem('rf_companyInfo', JSON.stringify(companyInfo)); } catch {} }, [companyInfo]);

  // ── 인증 핸들러 ──
  const handleLogin = (user: AppUser) => {
    const updated = { ...user, lastLoginAt: new Date().toISOString() };
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    setCurrentUser(updated);
    localStorage.setItem('rf_currentUserId', user.id);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rf_currentUserId');
  };

  const handleSetup = (company: CompanyInfo, adminUser: AppUser) => {
    setCompanyInfo(company);
    setUsers([adminUser]);
    handleLogin(adminUser);
  };

  // 설정 모달 열 때 회사정보 폼 동기화
  const openSettings = (tab: 'api' | 'company' | 'users' = 'api') => {
    setEditCompany(companyInfo);
    setSettingsTab(tab);
    setShowAddUserForm(false);
    setEditingUserId(null);
    setUserFormError('');
    setIsSettingsOpen(true);
  };

  // ── 사용자 관리 핸들러 ──
  const AVATAR_COLORS = ['#1a73e8', '#34a853', '#ea4335', '#fbbc05', '#9c27b0', '#ff6f00', '#00acc1'];

  const handleAddUser = () => {
    setUserFormError('');
    if (!newUserForm.username.trim() || !newUserForm.name.trim()) {
      setUserFormError('아이디와 표시 이름을 입력하세요.'); return;
    }
    if (users.some(u => u.username === newUserForm.username.trim())) {
      setUserFormError('이미 사용 중인 아이디입니다.'); return;
    }
    if (newUserForm.password.length < 4) {
      setUserFormError('비밀번호는 최소 4자 이상이어야 합니다.'); return;
    }
    if (newUserForm.password !== newUserForm.confirmPw) {
      setUserFormError('비밀번호가 일치하지 않습니다.'); return;
    }
    const newUser: AppUser = {
      id: Date.now().toString(),
      username: newUserForm.username.trim(),
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim() || undefined,
      passwordHash: btoa(newUserForm.password),
      role: newUserForm.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
    };
    setUsers(prev => [...prev, newUser]);
    setNewUserForm({ username: '', name: '', email: '', password: '', confirmPw: '', role: 'MANAGER' });
    setShowAddUserForm(false);
    setUserFormError('');
  };

  const handleSaveEditUser = () => {
    setUserFormError('');
    if (!editUserForm.name.trim()) { setUserFormError('표시 이름을 입력하세요.'); return; }
    setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, name: editUserForm.name.trim(), email: editUserForm.email.trim() || undefined, role: editUserForm.role } : u));
    setEditingUserId(null);
  };

  const handleToggleUserActive = (userId: string) => {
    if (userId === currentUser?.id) { alert('현재 로그인된 계정은 비활성화할 수 없습니다.'); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
  };

  const handleResetPassword = (userId: string) => {
    if (!confirm('비밀번호를 "1234"로 초기화하시겠습니까?')) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, passwordHash: btoa('1234') } : u));
    alert('비밀번호가 1234로 초기화되었습니다.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setEditCompany(p => ({ ...p, logoBase64: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(INIT_STAKEHOLDERS);
  const [properties, setProperties] = useState<Property[]>(INIT_PROPERTIES);
  const [units, setUnits] = useState<Unit[]>(INIT_UNITS);
  const [leaseContracts, setLeaseContracts] = useState<LeaseContract[]>(INIT_LEASE_CONTRACTS);
  const [maintenanceContracts, setMaintenanceContracts] = useState<MaintenanceContract[]>(INIT_MAINTENANCE_CONTRACTS);
  const [utilityContracts, setUtilityContracts] = useState<UtilityContract[]>(INIT_UTILITY_CONTRACTS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(INIT_TRANSACTIONS);
  const [valuations, setValuations] = useState<ValuationHistory[]>(INIT_VALUATIONS);
  const [facilities, setFacilities] = useState<Facility[]>(INIT_FACILITIES);
  const [facilityLogs, setFacilityLogs] = useState<FacilityLog[]>(INIT_FACILITY_LOGS);
  // localStorage 동기화 헬퍼
  const loadLocal = <T,>(key: string, fallback: T): T => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
  };

  const [elevatorInsurances, setElevatorInsurances] = useState<ElevatorInsurance[]>(() => loadLocal('rf_elvInsurances', []));
  const [elevatorSafetyManagers, setElevatorSafetyManagers] = useState<ElevatorSafetyManager[]>(() => loadLocal('rf_elvSafetyMgrs', []));
  const [elevatorInspections, setElevatorInspections] = useState<ElevatorInspection[]>(() => loadLocal('rf_elvInspections', []));
  const [elevatorMalfunctions, setElevatorMalfunctions] = useState<ElevatorMalfunction[]>(() => loadLocal('rf_elvMalfunctions', []));
  const [elevatorAccidents, setElevatorAccidents] = useState<ElevatorAccident[]>(() => loadLocal('rf_elvAccidents', []));
  const [elevatorPartDefects, setElevatorPartDefects] = useState<ElevatorPartDefect[]>(() => loadLocal('rf_elvPartDefects', []));
  const [elevatorMaintenanceContracts, setElevatorMaintenanceContracts] = useState<ElevatorMaintenanceContract[]>(() => loadLocal('rf_elvMaintContracts', []));
  const [comparables, setComparables] = useState<MarketComparable[]>(INIT_COMPARABLES);

  // 도면 및 조닝 상태
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>(() => loadLocal('rf_floorPlans', []));
  const [floorZones, setFloorZones] = useState<FloorZone[]>(() => loadLocal('rf_floorZones', []));
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>(() => loadLocal('rf_parkingSpots', []));

  // 승강기 + 도면/조닝 데이터 localStorage 자동 저장
  useEffect(() => { try { localStorage.setItem('rf_elvInsurances', JSON.stringify(elevatorInsurances)); } catch {} }, [elevatorInsurances]);
  useEffect(() => { try { localStorage.setItem('rf_elvSafetyMgrs', JSON.stringify(elevatorSafetyManagers)); } catch {} }, [elevatorSafetyManagers]);
  useEffect(() => { try { localStorage.setItem('rf_elvInspections', JSON.stringify(elevatorInspections)); } catch {} }, [elevatorInspections]);
  useEffect(() => { try { localStorage.setItem('rf_elvMalfunctions', JSON.stringify(elevatorMalfunctions)); } catch {} }, [elevatorMalfunctions]);
  useEffect(() => { try { localStorage.setItem('rf_elvAccidents', JSON.stringify(elevatorAccidents)); } catch {} }, [elevatorAccidents]);
  useEffect(() => { try { localStorage.setItem('rf_elvPartDefects', JSON.stringify(elevatorPartDefects)); } catch {} }, [elevatorPartDefects]);
  useEffect(() => { try { localStorage.setItem('rf_elvMaintContracts', JSON.stringify(elevatorMaintenanceContracts)); } catch {} }, [elevatorMaintenanceContracts]);
  useEffect(() => { try { localStorage.setItem('rf_floorPlans', JSON.stringify(floorPlans)); } catch {} }, [floorPlans]);
  useEffect(() => { try { localStorage.setItem('rf_floorZones', JSON.stringify(floorZones)); } catch {} }, [floorZones]);
  useEffect(() => { try { localStorage.setItem('rf_parkingSpots', JSON.stringify(parkingSpots)); } catch {} }, [parkingSpots]);

  // Formatting Logic
  // 금액 포맷: 원/만원은 소수점 없음, 억원은 소수점 2자리까지
  const formatMoney = (amount: number) => {
    let value = amount;
    let suffix = '원';
    let decimals = 0;

    if (currencyUnit === 'THOUSAND') {
      value = amount / 1000;
      suffix = '천원';
      decimals = 0;
    } else if (currencyUnit === 'MAN') {
      value = amount / 10000;
      suffix = '만원';
      decimals = 0;
    } else if (currencyUnit === 'MILLION') {
      value = amount / 1000000;
      suffix = '백만원';
      decimals = 1;
    } else if (currencyUnit === 'EOK') {
      value = amount / 100000000;
      suffix = '억원';
      decimals = 2;
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

  // 단위 설정 드롭다운 상태
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'DASHBOARD', label: '대시보드', shortLabel: '홈', icon: <LayoutDashboard size={18}/> },
    { id: 'PROPERTY', label: '자산 관리', shortLabel: '자산', icon: <Building2 size={18}/> },
    { id: 'FACILITY', label: '시설 관리', shortLabel: '시설', icon: <Wrench size={18}/> },
    { id: 'CONTRACT', label: '계약 관리', shortLabel: '계약', icon: <FileText size={18}/> },
    { id: 'STAKEHOLDER', label: '인물/업체', shortLabel: '인물', icon: <Users size={18}/> },
    { id: 'FINANCE', label: '납입/청구', shortLabel: '청구', icon: <Wallet size={18}/> },
    { id: 'VALUATION', label: '가치 평가', shortLabel: '평가', icon: <TrendingUp size={18}/> },
    { id: 'PARKING', label: '주차 관리', shortLabel: '주차', icon: <ParkingSquare size={18}/> },
  ];

  // 로그인 안 된 경우 LoginPage 표시
  if (!currentUser) {
    return <LoginPage users={users} companyInfo={companyInfo} onLogin={handleLogin} onSetup={handleSetup} />;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* PC 사이드바 */}
      <aside className="w-56 border-r border-[#dadce0] flex-shrink-0 hidden lg:flex flex-col bg-white">
        <div className="p-4 flex items-center gap-2 border-b border-[#dadce0]">
          <div className="w-8 h-8 bg-[#1a73e8] rounded-lg flex items-center justify-center text-white">
             <Building2 size={18} />
          </div>
          <h1 className="text-lg font-bold text-[#3c4043]">RealtyFlow</h1>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
           {menuItems.map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'}`}>
                {item.icon}
                <span className="truncate">{item.label}</span>
             </button>
           ))}
        </nav>
        <div className="p-3 border-t border-[#dadce0] space-y-1">
           <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#f1f3f4] cursor-pointer" onClick={() => openSettings('api')}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: currentUser.avatarColor || '#1a73e8' }}>
                {currentUser.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#3c4043] truncate">{currentUser.name}</p>
                <p className="text-[10px] text-[#5f6368] truncate">{currentUser.role === 'ADMIN' ? '관리자' : currentUser.role === 'MANAGER' ? '담당자' : '열람'}</p>
              </div>
              <Settings size={14} className="text-[#5f6368]"/>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-[#5f6368] hover:bg-[#fce8e6] hover:text-[#ea4335] transition-colors">
              <LogOut size={13}/> 로그아웃
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
         {/* 컴팩트 헤더 */}
         <header className="bg-white border-b border-[#dadce0] flex-shrink-0 z-10">
            <div className="h-12 flex items-center justify-between px-3 md:px-6">
               {/* 모바일: 햄버거 + 로고 */}
               <div className="flex items-center gap-2">
                  <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg">
                     <Menu size={20}/>
                  </button>
                  <div className="lg:hidden flex items-center gap-2">
                     <div className="w-6 h-6 bg-[#1a73e8] rounded flex items-center justify-center text-white">
                        <Building2 size={14}/>
                     </div>
                     <span className="text-sm font-bold text-[#3c4043]">RealtyFlow</span>
                  </div>
                  <h2 className="hidden lg:block text-base font-medium text-[#3c4043]">{menuItems.find(m => m.id === activeTab)?.label}</h2>
               </div>

               {/* 우측 액션 */}
               <div className="flex items-center gap-1 md:gap-2">
                  {/* 단위 설정 드롭다운 */}
                  <div className="relative">
                     <button
                        onClick={() => setIsUnitMenuOpen(!isUnitMenuOpen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                           isUnitMenuOpen
                              ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#1a73e8]'
                              : 'bg-[#f1f3f4] text-[#3c4043] border-transparent hover:border-[#dadce0]'
                        }`}
                     >
                        <Calendar size={14} className="text-[#ea4335]"/>
                        <span className="hidden md:inline">{referenceDate.slice(5).replace('-', '/')}</span>
                        <span className="text-[#dadce0]">|</span>
                        <Ruler size={14} className="text-[#1a73e8]"/>
                        <span>{areaUnit === 'M2' ? '㎡' : '평'}</span>
                        <span className="text-[#dadce0]">|</span>
                        <Coins size={14} className="text-[#34a853]"/>
                        <span>{currencyUnit === 'WON' ? '원' : currencyUnit === 'THOUSAND' ? '천원' : currencyUnit === 'MAN' ? '만원' : currencyUnit === 'MILLION' ? '백만' : '억'}</span>
                        <ChevronDown size={12} className={`transition-transform ${isUnitMenuOpen ? 'rotate-180' : ''}`}/>
                     </button>
                     {isUnitMenuOpen && (
                        <>
                           <div className="fixed inset-0 z-40" onClick={() => setIsUnitMenuOpen(false)}/>
                           <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-[#dadce0] py-2 z-50">
                              <div className="px-3 py-1.5 text-[10px] font-bold text-[#5f6368] uppercase flex items-center gap-2">
                                 <Calendar size={12} className="text-[#ea4335]"/> 기준일자
                              </div>
                              <div className="px-3 py-1.5">
                                 <div className="flex items-center gap-1.5">
                                    <input
                                       type="date"
                                       value={referenceDate}
                                       onChange={e => setReferenceDate(e.target.value)}
                                       className="flex-1 border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-sm text-[#202124] font-bold focus:ring-2 focus:ring-[#1a73e8] outline-none"
                                    />
                                    <button
                                       onClick={() => setReferenceDate(new Date().toISOString().split('T')[0])}
                                       className="px-2 py-1.5 text-[10px] font-bold text-[#1a73e8] bg-[#e8f0fe] rounded-lg hover:bg-[#d2e3fc] whitespace-nowrap"
                                    >
                                       오늘
                                    </button>
                                 </div>
                              </div>
                              <div className="border-t border-[#dadce0] my-2"></div>
                              <div className="px-3 py-1.5 text-[10px] font-bold text-[#5f6368] uppercase flex items-center gap-2">
                                 <Ruler size={12} className="text-[#1a73e8]"/> 면적 단위
                              </div>
                              <button onClick={() => { setAreaUnit('M2'); setIsUnitMenuOpen(false); }} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#f1f3f4] flex items-center justify-between ${areaUnit === 'M2' ? 'text-[#1a73e8] font-bold bg-[#e8f0fe]' : 'text-[#3c4043]'}`}>
                                 ㎡ (제곱미터) {areaUnit === 'M2' && <span className="text-[#1a73e8]">✓</span>}
                              </button>
                              <button onClick={() => { setAreaUnit('PYEONG'); setIsUnitMenuOpen(false); }} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#f1f3f4] flex items-center justify-between ${areaUnit === 'PYEONG' ? 'text-[#1a73e8] font-bold bg-[#e8f0fe]' : 'text-[#3c4043]'}`}>
                                 평 {areaUnit === 'PYEONG' && <span className="text-[#1a73e8]">✓</span>}
                              </button>
                              <div className="border-t border-[#dadce0] my-2"></div>
                              <div className="px-3 py-1.5 text-[10px] font-bold text-[#5f6368] uppercase flex items-center gap-2">
                                 <Coins size={12} className="text-[#34a853]"/> 금액 단위
                              </div>
                              <button onClick={() => { setCurrencyUnit('WON'); setIsUnitMenuOpen(false); }} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#f1f3f4] flex items-center justify-between ${currencyUnit === 'WON' ? 'text-[#1a73e8] font-bold bg-[#e8f0fe]' : 'text-[#3c4043]'}`}>
                                 원 {currencyUnit === 'WON' && <span className="text-[#1a73e8]">✓</span>}
                              </button>
                              <button onClick={() => { setCurrencyUnit('THOUSAND'); setIsUnitMenuOpen(false); }} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#f1f3f4] flex items-center justify-between ${currencyUnit === 'THOUSAND' ? 'text-[#1a73e8] font-bold bg-[#e8f0fe]' : 'text-[#3c4043]'}`}>
                                 천원 {currencyUnit === 'THOUSAND' && <span className="text-[#1a73e8]">✓</span>}
                              </button>
                              <button onClick={() => { setCurrencyUnit('MAN'); setIsUnitMenuOpen(false); }} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#f1f3f4] flex items-center justify-between ${currencyUnit === 'MAN' ? 'text-[#1a73e8] font-bold bg-[#e8f0fe]' : 'text-[#3c4043]'}`}>
                                 만원 {currencyUnit === 'MAN' && <span className="text-[#1a73e8]">✓</span>}
                              </button>
                              <button onClick={() => { setCurrencyUnit('MILLION'); setIsUnitMenuOpen(false); }} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#f1f3f4] flex items-center justify-between ${currencyUnit === 'MILLION' ? 'text-[#1a73e8] font-bold bg-[#e8f0fe]' : 'text-[#3c4043]'}`}>
                                 백만원 {currencyUnit === 'MILLION' && <span className="text-[#1a73e8]">✓</span>}
                              </button>
                              <button onClick={() => { setCurrencyUnit('EOK'); setIsUnitMenuOpen(false); }} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#f1f3f4] flex items-center justify-between ${currencyUnit === 'EOK' ? 'text-[#1a73e8] font-bold bg-[#e8f0fe]' : 'text-[#3c4043]'}`}>
                                 억원 {currencyUnit === 'EOK' && <span className="text-[#1a73e8]">✓</span>}
                              </button>
                           </div>
                        </>
                     )}
                  </div>

                  {/* 알림 */}
                  <button className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg relative">
                     <Bell size={18}/>
                     <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ea4335] rounded-full"></span>
                  </button>

                  {/* 설정 (PC) */}
                  <button onClick={() => openSettings('api')} className="hidden lg:flex p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg">
                     <Settings size={18}/>
                  </button>
               </div>
            </div>
         </header>

         {/* 메인 콘텐츠 */}
         <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 lg:pb-6 bg-[#f8f9fa] custom-scrollbar">
            <div className="max-w-[1400px] mx-auto">
               {activeTab === 'DASHBOARD' && <Dashboard financials={financials} properties={properties} contracts={leaseContracts} units={units} valuations={valuations} facilities={facilities} transactions={transactions} stakeholders={stakeholders} maintenanceContracts={maintenanceContracts} utilityContracts={utilityContracts} formatMoney={formatMoney} />}
               {activeTab === 'PROPERTY' && (
                  <PropertyManager
                    properties={properties} units={units} facilities={facilities}
                    onAddProperty={p => setProperties(prev => [...prev, p])} onUpdateProperty={p => setProperties(prev => prev.map(pr => pr.id === p.id ? p : pr))} onDeleteProperty={id => setProperties(prev => prev.filter(p => p.id !== id))} onUpdateBuilding={() => {}}
                    onAddUnit={u => setUnits(prev => [...prev, u])} onUpdateUnit={u => setUnits(prev => prev.map(un => un.id === u.id ? u : un))}
                    formatArea={formatArea} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatMoney} parseMoneyInput={parseNumberInput} moneyLabel={currencyUnit === 'WON' ? '원' : currencyUnit === 'THOUSAND' ? '천원' : currencyUnit === 'MAN' ? '만원' : currencyUnit === 'MILLION' ? '백만원' : '억원'}
                    appSettings={appSettings}
                    leaseContracts={leaseContracts} stakeholders={stakeholders}
                    floorPlans={floorPlans} floorZones={floorZones}
                    onSaveFloorPlan={plan => setFloorPlans(prev => [...prev.filter(p => p.id !== plan.id), plan])}
                    onDeleteFloorPlan={id => setFloorPlans(prev => prev.filter(p => p.id !== id))}
                    onSaveZone={zone => setFloorZones(prev => [...prev.filter(z => z.id !== zone.id), zone])}
                    onDeleteZone={id => setFloorZones(prev => prev.filter(z => z.id !== id))}
                  />
               )}
               {activeTab === 'FACILITY' && (
                  <FacilityManager
                    facilities={facilities} facilityLogs={facilityLogs} properties={properties} units={units} stakeholders={stakeholders} maintenanceContracts={maintenanceContracts}
                    elevatorInsurances={elevatorInsurances} elevatorSafetyManagers={elevatorSafetyManagers} elevatorInspections={elevatorInspections}
                    elevatorMalfunctions={elevatorMalfunctions} elevatorAccidents={elevatorAccidents} elevatorPartDefects={elevatorPartDefects} elevatorMaintenanceContracts={elevatorMaintenanceContracts}
                    onAddFacility={f => setFacilities(prev => [...prev, f])} onUpdateFacility={f => setFacilities(prev => prev.map(fa => fa.id === f.id ? f : fa))} onDeleteFacility={id => setFacilities(prev => prev.filter(f => f.id !== id))}
                    onAddLog={l => setFacilityLogs(prev => [...prev, l])} onDeleteLog={id => setFacilityLogs(prev => prev.filter(l => l.id !== id))}
                    onAddElevatorInsurance={ins => setElevatorInsurances(prev => [...prev.filter(i => i.id !== ins.id), ins])}
                    onAddElevatorSafetyManager={mgr => setElevatorSafetyManagers(prev => [...prev.filter(m => m.id !== mgr.id), mgr])}
                    onAddElevatorInspection={insp => setElevatorInspections(prev => [...prev.filter(i => i.id !== insp.id), insp])}
                    onAddElevatorMalfunction={mal => setElevatorMalfunctions(prev => [...prev.filter(m => m.id !== mal.id), mal])}
                    onAddElevatorAccident={acc => setElevatorAccidents(prev => [...prev.filter(a => a.id !== acc.id), acc])}
                    onAddElevatorPartDefect={def => setElevatorPartDefects(prev => [...prev.filter(d => d.id !== def.id), def])}
                    onAddElevatorMaintenanceContract={con => setElevatorMaintenanceContracts(prev => [...prev.filter(c => c.id !== con.id), con])}
                    onDeleteElevatorInsurance={id => setElevatorInsurances(prev => prev.filter(i => i.id !== id))}
                    onDeleteElevatorSafetyManager={id => setElevatorSafetyManagers(prev => prev.filter(m => m.id !== id))}
                    onDeleteElevatorInspection={id => setElevatorInspections(prev => prev.filter(i => i.id !== id))}
                    onDeleteElevatorMalfunction={id => setElevatorMalfunctions(prev => prev.filter(m => m.id !== id))}
                    onDeleteElevatorAccident={id => setElevatorAccidents(prev => prev.filter(a => a.id !== id))}
                    onDeleteElevatorPartDefect={id => setElevatorPartDefects(prev => prev.filter(d => d.id !== id))}
                    onDeleteElevatorMaintenanceContract={id => setElevatorMaintenanceContracts(prev => prev.filter(c => c.id !== id))}
                    /* Fixed duplicate attributes error by renaming repeated parseNumberInput to parseMoneyInput */
                    formatMoney={formatMoney} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatNumberInput} parseMoneyInput={parseNumberInput} moneyLabel={currencyUnit === 'WON' ? '원' : currencyUnit === 'THOUSAND' ? '천원' : currencyUnit === 'MAN' ? '만원' : currencyUnit === 'MILLION' ? '백만원' : '억원'}
                    apiKey={appSettings.dataGoKrApiKey}
                    referenceDate={referenceDate}
                  />
               )}
               {activeTab === 'CONTRACT' && (
                  <ContractManager
                    leaseContracts={leaseContracts} maintenanceContracts={maintenanceContracts} utilityContracts={utilityContracts} stakeholders={stakeholders} properties={properties} units={units} facilities={facilities}
                    onAddLease={c => setLeaseContracts(prev => [...prev, c])} onUpdateLease={c => setLeaseContracts(prev => prev.map(co => co.id === c.id ? c : co))} onDeleteLease={id => setLeaseContracts(prev => prev.filter(c => c.id !== id))}
                    onAddMaintenance={c => setMaintenanceContracts(prev => [...prev, c])} onUpdateMaintenance={c => setMaintenanceContracts(prev => prev.map(co => co.id === c.id ? c : co))}
                    onAddUtility={c => setUtilityContracts(prev => [...prev, c])} onUpdateUtility={c => setUtilityContracts(prev => prev.map(co => co.id === c.id ? c : co))}
                    formatMoney={formatMoney} formatArea={formatArea} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput}
                    floorPlans={floorPlans} floorZones={floorZones}
                    onSaveFloorPlan={plan => setFloorPlans(prev => [...prev.filter(p => p.id !== plan.id), plan])}
                    onDeleteFloorPlan={id => setFloorPlans(prev => prev.filter(p => p.id !== id))}
                    onSaveZone={zone => setFloorZones(prev => [...prev.filter(z => z.id !== zone.id), zone])}
                    onDeleteZone={id => setFloorZones(prev => prev.filter(z => z.id !== id))}
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
               {activeTab === 'STAKEHOLDER' && <StakeholderManager stakeholders={stakeholders} onAddStakeholder={s => setStakeholders(prev => [...prev, s])} onUpdateStakeholder={s => setStakeholders(prev => prev.map(sh => sh.id === s.id ? s : sh))} onDeleteStakeholder={id => setStakeholders(prev => prev.filter(s => s.id !== id))} leaseContracts={leaseContracts} maintenanceContracts={maintenanceContracts} properties={properties} units={units} onUpdateProperty={p => setProperties(prev => prev.map(pr => pr.id === p.id ? p : pr))} onUpdateUnit={u => setUnits(prev => prev.map(un => un.id === u.id ? u : un))} formatMoney={formatMoney} referenceDate={referenceDate} />}
               {activeTab === 'VALUATION' && (
                 /* Fixed duplicate attributes error by renaming repeated parseNumberInput to parseMoneyInput */
                 <ValuationManager properties={properties} valuations={valuations} comparables={comparables} onAddValuation={v => setValuations(prev => [...prev, v])} onUpdateValuation={v => setValuations(prev => prev.map(va => va.id === v.id ? v : va))} onDeleteValuation={id => setValuations(prev => prev.filter(v => v.id !== id))} onAddComparable={c => setComparables(prev => [...prev, c])} formatMoney={formatMoney} formatArea={formatArea} formatNumberInput={formatNumberInput} parseNumberInput={parseNumberInput} formatMoneyInput={formatNumberInput} parseMoneyInput={parseNumberInput} moneyLabel={currencyUnit === 'WON' ? '원' : currencyUnit === 'THOUSAND' ? '천원' : currencyUnit === 'MAN' ? '만원' : currencyUnit === 'MILLION' ? '백만원' : '억원'} areaUnit={areaUnit} />
               )}
               {activeTab === 'PARKING' && (
                 <ParkingManager
                   properties={properties}
                   floorPlans={floorPlans}
                   floorZones={floorZones}
                   parkingSpots={parkingSpots}
                   stakeholders={stakeholders}
                   onSaveParkingSpot={spot => setParkingSpots(prev => [...prev.filter(s => s.id !== spot.id), spot])}
                   onDeleteParkingSpot={id => setParkingSpots(prev => prev.filter(s => s.id !== id))}
                 />
               )}
            </div>
         </div>

         {/* 모바일 하단 탭바 */}
         <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#dadce0] safe-area-bottom z-40">
            <div className="flex justify-around items-center h-14">
               {menuItems.slice(0, 5).map(item => (
                  <button
                     key={item.id}
                     onClick={() => setActiveTab(item.id)}
                     className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] ${
                        activeTab === item.id ? 'text-[#1a73e8]' : 'text-[#5f6368]'
                     }`}
                  >
                     {item.icon}
                     <span className="text-[10px] mt-0.5 font-medium">{item.shortLabel}</span>
                  </button>
               ))}
               <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex flex-col items-center justify-center py-1 px-3 min-w-[56px] text-[#5f6368]"
               >
                  <Menu size={18}/>
                  <span className="text-[10px] mt-0.5 font-medium">더보기</span>
               </button>
            </div>
         </nav>
      </main>

      {/* 모바일 사이드 메뉴 */}
      {isMobileMenuOpen && createPortal(
         <div className="fixed inset-0 z-[150] lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/50"/>
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b border-[#dadce0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-[#1a73e8] rounded-lg flex items-center justify-center text-white">
                        <Building2 size={18}/>
                     </div>
                     <span className="font-bold text-[#3c4043]">RealtyFlow</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-[#f1f3f4] rounded-lg">
                     <X size={20} className="text-[#5f6368]"/>
                  </button>
               </div>
               <nav className="p-2 space-y-0.5">
                  {menuItems.map(item => (
                     <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                           activeTab === item.id ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'
                        }`}
                     >
                        {item.icon}
                        {item.label}
                     </button>
                  ))}
               </nav>
               <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#dadce0] bg-white">
                  <button
                     onClick={() => { openSettings('api'); setIsMobileMenuOpen(false); }}
                     className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#5f6368] hover:bg-[#f1f3f4]"
                  >
                     <Settings size={18}/>
                     환경설정
                  </button>
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* Settings Modal */}
      {isSettingsOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* 헤더 */}
            <div className="p-5 border-b border-[#dadce0] flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-[#202124] flex items-center gap-2">
                <Settings size={20} className="text-[#1a73e8]" />
                환경설정
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors">
                <X size={20} className="text-[#5f6368]" />
              </button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-[#dadce0] flex-shrink-0">
              {([['api', 'API 설정'], ['company', '기본 정보'], ['users', '사용자 관리']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${settingsTab === tab ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-[#5f6368] hover:text-[#3c4043]'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="overflow-y-auto flex-1 relative">
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"/>
              <div className="p-6 space-y-6">

                {/* ── API 설정 탭 ── */}
                {settingsTab === 'api' && (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-[#1a73e8]" />
                        <h4 className="font-bold text-[#3c4043]">주소 검색 API</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setAppSettings(prev => ({ ...prev, addressApi: 'DAUM' }))} className={`p-3 rounded-xl border-2 transition-all text-left ${appSettings.addressApi === 'DAUM' ? 'border-[#1a73e8] bg-[#e8f0fe]' : 'border-[#dadce0] hover:border-[#1a73e8]'}`}>
                          <p className="font-bold text-[#202124] text-sm">다음 우편번호</p>
                          <p className="text-xs text-[#5f6368] mt-0.5">Kakao 제공, API 키 불필요</p>
                        </button>
                        <button onClick={() => setAppSettings(prev => ({ ...prev, addressApi: 'VWORLD' }))} className={`p-3 rounded-xl border-2 transition-all text-left ${appSettings.addressApi === 'VWORLD' ? 'border-[#1a73e8] bg-[#e8f0fe]' : 'border-[#dadce0] hover:border-[#1a73e8]'}`}>
                          <p className="font-bold text-[#202124] text-sm">VWorld API</p>
                          <p className="text-xs text-[#5f6368] mt-0.5">국토교통부, API 키 필요</p>
                        </button>
                      </div>
                      {appSettings.addressApi === 'VWORLD' && (
                        <div className="space-y-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#dadce0]">
                          <label className="flex items-center gap-2 text-sm font-bold text-[#3c4043]"><Key size={13}/>VWorld API Key</label>
                          <input type="text" value={appSettings.vworldApiKey} onChange={e => setAppSettings(prev => ({ ...prev, vworldApiKey: e.target.value }))} placeholder="API 키를 입력하세요" className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                          {!appSettings.vworldApiKey && <p className="text-xs text-[#ea4335] font-medium">⚠️ API 키가 없으면 주소 검색이 작동하지 않습니다.</p>}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-[#34a853]" />
                        <h4 className="font-bold text-[#3c4043]">건축물대장 / 승강기 API</h4>
                      </div>
                      <div className="space-y-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#dadce0]">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#3c4043]"><Key size={13}/>공공데이터포털 API Key</label>
                        <input type="text" value={appSettings.dataGoKrApiKey} onChange={e => setAppSettings(prev => ({ ...prev, dataGoKrApiKey: e.target.value }))} placeholder="공공데이터포털 API 키를 입력하세요" className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#34a853] outline-none"/>
                        {!appSettings.dataGoKrApiKey && <p className="text-xs text-[#fbbc05] font-medium">⚠️ API 키가 없으면 건물/승강기 자동 조회가 작동하지 않습니다.</p>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-[#ea4335]" />
                        <h4 className="font-bold text-[#3c4043]">카카오맵 로드뷰 API</h4>
                      </div>
                      <div className="space-y-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#dadce0]">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#3c4043]"><Key size={13}/>Kakao JavaScript API Key</label>
                        <input type="text" value={appSettings.kakaoMapApiKey} onChange={e => setAppSettings(prev => ({ ...prev, kakaoMapApiKey: e.target.value }))} placeholder="카카오 JavaScript 앱 키를 입력하세요" className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#ea4335] outline-none"/>
                        <p className="text-xs text-[#5f6368]">자산 개요의 사진 갤러리에 <strong>주소 기반 로드뷰</strong>가 표시됩니다. <a href="https://developers.kakao.com/console/app" target="_blank" rel="noopener noreferrer" className="text-[#ea4335] hover:underline">카카오 개발자 콘솔</a>에서 JavaScript 앱 키를 발급하세요.</p>
                        {!appSettings.kakaoMapApiKey && <p className="text-xs text-[#9aa0a6]">※ API 키 없이도 앱 사용 가능 (로드뷰만 비활성)</p>}
                      </div>
                    </div>
                  </>
                )}

                {/* ── 기본 정보 탭 ── */}
                {settingsTab === 'company' && (
                  <div className="space-y-4">
                    {/* 로고 */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[#dadce0] flex items-center justify-center bg-[#f8f9fa] overflow-hidden flex-shrink-0">
                        {editCompany.logoBase64
                          ? <img src={editCompany.logoBase64} alt="로고" className="w-full h-full object-contain"/>
                          : <Building2 size={32} className="text-[#dadce0]"/>
                        }
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-[#5f6368]">회사 로고</p>
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload}/>
                        <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-[#dadce0] rounded-lg hover:bg-[#f1f3f4] text-[#3c4043]">
                          <Upload size={12}/> 업로드
                        </button>
                        {editCompany.logoBase64 && (
                          <button onClick={() => setEditCompany(p => ({ ...p, logoBase64: undefined }))} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-[#fce8e6] rounded-lg hover:bg-[#fce8e6] text-[#ea4335]">
                            <Trash2 size={12}/> 삭제
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">회사명 <span className="text-[#ea4335]">*</span></label>
                        <input value={editCompany.name} onChange={e => setEditCompany(p => ({...p, name: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">사업자등록번호</label>
                        <input value={editCompany.businessRegNumber || ''} onChange={e => setEditCompany(p => ({...p, businessRegNumber: e.target.value}))} placeholder="000-00-00000" className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">법인등록번호</label>
                        <input value={editCompany.corporateRegNumber || ''} onChange={e => setEditCompany(p => ({...p, corporateRegNumber: e.target.value}))} placeholder="000000-0000000" className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">대표자명</label>
                        <input value={editCompany.representative || ''} onChange={e => setEditCompany(p => ({...p, representative: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">대표 전화</label>
                        <input value={editCompany.phone || ''} onChange={e => setEditCompany(p => ({...p, phone: e.target.value}))} placeholder="02-0000-0000" className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">팩스</label>
                        <input value={editCompany.faxNumber || ''} onChange={e => setEditCompany(p => ({...p, faxNumber: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">이메일</label>
                        <input type="email" value={editCompany.email || ''} onChange={e => setEditCompany(p => ({...p, email: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">웹사이트</label>
                        <input value={editCompany.website || ''} onChange={e => setEditCompany(p => ({...p, website: e.target.value}))} placeholder="https://" className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">주소</label>
                        <input value={editCompany.address || ''} onChange={e => setEditCompany(p => ({...p, address: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">상세주소</label>
                        <input value={editCompany.addressDetail || ''} onChange={e => setEditCompany(p => ({...p, addressDetail: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">우편번호</label>
                        <input value={editCompany.postalCode || ''} onChange={e => setEditCompany(p => ({...p, postalCode: e.target.value}))} placeholder="00000" className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                      </div>
                    </div>

                    <button
                      onClick={() => { if (!editCompany.name.trim()) { alert('회사명을 입력하세요.'); return; } setCompanyInfo({...editCompany}); alert('기본정보가 저장되었습니다.'); }}
                      className="w-full py-2.5 bg-[#1a73e8] text-white font-bold rounded-lg hover:bg-[#1557b0] transition-colors"
                    >
                      저장
                    </button>
                  </div>
                )}

                {/* ── 사용자 관리 탭 ── */}
                {settingsTab === 'users' && (
                  <div className="space-y-3">
                    {/* 사용자 목록 */}
                    {users.map(user => (
                      <div key={user.id} className={`border rounded-xl transition-all ${editingUserId === user.id ? 'border-[#1a73e8] bg-[#f8fbff]' : 'border-[#dadce0] bg-white'}`}>
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: user.avatarColor || '#1a73e8' }}>
                            {user.name.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-[#202124]">{user.name}</p>
                              {user.id === currentUser.id && <span className="text-[10px] bg-[#e6f4ea] text-[#34a853] px-1.5 py-0.5 rounded-full font-bold">현재</span>}
                              {!user.isActive && <span className="text-[10px] bg-[#fce8e6] text-[#ea4335] px-1.5 py-0.5 rounded-full font-bold">비활성</span>}
                            </div>
                            <p className="text-xs text-[#5f6368]">@{user.username} {user.email ? `· ${user.email}` : ''}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${user.role === 'ADMIN' ? 'bg-[#fce8e6] text-[#ea4335]' : user.role === 'MANAGER' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368]'}`}>
                            {user.role === 'ADMIN' ? '관리자' : user.role === 'MANAGER' ? '담당자' : '열람'}
                          </span>
                          <button
                            onClick={() => {
                              if (editingUserId === user.id) { setEditingUserId(null); return; }
                              setEditingUserId(user.id);
                              setEditUserForm({ name: user.name, email: user.email || '', role: user.role });
                              setUserFormError('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-[#f1f3f4] text-[#5f6368] flex-shrink-0"
                          >
                            <Edit2 size={14}/>
                          </button>
                        </div>

                        {/* 인라인 편집 */}
                        {editingUserId === user.id && (
                          <div className="px-3 pb-3 space-y-2 border-t border-[#e8f0fe] pt-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">표시 이름</label>
                                <input value={editUserForm.name} onChange={e => setEditUserForm(p => ({...p, name: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">역할</label>
                                <select value={editUserForm.role} onChange={e => setEditUserForm(p => ({...p, role: e.target.value as UserRole}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none bg-white">
                                  <option value="ADMIN">관리자</option>
                                  <option value="MANAGER">담당자</option>
                                  <option value="VIEWER">열람</option>
                                </select>
                              </div>
                              <div className="col-span-2">
                                <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">이메일</label>
                                <input type="email" value={editUserForm.email} onChange={e => setEditUserForm(p => ({...p, email: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                              </div>
                            </div>
                            {userFormError && <p className="text-[10px] text-[#ea4335]">{userFormError}</p>}
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={handleSaveEditUser} className="px-3 py-1 bg-[#1a73e8] text-white text-xs font-bold rounded-lg hover:bg-[#1557b0]">저장</button>
                              <button onClick={() => handleToggleUserActive(user.id)} className={`px-3 py-1 text-xs font-bold rounded-lg border ${user.isActive ? 'border-[#fbbc05] text-[#f29900] hover:bg-[#fef7e0]' : 'border-[#34a853] text-[#34a853] hover:bg-[#e6f4ea]'}`}>
                                {user.isActive ? <><UserX size={11} className="inline mr-0.5"/>비활성화</> : <><UserCheck size={11} className="inline mr-0.5"/>활성화</>}
                              </button>
                              <button onClick={() => handleResetPassword(user.id)} className="px-3 py-1 text-xs font-bold rounded-lg border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]">
                                <Key size={11} className="inline mr-0.5"/>비밀번호 초기화
                              </button>
                              <button onClick={() => setEditingUserId(null)} className="px-3 py-1 text-xs font-bold rounded-lg border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]">취소</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 사용자 추가 폼 */}
                    {showAddUserForm ? (
                      <div className="border-2 border-dashed border-[#1a73e8] rounded-xl p-4 bg-[#f8fbff] space-y-3">
                        <p className="text-sm font-bold text-[#1a73e8]">새 사용자 추가</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">아이디 *</label>
                            <input value={newUserForm.username} onChange={e => setNewUserForm(p => ({...p, username: e.target.value}))} placeholder="로그인 아이디" className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">표시 이름 *</label>
                            <input value={newUserForm.name} onChange={e => setNewUserForm(p => ({...p, name: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">역할</label>
                            <select value={newUserForm.role} onChange={e => setNewUserForm(p => ({...p, role: e.target.value as UserRole}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none bg-white">
                              <option value="MANAGER">담당자</option>
                              <option value="ADMIN">관리자</option>
                              <option value="VIEWER">열람</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">이메일</label>
                            <input type="email" value={newUserForm.email} onChange={e => setNewUserForm(p => ({...p, email: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                          </div>
                          <div className="relative">
                            <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">비밀번호 *</label>
                            <input type={showNewUserPw ? 'text' : 'password'} value={newUserForm.password} onChange={e => setNewUserForm(p => ({...p, password: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 pr-7 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                            <button type="button" onClick={() => setShowNewUserPw(!showNewUserPw)} className="absolute right-2 bottom-1.5 text-[#5f6368]">{showNewUserPw ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#5f6368] mb-0.5 block">비밀번호 확인 *</label>
                            <input type="password" value={newUserForm.confirmPw} onChange={e => setNewUserForm(p => ({...p, confirmPw: e.target.value}))} className="w-full border border-[#dadce0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#1a73e8] outline-none"/>
                          </div>
                        </div>
                        {userFormError && <p className="text-[10px] text-[#ea4335]">{userFormError}</p>}
                        <div className="flex gap-2">
                          <button onClick={handleAddUser} className="px-4 py-1.5 bg-[#1a73e8] text-white text-xs font-bold rounded-lg hover:bg-[#1557b0]">추가</button>
                          <button onClick={() => { setShowAddUserForm(false); setUserFormError(''); setNewUserForm({ username: '', name: '', email: '', password: '', confirmPw: '', role: 'MANAGER' }); }} className="px-4 py-1.5 border border-[#dadce0] text-xs font-bold rounded-lg hover:bg-[#f1f3f4]">취소</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setShowAddUserForm(true); setEditingUserId(null); }} className="w-full py-2.5 border-2 border-dashed border-[#dadce0] rounded-xl text-sm font-bold text-[#5f6368] hover:border-[#1a73e8] hover:text-[#1a73e8] transition-colors flex items-center justify-center gap-2">
                        <Plus size={16}/> 사용자 추가
                      </button>
                    )}

                    {/* 역할 안내 */}
                    <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#dadce0] space-y-1">
                      <p className="text-[10px] font-bold text-[#5f6368] mb-2">역할 안내</p>
                      <div className="flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fce8e6] text-[#ea4335]">관리자</span><span className="text-[10px] text-[#5f6368]">모든 기능 접근, 사용자 관리 가능</span></div>
                      <div className="flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">담당자</span><span className="text-[10px] text-[#5f6368]">데이터 조회 및 입력 가능</span></div>
                      <div className="flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368]">열람</span><span className="text-[10px] text-[#5f6368]">데이터 조회만 가능</span></div>
                    </div>
                  </div>
                )}

              </div>
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"/>
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t border-[#dadce0] flex justify-end flex-shrink-0">
              <button onClick={() => setIsSettingsOpen(false)} className="px-6 py-2 bg-[#1a73e8] text-white font-bold rounded-lg hover:bg-[#1557b0] transition-colors text-sm">
                닫기
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
