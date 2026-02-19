
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  LeaseContract, MaintenanceContract, UtilityContract, Stakeholder, Property, Unit, Facility,
  LeaseType, ContractTargetType, ContractTerm, CostItem, ContractAttachment, DepositCollateral,
  ContractConditions, CollateralType, SettlementMethod, FloorPlan, FloorZone
} from '../types';
import {
  X, Plus, Shuffle, Wrench, Zap, FileText, Calendar, User, Home, Building, MapPin, Coins,
  CreditCard, Clock, Layers, Shield, Hammer, ShieldCheck, ChevronDown, ChevronUp, Trash2, Paperclip, Upload, Check, MousePointer2, Filter, Printer, Merge, FileImage
} from 'lucide-react';
import FloorPlanViewer from './FloorPlanViewer';

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-xl shadow-2xl bg-white animate-in zoom-in-95 duration-200 overflow-hidden relative">
        <div className="max-h-[95vh] overflow-y-auto">{children}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent z-10" />
      </div>
    </div>,
    document.body
  );
};

type ContractTab = 'LEASE' | 'SUBLEASE' | 'SERVICE' | 'CONSTRUCTION' | 'INSURANCE' | 'SURETY';
type LeaseModalTab = 'BASIC' | 'CONDITIONS' | 'TERMS' | 'COLLATERAL';

const CONTRACT_TABS: { id: ContractTab; label: string; icon: React.ReactNode }[] = [
  { id: 'LEASE', label: '임대차', icon: <Shuffle size={14} className="md:w-4 md:h-4"/> },
  { id: 'SUBLEASE', label: '전대차', icon: <Shuffle size={14} className="md:w-4 md:h-4"/> },
  { id: 'SERVICE', label: '용역계약', icon: <Wrench size={14} className="md:w-4 md:h-4"/> },
  { id: 'CONSTRUCTION', label: '도급계약', icon: <Hammer size={14} className="md:w-4 md:h-4"/> },
  { id: 'INSURANCE', label: '보험계약', icon: <Shield size={14} className="md:w-4 md:h-4"/> },
  { id: 'SURETY', label: '보증보험', icon: <ShieldCheck size={14} className="md:w-4 md:h-4"/> },
];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  CLEANING: '청소', SECURITY: '경비', ELEVATOR: '승강기', FIRE_SAFETY: '소방',
  INTERNET: '통신', REPAIR: '수선', LANDSCAPING: '조경', DISINFECTION: '소독'
};

const COLLATERAL_TYPE_LABELS: Record<CollateralType, string> = {
  MORTGAGE: '근저당권', JEONSE_RIGHT: '전세권', GUARANTEE_INSURANCE: '보증보험', PLEDGE: '질권'
};

const TERM_TYPE_LABELS: Record<string, string> = { NEW: '신규', RENEWAL: '갱신', IMPLICIT: '묵시적' };

const QUICK_COST_ITEMS = ['관리비', '전기료', '수도료', '가스비', '주차비'];

interface ContractManagerProps {
  leaseContracts: LeaseContract[];
  maintenanceContracts: MaintenanceContract[];
  utilityContracts: UtilityContract[];
  stakeholders: Stakeholder[];
  properties: Property[];
  units: Unit[];
  facilities: Facility[];
  onAddLease: (contract: LeaseContract) => void;
  onUpdateLease: (contract: LeaseContract) => void;
  onDeleteLease: (id: string) => void;
  onAddMaintenance: (contract: MaintenanceContract) => void;
  onUpdateMaintenance: (contract: MaintenanceContract) => void;
  onAddUtility: (contract: UtilityContract) => void;
  onUpdateUtility: (contract: UtilityContract) => void;
  formatMoney: (amount: number) => string;
  formatArea: (area: number) => string;
  formatNumberInput: (num: number | undefined | null) => string;
  parseNumberInput: (str: string) => number;
  // 도면/조닝 관련
  floorPlans: FloorPlan[];
  floorZones: FloorZone[];
  onSaveFloorPlan: (plan: FloorPlan) => void;
  onDeleteFloorPlan: (id: string) => void;
  onSaveZone: (zone: FloorZone) => void;
  onDeleteZone: (id: string) => void;
}

// ========================================
// Helper: 날짜 다음날 계산
// ========================================
const getNextDay = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export const ContractManager: React.FC<ContractManagerProps> = ({
  leaseContracts, maintenanceContracts, utilityContracts, stakeholders, properties, units, facilities,
  formatMoney, formatArea, formatNumberInput, parseNumberInput,
  onAddLease, onUpdateLease, onDeleteLease, onAddMaintenance, onUpdateMaintenance, onAddUtility, onUpdateUtility,
  floorPlans, floorZones, onSaveFloorPlan, onDeleteFloorPlan, onSaveZone, onDeleteZone
}) => {
  // ========================================
  // 메인 상태
  // ========================================
  const [selectedPropId, setSelectedPropId] = useState(properties[0]?.id || '');
  const [activeTab, setActiveTab] = useState<ContractTab>('LEASE');
  const [selectedBldgId, setSelectedBldgId] = useState<string>(properties[0]?.buildings[0]?.id || '');

  // 모달 상태
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);

  // 임대차 모달 탭
  const [leaseModalTab, setLeaseModalTab] = useState<LeaseModalTab>('BASIC');

  // 임대차 폼
  const [leaseForm, setLeaseForm] = useState<LeaseContract>(createEmptyLeaseContract('LEASE_OUT'));
  // 선택된 차수 인덱스
  const [selectedTermIndex, setSelectedTermIndex] = useState<number | null>(null);
  // 담보 편집 인덱스
  const [editingCollateralIndex, setEditingCollateralIndex] = useState<number | null>(null);
  // 층 단위 모달용 건물 선택
  const [modalBldgId, setModalBldgId] = useState<string>('');
  // 단면도 구역 선택
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  // 단면도 필터
  const [diagramFilters, setDiagramFilters] = useState<{
    floorFrom: number | null; floorTo: number | null;
    statuses: ('ACTIVE' | 'VACANT' | 'EXPIRED')[];
    tenantSearch: string; expiryMonths: number | null;
  }>({ floorFrom: null, floorTo: null, statuses: [], tenantSearch: '', expiryMonths: null });
  const [showFilters, setShowFilters] = useState(false);
  // 계약 병합 선택 모달
  const [mergeModalContracts, setMergeModalContracts] = useState<LeaseContract[]>([]);
  const [mergeZoneIds, setMergeZoneIds] = useState<string[]>([]);

  // 도면 뷰어 상태
  const [floorPlanViewerOpen, setFloorPlanViewerOpen] = useState(false);
  const [viewerFloorNumber, setViewerFloorNumber] = useState<number | null>(null);

  // 용역계약 폼
  const [maintForm, setMaintForm] = useState<Partial<MaintenanceContract>>({
    targetType: 'PROPERTY', targetId: '', vendorId: '', serviceType: 'CLEANING', status: 'ACTIVE',
    isRecurring: true, paymentDay: 1, term: { startDate: '', endDate: '' }, monthlyCost: 0, details: ''
  });

  // ========================================
  // 파생 데이터
  // ========================================
  const selectedProperty = properties.find(p => p.id === selectedPropId);
  const propertyUnitIds = useMemo(() => units.filter(u => u.propertyId === selectedPropId).map(u => u.id), [units, selectedPropId]);
  const propertyUnits = useMemo(() => units.filter(u => u.propertyId === selectedPropId), [units, selectedPropId]);
  const propertyFacilities = useMemo(() => facilities.filter(f => f.propertyId === selectedPropId), [facilities, selectedPropId]);

  const landlords = useMemo(() => stakeholders.filter(s => s.roles.includes('LANDLORD')), [stakeholders]);
  const tenants = useMemo(() => stakeholders.filter(s => s.roles.includes('TENANT')), [stakeholders]);
  const vendors = useMemo(() => stakeholders.filter(s => s.roles.includes('VENDOR')), [stakeholders]);

  // ========================================
  // 임대차 빈 객체 생성
  // ========================================
  function createEmptyLeaseContract(type: LeaseType): LeaseContract {
    return {
      id: '', type, targetType: 'UNIT', targetIds: [],
      landlordIds: [], tenantIds: [], status: 'ACTIVE',
      originalContractDate: '',
      terms: [{
        id: `ct-${Date.now()}`, termNumber: 1, type: 'NEW',
        contractDate: '', startDate: '', endDate: '',
        deposit: 0, monthlyRent: 0, rentVatIncluded: true,
        paymentDay: 1, paymentType: 'PREPAID', costItems: [], attachments: [],
      }],
      conditions: {
        restorationRequired: false, subleaseAllowed: false, specialTerms: [],
      },
      collaterals: [],
    };
  }

  // 층 ID 유틸
  const makeFloorId = (bldgId: string, floor: number) => `FLOOR|${bldgId}|${floor}`;
  const parseFloorId = (id: string) => {
    if (!id.startsWith('FLOOR|')) return null;
    const parts = id.split('|');
    return parts.length === 3 ? { bldgId: parts[1], floor: parseInt(parts[2]) } : null;
  };
  const floorNumLabel = (fl: number) => fl > 0 ? `${fl}층` : fl === 0 ? 'B1' : `B${Math.abs(fl)}층`;
  const floorIdToLabel = (id: string) => {
    const p = parseFloorId(id);
    if (!p) return id;
    const bldg = selectedProperty?.buildings.find(b => b.id === p.bldgId);
    return (bldg && selectedProperty!.buildings.length > 1) ? `${bldg.name} ${floorNumLabel(p.floor)}` : floorNumLabel(p.floor);
  };

  // 연속 숫자 범위 축약 (1,2,3,5 → "1~3, 5")
  const abbreviateRange = (nums: number[], suffix: string, prefix = ''): string => {
    if (nums.length === 0) return '';
    const sorted = [...new Set(nums)].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) end = sorted[i];
      else { ranges.push(start === end ? `${prefix}${start}${suffix}` : `${prefix}${start}~${prefix}${end}${suffix}`); start = end = sorted[i]; }
    }
    ranges.push(start === end ? `${prefix}${start}${suffix}` : `${prefix}${start}~${prefix}${end}${suffix}`);
    return ranges.join(', ');
  };

  // 계약 대상 축약 라벨 (건물 → 층 → 호실 순서)
  const getAbbreviatedTargetLabel = (c: LeaseContract): string => {
    const parts: string[] = [];
    // 1. 건물
    const bldgTargets = selectedProperty?.buildings.filter(b => c.targetIds.includes(b.id)) || [];
    if (bldgTargets.length > 0) parts.push(bldgTargets.map(b => b.name).join(', '));
    // 2. 층 - 건물별 그룹, 연층 축약
    const floorEntries = c.targetIds.map(parseFloorId).filter(Boolean) as { bldgId: string; floor: number }[];
    if (floorEntries.length > 0) {
      const byBldg = new Map<string, number[]>();
      floorEntries.forEach(({ bldgId, floor }) => {
        if (!byBldg.has(bldgId)) byBldg.set(bldgId, []);
        byBldg.get(bldgId)!.push(floor);
      });
      byBldg.forEach((floors, bldgId) => {
        const bldg = selectedProperty?.buildings.find(b => b.id === bldgId);
        const bldgPrefix = bldg && selectedProperty!.buildings.length > 1 ? `${bldg.name} ` : '';
        const above = floors.filter(f => f > 0);
        const under = floors.filter(f => f <= 0).map(f => f === 0 ? 1 : Math.abs(f));
        const aboveStr = above.length > 0 ? abbreviateRange(above, '층') : '';
        const underStr = under.length > 0 ? abbreviateRange(under, '', 'B') : '';
        parts.push(bldgPrefix + [underStr, aboveStr].filter(Boolean).join(', '));
      });
    }
    // 3. 호실 - 연실 축약
    const unitTargets = units.filter(u => c.targetIds.includes(u.id));
    if (unitTargets.length > 0) {
      const parseable = unitTargets.map(u => ({ num: parseInt(u.unitNumber), u })).filter(x => !isNaN(x.num));
      const nonParseable = unitTargets.filter(u => isNaN(parseInt(u.unitNumber)));
      if (parseable.length > 0) parts.push(abbreviateRange(parseable.map(x => x.num), '호'));
      nonParseable.forEach(u => parts.push(`${u.unitNumber}호`));
    }
    return parts.join(', ') || '대상 미지정';
  };

  // ========================================
  // 탭별 계약 필터링
  // ========================================
  const getLeaseContractsForProp = () => leaseContracts.filter(c => {
    const isLease = c.type === 'LEASE_OUT' || c.type === 'LEASE_IN';
    if (c.targetType === 'UNIT') return isLease && c.targetIds.some(id => propertyUnitIds.includes(id));
    if (c.targetType === 'BUILDING') return isLease && c.targetIds.some(id => selectedProperty?.buildings.some(b => b.id === id));
    if (c.targetType === 'FLOOR') {
      const bldgIds = selectedProperty?.buildings.map(b => b.id) || [];
      return isLease && c.targetIds.some(id => { const p = parseFloorId(id); return !!p && bldgIds.includes(p.bldgId); });
    }
    return isLease && c.targetIds.includes(selectedPropId);
  });

  const getSubleaseContractsForProp = () => leaseContracts.filter(c => {
    const isSublease = c.type === 'SUBLEASE_OUT' || c.type === 'SUBLEASE_IN';
    if (c.targetType === 'UNIT') return isSublease && c.targetIds.some(id => propertyUnitIds.includes(id));
    if (c.targetType === 'FLOOR') {
      const bldgIds = selectedProperty?.buildings.map(b => b.id) || [];
      return isSublease && c.targetIds.some(id => { const p = parseFloorId(id); return !!p && bldgIds.includes(p.bldgId); });
    }
    return isSublease && c.targetIds.includes(selectedPropId);
  });

  const getMaintenanceContractsForProp = () => maintenanceContracts.filter(c => c.targetId === selectedPropId);

  const tabCounts: Record<ContractTab, number> = {
    LEASE: getLeaseContractsForProp().length,
    SUBLEASE: getSubleaseContractsForProp().length,
    SERVICE: getMaintenanceContractsForProp().length,
    CONSTRUCTION: 0, INSURANCE: 0, SURETY: 0,
  };

  // ========================================
  // 주소 헬퍼
  // ========================================
  const getPropertyAddress = (prop: Property) => {
    const a = prop.masterAddress;
    return `${a.sido} ${a.sigungu} ${a.eupMyeonDong}${a.li ? ' ' + a.li : ''} ${a.bonbun}${a.bubun ? '-' + a.bubun : ''}`;
  };

  // ========================================
  // 상태 뱃지
  // ========================================
  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') return <span className="px-1.5 md:px-2.5 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">정상</span>;
    if (status === 'EXPIRED') return <span className="px-1.5 md:px-2.5 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold bg-gray-100 text-gray-400">만료</span>;
    if (status === 'PENDING') return <span className="px-1.5 md:px-2.5 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">대기</span>;
    return <span className="px-1.5 md:px-2.5 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold bg-red-50 text-red-500">해지</span>;
  };

  // ========================================
  // 모달 열기 핸들러
  // ========================================
  const handleOpenAddLease = (isSublease: boolean, preselectedUnitId?: string) => {
    const type: LeaseType = isSublease ? 'SUBLEASE_OUT' : 'LEASE_OUT';
    const newContract = createEmptyLeaseContract(type);
    if (preselectedUnitId) newContract.targetIds = [preselectedUnitId];
    setModalBldgId(selectedProperty?.buildings[0]?.id || '');
    setLeaseForm(newContract);
    setEditingContractId(null);
    setLeaseModalTab('BASIC');
    setSelectedTermIndex(null);
    setEditingCollateralIndex(null);
    setIsLeaseModalOpen(true);
  };

  const handleOpenEditLease = (c: LeaseContract) => {
    if (c.targetType === 'FLOOR' && c.targetIds.length > 0) {
      const p = parseFloorId(c.targetIds[0]);
      setModalBldgId(p?.bldgId || selectedProperty?.buildings[0]?.id || '');
    } else {
      setModalBldgId(selectedProperty?.buildings[0]?.id || '');
    }
    setEditingContractId(c.id);
    setLeaseForm(JSON.parse(JSON.stringify(c)));
    setLeaseModalTab('BASIC');
    setSelectedTermIndex(null);
    setEditingCollateralIndex(null);
    setIsLeaseModalOpen(true);
  };

  const handleRegisterFromSelection = () => {
    const nc = createEmptyLeaseContract('LEASE_OUT');
    const floorIds = selectedZoneIds.filter(id => id.startsWith('FLOOR|'));
    const unitIds = selectedZoneIds.filter(id => !id.startsWith('FLOOR|'));
    if (floorIds.length > 0 && unitIds.length === 0) {
      nc.targetType = 'FLOOR';
      nc.targetIds = floorIds;
      const firstFloor = parseFloorId(floorIds[0]);
      if (firstFloor) setModalBldgId(firstFloor.bldgId);
    } else {
      nc.targetType = 'UNIT';
      nc.targetIds = unitIds;
      setModalBldgId(selectedProperty?.buildings[0]?.id || '');
    }
    setLeaseForm(nc);
    setEditingContractId(null);
    setLeaseModalTab('BASIC');
    setSelectedTermIndex(null);
    setEditingCollateralIndex(null);
    setIsLeaseModalOpen(true);
    setSelectedZoneIds([]);
    setSelectionMode(false);
  };

  const handleDeleteFromSelection = () => {
    const seen = new Set<string>();
    const contractsToDelete: LeaseContract[] = [];
    selectedZoneIds.forEach(zoneId => {
      const matches = leaseContracts.filter(c => {
        if (c.targetType === 'UNIT' && c.targetIds.includes(zoneId)) return true;
        if (c.targetType === 'FLOOR' && c.targetIds.includes(zoneId)) return true;
        if (c.targetType === 'BUILDING' && c.targetIds.includes(zoneId)) return true;
        return false;
      });
      matches.forEach(c => { if (!seen.has(c.id)) { seen.add(c.id); contractsToDelete.push(c); } });
    });
    if (contractsToDelete.length === 0) return;
    const names = contractsToDelete.map(c => {
      const t = stakeholders.find(s => c.tenantIds.includes(s.id));
      return t?.name || '미지정';
    }).join(', ');
    if (!confirm(`선택된 구역의 계약 ${contractsToDelete.length}건을 삭제하시겠습니까?\n임차인: ${names}`)) return;
    contractsToDelete.forEach(c => onDeleteLease(c.id));
    setSelectedZoneIds([]);
    setSelectionMode(false);
  };

  const handleMergeFromSelection = () => {
    const seen = new Set<string>();
    const contracts: LeaseContract[] = [];
    selectedZoneIds.forEach(zoneId => {
      const matches = leaseContracts.filter(c =>
        (c.type === 'LEASE_OUT' || c.type === 'LEASE_IN') && c.targetIds.includes(zoneId)
      );
      matches.forEach(c => { if (!seen.has(c.id)) { seen.add(c.id); contracts.push(c); } });
    });
    if (contracts.length === 0) return;
    if (contracts.length === 1) {
      executeMerge(contracts[0], selectedZoneIds);
    } else {
      setMergeModalContracts(contracts);
      setMergeZoneIds([...selectedZoneIds]);
    }
  };

  const executeMerge = (baseContract: LeaseContract, allZoneIds: string[]) => {
    const otherContracts = leaseContracts.filter(c =>
      c.id !== baseContract.id &&
      (c.type === 'LEASE_OUT' || c.type === 'LEASE_IN') &&
      allZoneIds.some(z => c.targetIds.includes(z))
    );
    otherContracts.forEach(c => onDeleteLease(c.id));
    const merged = { ...baseContract, targetIds: [...new Set([...baseContract.targetIds, ...allZoneIds])] };
    onUpdateLease(merged);
    setSelectedZoneIds([]);
    setSelectionMode(false);
    setMergeModalContracts([]);
    setMergeZoneIds([]);
  };

  const handleOpenAddMaint = () => {
    setEditingContractId(null);
    setMaintForm({
      targetType: 'PROPERTY', targetId: selectedPropId, vendorId: '', serviceType: 'CLEANING', status: 'ACTIVE',
      isRecurring: true, paymentDay: 1, term: { startDate: '', endDate: '' }, monthlyCost: 0, details: ''
    });
    setIsMaintenanceModalOpen(true);
  };

  const handleOpenEditMaint = (c: MaintenanceContract) => {
    setEditingContractId(c.id);
    setMaintForm({ ...c, term: { ...c.term } });
    setIsMaintenanceModalOpen(true);
  };

  // ========================================
  // 저장 핸들러
  // ========================================
  const handleSaveLease = () => {
    if (leaseForm.targetIds.length === 0) return alert('대상을 선택해주세요.');
    if (leaseForm.tenantIds.length === 0) return alert('임차인을 선택해주세요.');
    if (leaseForm.terms.length === 0 || !leaseForm.terms[0].startDate) return alert('계약이력을 입력해주세요.');
    if (editingContractId) {
      onUpdateLease({ ...leaseForm, id: editingContractId });
    } else {
      onAddLease({ ...leaseForm, id: `lc-${Date.now()}` });
    }
    setIsLeaseModalOpen(false);
    setEditingContractId(null);
  };

  const handleSaveMaint = () => {
    if (!maintForm.targetId || !maintForm.vendorId) return alert('필수 항목을 모두 입력해주세요.');
    if (editingContractId) {
      onUpdateMaintenance({ id: editingContractId, ...maintForm } as MaintenanceContract);
    } else {
      onAddMaintenance({ id: `mc-${Date.now()}`, ...maintForm } as MaintenanceContract);
    }
    setIsMaintenanceModalOpen(false);
    setEditingContractId(null);
  };

  // ========================================
  // 임대차 폼 업데이트 헬퍼
  // ========================================
  const updateLeaseForm = (patch: Partial<LeaseContract>) => setLeaseForm(prev => ({ ...prev, ...patch }));
  const updateConditions = (patch: Partial<ContractConditions>) => setLeaseForm(prev => ({ ...prev, conditions: { ...prev.conditions, ...patch } }));

  const updateTerm = (termIndex: number, patch: Partial<ContractTerm>) => {
    setLeaseForm(prev => {
      const newTerms = [...prev.terms];
      newTerms[termIndex] = { ...newTerms[termIndex], ...patch };
      return { ...prev, terms: newTerms };
    });
  };

  // ========================================
  // 차수 추가
  // ========================================
  const handleAddTerm = () => {
    const lastTerm = leaseForm.terms[leaseForm.terms.length - 1];
    const newTerm: ContractTerm = {
      id: `ct-${Date.now()}`,
      termNumber: (lastTerm?.termNumber || 0) + 1,
      type: 'RENEWAL',
      contractDate: '',
      startDate: lastTerm ? getNextDay(lastTerm.endDate) : '',
      endDate: '',
      deposit: lastTerm?.deposit || 0,
      monthlyRent: lastTerm?.monthlyRent || 0,
      rentVatIncluded: lastTerm?.rentVatIncluded ?? true,
      paymentDay: lastTerm?.paymentDay || 1,
      paymentType: lastTerm?.paymentType || 'PREPAID',
      costItems: lastTerm?.costItems ? lastTerm.costItems.map(ci => ({ ...ci, id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })) : [],
      attachments: [],
    };
    setLeaseForm(prev => ({ ...prev, terms: [...prev.terms, newTerm] }));
    setSelectedTermIndex(leaseForm.terms.length);
  };

  // ========================================
  // 비용항목 추가
  // ========================================
  const handleAddCostItem = (termIndex: number, label: string) => {
    const newItem: CostItem = {
      id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label, method: 'FIXED', amount: 0, vatIncluded: true,
    };
    setLeaseForm(prev => {
      const newTerms = [...prev.terms];
      newTerms[termIndex] = { ...newTerms[termIndex], costItems: [...newTerms[termIndex].costItems, newItem] };
      return { ...prev, terms: newTerms };
    });
  };

  const handleRemoveCostItem = (termIndex: number, costId: string) => {
    setLeaseForm(prev => {
      const newTerms = [...prev.terms];
      newTerms[termIndex] = { ...newTerms[termIndex], costItems: newTerms[termIndex].costItems.filter(ci => ci.id !== costId) };
      return { ...prev, terms: newTerms };
    });
  };

  const handleUpdateCostItem = (termIndex: number, costId: string, patch: Partial<CostItem>) => {
    setLeaseForm(prev => {
      const newTerms = [...prev.terms];
      newTerms[termIndex] = {
        ...newTerms[termIndex],
        costItems: newTerms[termIndex].costItems.map(ci => ci.id === costId ? { ...ci, ...patch } : ci)
      };
      return { ...prev, terms: newTerms };
    });
  };

  // ========================================
  // 첨부파일
  // ========================================
  const handleFileUpload = (termIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const term = leaseForm.terms[termIndex];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: ContractAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `${term.termNumber}차 계약서 - ${term.contractDate || '미정'}`,
          contractDate: term.contractDate || '',
          fileName: file.name,
          fileData: reader.result as string,
          uploadedAt: new Date().toISOString().split('T')[0],
        };
        setLeaseForm(prev => {
          const newTerms = [...prev.terms];
          newTerms[termIndex] = { ...newTerms[termIndex], attachments: [...newTerms[termIndex].attachments, attachment] };
          return { ...prev, terms: newTerms };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (termIndex: number, attId: string) => {
    setLeaseForm(prev => {
      const newTerms = [...prev.terms];
      newTerms[termIndex] = { ...newTerms[termIndex], attachments: newTerms[termIndex].attachments.filter(a => a.id !== attId) };
      return { ...prev, terms: newTerms };
    });
  };

  // ========================================
  // 담보설정
  // ========================================
  const handleAddCollateral = () => {
    const newColl: DepositCollateral = {
      id: `coll-${Date.now()}`,
      type: 'MORTGAGE', amount: 0, targetType: 'LOT', targetIds: [],
      priority: (leaseForm.collaterals.length || 0) + 1,
    };
    setLeaseForm(prev => ({ ...prev, collaterals: [...prev.collaterals, newColl] }));
    setEditingCollateralIndex(leaseForm.collaterals.length);
  };

  const handleUpdateCollateral = (index: number, patch: Partial<DepositCollateral>) => {
    setLeaseForm(prev => {
      const newColls = [...prev.collaterals];
      newColls[index] = { ...newColls[index], ...patch };
      return { ...prev, collaterals: newColls };
    });
  };

  const handleRemoveCollateral = (index: number) => {
    setLeaseForm(prev => ({
      ...prev, collaterals: prev.collaterals.filter((_, i) => i !== index)
    }));
    setEditingCollateralIndex(null);
  };

  // ========================================
  // 특약사항 관리
  // ========================================
  const handleAddSpecialTerm = () => {
    updateConditions({ specialTerms: [...(leaseForm.conditions.specialTerms || []), ''] });
  };

  const handleUpdateSpecialTerm = (index: number, value: string) => {
    const newTerms = [...(leaseForm.conditions.specialTerms || [])];
    newTerms[index] = value;
    updateConditions({ specialTerms: newTerms });
  };

  const handleRemoveSpecialTerm = (index: number) => {
    updateConditions({ specialTerms: (leaseForm.conditions.specialTerms || []).filter((_, i) => i !== index) });
  };

  // ========================================
  // 임대인/임차인 복수 선택 헬퍼
  // ========================================
  const handleAddId = (field: 'landlordIds' | 'tenantIds', id: string) => {
    if (!id || leaseForm[field].includes(id)) return;
    updateLeaseForm({ [field]: [...leaseForm[field], id] });
  };

  const handleRemoveId = (field: 'landlordIds' | 'tenantIds', id: string) => {
    updateLeaseForm({ [field]: leaseForm[field].filter(x => x !== id) });
  };

  // ========================================
  // 담보 대상 자산 복수 선택 헬퍼
  // ========================================
  const toggleCollateralTarget = (collIndex: number, assetId: string) => {
    const coll = leaseForm.collaterals[collIndex];
    const ids = coll.targetIds.includes(assetId) ? coll.targetIds.filter(x => x !== assetId) : [...coll.targetIds, assetId];
    handleUpdateCollateral(collIndex, { targetIds: ids });
  };

  // ========================================
  // 카드 렌더링: 임대차
  // ========================================
  const renderLeaseCard = (c: LeaseContract) => {
    const targetLabel = getAbbreviatedTargetLabel(c);
    const currentTerm = c.terms[c.terms.length - 1];
    const firstTenant = stakeholders.find(s => c.tenantIds.includes(s.id));
    const extraCount = c.tenantIds.length - 1;

    return (
      <div key={c.id} onClick={() => handleOpenEditLease(c)} className="bg-white border border-[#dadce0] rounded-lg p-3 md:p-4 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex justify-between items-start mb-2 md:mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Home size={12} className="md:w-3.5 md:h-3.5 text-[#1a73e8] flex-shrink-0"/>
              <span className="font-bold text-xs md:text-sm text-[#202124] truncate">{targetLabel}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] md:text-[11px] text-[#5f6368]">
              <User size={10} className="flex-shrink-0"/>
              <span className="truncate">{firstTenant?.name || '미지정'}{extraCount > 0 ? ` 외 ${extraCount}명` : ''}</span>
            </div>
          </div>
          {getStatusBadge(c.status)}
        </div>
        {currentTerm && (
          <>
            <div className="flex items-center gap-1 text-[9px] md:text-[11px] text-[#5f6368] mb-2">
              <Calendar size={10} className="flex-shrink-0"/>
              <span className="whitespace-nowrap">{currentTerm.startDate.substring(2)} ~ {currentTerm.endDate.substring(2)}</span>
              {c.terms.length > 1 && <span className="text-[8px] bg-[#f1f3f4] px-1 rounded font-bold">{currentTerm.termNumber}차</span>}
            </div>
            <div className="border-t border-[#f1f3f4] pt-2 flex justify-between items-end">
              <div>
                <div className="text-[8px] md:text-[10px] text-[#5f6368]">보증금</div>
                <div className="font-bold text-xs md:text-sm text-[#1a73e8] tracking-tight">{formatMoney(currentTerm.deposit)}</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] md:text-[10px] text-[#5f6368]">월 임대료</div>
                <div className="font-bold text-xs md:text-sm text-[#34a853] tracking-tight">{formatMoney(currentTerm.monthlyRent)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ========================================
  // 카드 렌더링: 용역
  // ========================================
  const renderMaintenanceCard = (c: MaintenanceContract) => {
    const vendor = stakeholders.find(s => s.id === c.vendorId);
    const facility = facilities.find(f => f.id === c.facilityId);
    return (
      <div key={c.id} onClick={() => handleOpenEditMaint(c)} className="bg-white border border-[#dadce0] rounded-lg p-3 md:p-4 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex justify-between items-start mb-2 md:mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Wrench size={12} className="md:w-3.5 md:h-3.5 text-[#fbbc05] flex-shrink-0"/>
              <span className="font-bold text-xs md:text-sm text-[#202124] truncate">{facility?.name || c.details || '단지 용역'}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] md:text-[11px] text-[#5f6368]">
              <Building size={10} className="flex-shrink-0"/>
              <span className="truncate">{vendor?.name || '미지정'}</span>
            </div>
          </div>
          {getStatusBadge(c.status)}
        </div>
        <div className="flex items-center gap-1 text-[9px] md:text-[11px] text-[#5f6368] mb-2">
          <Calendar size={10} className="flex-shrink-0"/>
          <span className="whitespace-nowrap">{c.term.startDate.substring(2)} ~ {c.term.endDate.substring(2)}</span>
        </div>
        <div className="border-t border-[#f1f3f4] pt-2">
          <div className="text-[8px] md:text-[10px] text-[#5f6368]">월 용역비</div>
          <div className="font-bold text-xs md:text-sm text-[#ea4335] tracking-tight">{formatMoney(c.monthlyCost)}/월</div>
        </div>
      </div>
    );
  };

  // ========================================
  // 층별 임대현황 단면도 (LEASE 탭)
  // ========================================
  const renderFloorDiagram = () => {
    if (!selectedProperty || selectedProperty.buildings.length === 0) {
      return renderEmptyState('임대차');
    }

    const effectiveBldgId = selectedBldgId || selectedProperty.buildings[0]?.id || '';
    const building = selectedProperty.buildings.find(b => b.id === effectiveBldgId) || selectedProperty.buildings[0];
    if (!building) return renderEmptyState('임대차');

    const bldgUnits = propertyUnits.filter(u => u.buildingId === building.id);

    // spec + 유닛 기준 모든 층 번호 (내림차순 = 위→아래)
    const allFloorNumbers = [...new Set([
      ...building.spec.floors.map(f => f.floorNumber),
      ...bldgUnits.map(u => u.floor),
    ])].sort((a, b) => b - a);

    const getFloorSpec = (n: number) => building.spec.floors.find(f => f.floorNumber === n);
    const getFloorLabel = (n: number) => n > 0 ? `${n}F` : `B${Math.abs(n)}`;

    const getContractForUnit = (unitId: string): LeaseContract | undefined => {
      const cs = leaseContracts.filter(c =>
        c.targetIds.includes(unitId) && (c.type === 'LEASE_OUT' || c.type === 'LEASE_IN')
      );
      const active = cs.find(c => c.status === 'ACTIVE');
      if (active) return active;
      return cs.sort((a, b) => {
        const ae = a.terms[a.terms.length - 1]?.endDate || '';
        const be = b.terms[b.terms.length - 1]?.endDate || '';
        return be.localeCompare(ae);
      })[0];
    };

    const activeCount = bldgUnits.filter(u =>
      leaseContracts.some(c => c.targetIds.includes(u.id) && c.status === 'ACTIVE')
    ).length;

    // 단면도 전용 금액 포맷: 항상 만원 단위
    const diagramMoney = (amount: number) => {
      const v = amount / 10000;
      const s = v % 1 === 0 ? Math.floor(v).toLocaleString('ko-KR') : v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
      return s + '만';
    };

    const toggleZone = (zoneId: string) => {
      setSelectedZoneIds(prev => prev.includes(zoneId) ? prev.filter(x => x !== zoneId) : [...prev, zoneId]);
    };

    // 필터 로직
    let filteredFloorNumbers = allFloorNumbers;
    if (diagramFilters.floorFrom !== null) filteredFloorNumbers = filteredFloorNumbers.filter(f => f >= diagramFilters.floorFrom!);
    if (diagramFilters.floorTo !== null) filteredFloorNumbers = filteredFloorNumbers.filter(f => f <= diagramFilters.floorTo!);
    const hasActiveFilters = diagramFilters.floorFrom !== null || diagramFilters.floorTo !== null ||
      diagramFilters.statuses.length > 0 || diagramFilters.tenantSearch.trim() !== '' || diagramFilters.expiryMonths !== null;

    const shouldShowUnit = (unit: Unit, contract: LeaseContract | undefined): boolean => {
      const isActive = contract?.status === 'ACTIVE';
      const isExpired = contract?.status === 'EXPIRED' || contract?.status === 'TERMINATED';
      if (diagramFilters.statuses.length > 0) {
        if (isActive && !diagramFilters.statuses.includes('ACTIVE')) return false;
        if (isExpired && !diagramFilters.statuses.includes('EXPIRED')) return false;
        if (!contract && !diagramFilters.statuses.includes('VACANT')) return false;
      }
      if (diagramFilters.tenantSearch.trim()) {
        const search = diagramFilters.tenantSearch.trim().toLowerCase();
        if (!isActive) return false;
        const tenant = stakeholders.find(s => contract!.tenantIds.includes(s.id));
        if (!tenant?.name.toLowerCase().includes(search)) return false;
      }
      if (diagramFilters.expiryMonths !== null) {
        if (!contract || contract.status !== 'ACTIVE') return false;
        const currentTerm = contract.terms[contract.terms.length - 1];
        if (!currentTerm?.endDate) return false;
        const endDate = new Date(currentTerm.endDate);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() + diagramFilters.expiryMonths);
        if (endDate > cutoff) return false;
      }
      return true;
    };

    // 선택된 구역 중 계약 존재 여부
    const selectedHaveContracts = selectedZoneIds.some(zoneId => {
      if (!zoneId.startsWith('FLOOR|')) return leaseContracts.some(c => c.targetIds.includes(zoneId));
      return leaseContracts.some(c => c.targetType === 'FLOOR' && c.targetIds.includes(zoneId));
    });

    // 합계 계산 (필터된 층 기준)
    const summaryData = (() => {
      let totalArea = 0, tenantCount = 0, depositSum = 0, monthlyRentSum = 0, maintenanceFeeSum = 0;
      const seenContracts = new Set<string>();
      filteredFloorNumbers.forEach(floorNum => {
        const floorSpec = getFloorSpec(floorNum);
        if (floorSpec) totalArea += floorSpec.area;
        const floorUnits = bldgUnits.filter(u => u.floor === floorNum);
        floorUnits.forEach(unit => {
          const ct = getContractForUnit(unit.id);
          if (ct?.status === 'ACTIVE' && !seenContracts.has(ct.id)) {
            seenContracts.add(ct.id);
            tenantCount += ct.tenantIds.length;
            const term = ct.terms[ct.terms.length - 1];
            if (term) {
              depositSum += term.deposit;
              monthlyRentSum += term.monthlyRent;
              maintenanceFeeSum += term.costItems?.reduce((sum: number, ci: CostItem) => sum + ci.amount, 0) || 0;
            }
          }
        });
        const floorZoneId = makeFloorId(building.id, floorNum);
        const floorContract = leaseContracts.find(c =>
          c.targetType === 'FLOOR' && c.targetIds.includes(floorZoneId) &&
          c.status === 'ACTIVE' && (c.type === 'LEASE_OUT' || c.type === 'LEASE_IN') && !seenContracts.has(c.id)
        );
        if (floorContract) {
          seenContracts.add(floorContract.id);
          tenantCount += floorContract.tenantIds.length;
          const term = floorContract.terms[floorContract.terms.length - 1];
          if (term) {
            depositSum += term.deposit;
            monthlyRentSum += term.monthlyRent;
            maintenanceFeeSum += term.costItems?.reduce((sum: number, ci: CostItem) => sum + ci.amount, 0) || 0;
          }
        }
      });
      leaseContracts.filter(c =>
        c.targetType === 'BUILDING' && c.targetIds.includes(building.id) &&
        c.status === 'ACTIVE' && !seenContracts.has(c.id)
      ).forEach(c => {
        seenContracts.add(c.id);
        tenantCount += c.tenantIds.length;
        const term = c.terms[c.terms.length - 1];
        if (term) {
          depositSum += term.deposit;
          monthlyRentSum += term.monthlyRent;
          maintenanceFeeSum += term.costItems?.reduce((sum: number, ci: CostItem) => sum + ci.amount, 0) || 0;
        }
      });
      return { totalArea, tenantCount, depositSum, monthlyRentSum, maintenanceFeeSum };
    })();

    const renderUnitBlock = (unit: Unit, idx: number) => {
      const contract = getContractForUnit(unit.id);
      const isActive = contract?.status === 'ACTIVE';
      const isExpired = contract?.status === 'EXPIRED' || contract?.status === 'TERMINATED';
      const currentTerm = contract?.terms[contract.terms.length - 1];
      const tenant = isActive ? stakeholders.find(s => contract!.tenantIds.includes(s.id)) : null;
      const extraTenants = (isActive && contract) ? contract.tenantIds.length - 1 : 0;
      const isSelected = selectedZoneIds.includes(unit.id);

      let bgClass: string, leftBorder: string, labelText: string, labelClass: string;
      if (isActive) {
        bgClass = 'bg-[#e8f0fe]';
        leftBorder = 'border-l-2 border-l-[#1a73e8]';
        labelText = '임대중';
        labelClass = 'text-[#1a73e8]';
      } else if (isExpired) {
        bgClass = 'bg-[#f8f9fa]';
        leftBorder = 'border-l border-l-[#dadce0]';
        labelText = contract!.status === 'EXPIRED' ? '만료' : '해지';
        labelClass = 'text-gray-400';
      } else {
        bgClass = 'bg-white';
        leftBorder = 'border-l border-l-[#dadce0]';
        labelText = '공실';
        labelClass = 'text-gray-400';
      }

      const matchesFilter = !hasActiveFilters || shouldShowUnit(unit, contract);

      const handleClick = (e: React.MouseEvent) => {
        if (selectionMode || e.ctrlKey || e.metaKey) {
          e.stopPropagation();
          toggleZone(unit.id);
        } else {
          if (contract) handleOpenEditLease(contract);
          else handleOpenAddLease(false, unit.id);
        }
      };

      return (
        <div
          key={unit.id}
          onClick={handleClick}
          style={{ flex: 1 }}
          className={`relative ${bgClass} ${idx > 0 ? leftBorder : ''} px-2 py-1 md:px-2.5 md:py-1.5 cursor-pointer transition-all flex flex-col justify-between min-w-0 overflow-hidden ${!isSelected ? 'hover:opacity-90' : ''} ${!matchesFilter ? 'opacity-20 pointer-events-none' : ''}`}
        >
          {/* 선택 오버레이 */}
          {isSelected && (
            <div className="absolute inset-0 ring-2 ring-inset ring-[#1a73e8] bg-[#1a73e8]/10 pointer-events-none z-10"/>
          )}
          {/* 선택 체크 아이콘 */}
          {isSelected && (
            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#1a73e8] rounded-full flex items-center justify-center z-20 pointer-events-none">
              <Check size={9} className="text-white" strokeWidth={3}/>
            </div>
          )}
          {/* 1줄: 호실번호 + 임차인/용도 + 상태 */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="font-black text-[9px] md:text-[10px] text-[#202124] leading-tight flex-shrink-0">
                {unit.unitNumber}호
              </span>
              {isActive && tenant ? (
                <span className="text-[9px] md:text-[10px] font-bold text-[#3c4043] truncate leading-tight">
                  {tenant.name}{extraTenants > 0 ? ` 외 ${extraTenants}` : ''}
                </span>
              ) : (
                <span className="text-[8px] md:text-[9px] text-[#9aa0a6] truncate leading-tight">{unit.usage}</span>
              )}
            </div>
            {!isSelected && (
              <span className={`text-[8px] md:text-[9px] font-bold whitespace-nowrap flex-shrink-0 ${labelClass}`}>
                {labelText}
              </span>
            )}
          </div>
          {/* 2줄: 보증금 / 월차임 (만원 단위) */}
          {isActive && currentTerm && (
            <div className="text-[8px] md:text-[9px] text-[#5f6368] whitespace-nowrap leading-tight">
              <span className="font-bold">{diagramMoney(currentTerm.deposit)}</span>
              <span className="mx-0.5 text-[#dadce0]">·</span>
              <span className="font-bold text-[#1a73e8]">{diagramMoney(currentTerm.monthlyRent)}/월</span>
            </div>
          )}
        </div>
      );
    };

    const renderFloorRow = (floorNum: number) => {
      const floorSpec = getFloorSpec(floorNum);
      const floorUnits = bldgUnits.filter(u => u.floor === floorNum);
      const hasPlan = floorPlans.some(p => p.propertyId === selectedProperty!.id && p.buildingId === building.id && p.floorNumber === floorNum);
      return (
        <div key={floorNum} className="flex items-stretch border-b border-[#dadce0] last:border-b-0" style={{ minHeight: 60 }}>
          {/* 층 레이블 - 클릭 시 도면 뷰어 열기 */}
          <div
            onClick={() => { setViewerFloorNumber(floorNum); setFloorPlanViewerOpen(true); }}
            className="w-10 md:w-14 flex-shrink-0 flex flex-col items-center justify-center bg-[#f8f9fa] border-r border-[#dadce0] cursor-pointer hover:bg-[#e8f0fe] transition-colors group"
            title="클릭하여 도면 보기"
          >
            <span className="font-black text-[10px] md:text-[11px] text-[#3c4043] group-hover:text-[#1a73e8]">{getFloorLabel(floorNum)}</span>
            {hasPlan && <FileImage size={10} className="text-[#1a73e8] mt-0.5" />}
          </div>
          {/* 호실 블록 영역 */}
          <div className="flex-1 flex overflow-hidden">
            {floorUnits.length === 0 ? (() => {
              const floorZoneId = makeFloorId(building.id, floorNum);
              const isFloorSelected = selectedZoneIds.includes(floorZoneId);
              const floorContract = leaseContracts.find(c =>
                c.targetType === 'FLOOR' &&
                c.targetIds.some(id => { const p = parseFloorId(id); return !!p && p.bldgId === building.id && p.floor === floorNum; }) &&
                (c.type === 'LEASE_OUT' || c.type === 'LEASE_IN')
              );
              const handleFloorZoneClick = (e: React.MouseEvent, defaultAction: () => void) => {
                if (selectionMode || e.ctrlKey || e.metaKey) { e.stopPropagation(); toggleZone(floorZoneId); }
                else defaultAction();
              };
              const selectionOverlay = isFloorSelected && (
                <>
                  <div className="absolute inset-0 ring-2 ring-inset ring-[#1a73e8] bg-[#1a73e8]/10 pointer-events-none z-10"/>
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#1a73e8] rounded-full flex items-center justify-center z-20 pointer-events-none">
                    <Check size={9} className="text-white" strokeWidth={3}/>
                  </div>
                </>
              );
              if (floorContract) {
                const fcTenant = stakeholders.find(s => floorContract.tenantIds.includes(s.id));
                const fcTerm = floorContract.terms[floorContract.terms.length - 1];
                const isActive = floorContract.status === 'ACTIVE';
                return (
                  <div onClick={e => handleFloorZoneClick(e, () => handleOpenEditLease(floorContract))}
                    className={`relative flex-1 flex items-center justify-between px-3 cursor-pointer ${!isFloorSelected ? 'hover:opacity-90' : ''} ${isActive ? 'bg-[#e8f0fe]' : 'bg-[#f8f9fa]'}`}
                  >
                    {selectionOverlay}
                    <div className="min-w-0">
                      <span className={`text-[9px] font-bold ${isActive ? 'text-[#1a73e8]' : 'text-gray-400'}`}>
                        {isActive ? '임대중' : floorContract.status === 'EXPIRED' ? '만료' : '해지'}
                      </span>
                      {fcTenant && <span className="text-[9px] text-[#3c4043] ml-2 font-bold">{fcTenant.name}</span>}
                    </div>
                    {fcTerm && <span className="text-[8px] font-bold text-[#1a73e8] whitespace-nowrap">{diagramMoney(fcTerm.monthlyRent)}/월</span>}
                  </div>
                );
              }
              return (
                <div onClick={e => handleFloorZoneClick(e, () => {})}
                  className={`relative flex-1 flex items-center justify-between bg-[#f8f9fa] px-3 cursor-pointer ${!isFloorSelected ? 'hover:bg-[#f1f3f4]' : ''}`}
                >
                  {selectionOverlay}
                  <span className="text-[9px] md:text-[10px] text-[#9aa0a6]">
                    {floorSpec?.usage || '미등록'}
                  </span>
                  {!selectionMode && !isFloorSelected && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const nc = createEmptyLeaseContract('LEASE_OUT');
                        nc.targetType = 'FLOOR';
                        nc.targetIds = [floorZoneId];
                        setModalBldgId(building.id);
                        setLeaseForm(nc);
                        setEditingContractId(null);
                        setLeaseModalTab('BASIC');
                        setSelectedTermIndex(null);
                        setEditingCollateralIndex(null);
                        setIsLeaseModalOpen(true);
                      }}
                      className="relative z-20 flex items-center gap-0.5 text-[#1a73e8] text-[8px] md:text-[9px] font-bold hover:text-[#1557b0] whitespace-nowrap ml-2"
                    >
                      <Plus size={10}/> 계약 등록
                    </button>
                  )}
                </div>
              );
            })() : (<>
              {floorUnits.map((unit, idx) => renderUnitBlock(unit, idx))}
              {/* 미지정 구역 (등록 호실 면적 < 층 면적) */}
              {(() => {
                if (!floorSpec || floorSpec.area <= 0) return null;
                const usedArea = floorUnits.reduce((sum, u) => sum + (u.area || 0), 0);
                const remainingArea = floorSpec.area - usedArea;
                if (remainingArea < 0.1) return null;
                const floorZoneId = makeFloorId(building.id, floorNum);
                const isZoneSelected = selectedZoneIds.includes(floorZoneId);
                const zoneContract = leaseContracts.find(c =>
                  c.targetType === 'FLOOR' &&
                  c.targetIds.some(id => { const p = parseFloorId(id); return !!p && p.bldgId === building.id && p.floor === floorNum; }) &&
                  (c.type === 'LEASE_OUT' || c.type === 'LEASE_IN')
                );
                const zcTenant = zoneContract ? stakeholders.find(s => zoneContract.tenantIds.includes(s.id)) : null;
                const zcTerm = zoneContract?.terms[zoneContract.terms.length - 1];
                const zcActive = zoneContract?.status === 'ACTIVE';
                const handleZoneClick = (e: React.MouseEvent) => {
                  if (selectionMode || e.ctrlKey || e.metaKey) { e.stopPropagation(); toggleZone(floorZoneId); }
                  else if (zoneContract) handleOpenEditLease(zoneContract);
                  else {
                    const nc = createEmptyLeaseContract('LEASE_OUT');
                    nc.targetType = 'FLOOR';
                    nc.targetIds = [floorZoneId];
                    setModalBldgId(building.id);
                    setLeaseForm(nc);
                    setEditingContractId(null);
                    setLeaseModalTab('BASIC');
                    setSelectedTermIndex(null);
                    setEditingCollateralIndex(null);
                    setIsLeaseModalOpen(true);
                  }
                };
                return (
                  <div
                    onClick={handleZoneClick}
                    style={{ flex: 1 }}
                    className={`relative ${zcActive ? 'bg-[#e8f0fe]' : 'bg-[#f8f9fa]'} border-l border-l-[#dadce0] px-2 py-1.5 md:px-2.5 md:py-2 cursor-pointer transition-all flex flex-col justify-between min-w-0 overflow-hidden ${!isZoneSelected ? 'hover:opacity-90' : ''}`}
                  >
                    {isZoneSelected && (
                      <>
                        <div className="absolute inset-0 ring-2 ring-inset ring-[#1a73e8] bg-[#1a73e8]/10 pointer-events-none z-10"/>
                        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#1a73e8] rounded-full flex items-center justify-center z-20 pointer-events-none">
                          <Check size={9} className="text-white" strokeWidth={3}/>
                        </div>
                      </>
                    )}
                    {zoneContract ? (
                      <>
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <span className="font-bold text-[8px] md:text-[9px] text-[#9aa0a6]">미지정</span>
                          {!isZoneSelected && (
                            <span className={`text-[8px] font-bold whitespace-nowrap ${zcActive ? 'text-[#1a73e8]' : 'text-gray-400'}`}>
                              {zcActive ? '임대중' : zoneContract.status === 'EXPIRED' ? '만료' : '해지'}
                            </span>
                          )}
                        </div>
                        {zcTenant && <span className="text-[8px] md:text-[9px] font-bold text-[#3c4043] truncate block leading-tight">{zcTenant.name}</span>}
                        {zcActive && zcTerm && (
                          <div className="text-[8px] text-[#1a73e8] font-bold whitespace-nowrap mt-0.5">{diagramMoney(zcTerm.monthlyRent)}/월</div>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[8px] md:text-[9px] text-[#9aa0a6] font-bold">미지정</span>
                        <span className="text-[8px] text-[#b0b0b0]">{remainingArea.toFixed(1)}㎡</span>
                      </>
                    )}
                  </div>
                );
              })()}
            </>)}
          </div>
        </div>
      );
    };

    const LEGEND = [
      { bg: 'bg-[#e8f0fe]', border: 'border-[#1a73e8]', label: '임대중' },
      { bg: 'bg-white',     border: 'border-[#dadce0]', label: '공실' },
      { bg: 'bg-[#f8f9fa]', border: 'border-[#dadce0]', label: '미등록' },
    ];

    return (
      <div className="p-3 md:p-4">
        {/* 건물 탭 (복수 건물) */}
        {selectedProperty.buildings.length > 1 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {selectedProperty.buildings.map(b => (
              <button key={b.id} onClick={() => { setSelectedBldgId(b.id); setSelectedZoneIds([]); setDiagramFilters({ floorFrom: null, floorTo: null, statuses: [], tenantSearch: '', expiryMonths: null }); }}
                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap transition-all ${
                  effectiveBldgId === b.id
                    ? 'bg-[#1a73e8] text-white'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}

        {/* 건물 단위 계약 */}
        {(() => {
          const bldgContracts = getLeaseContractsForProp().filter(c => c.targetType === 'BUILDING' && c.targetIds.includes(building.id));
          if (bldgContracts.length === 0) return null;
          return (
            <div className="mb-3">
              <div className="text-[9px] font-bold text-[#5f6368] uppercase tracking-wide mb-1.5">건물 단위 계약</div>
              <div className="space-y-1.5">
                {bldgContracts.map(c => {
                  const tenant = stakeholders.find(s => c.tenantIds.includes(s.id));
                  const currentTerm = c.terms[c.terms.length - 1];
                  return (
                    <div key={c.id} onClick={() => handleOpenEditLease(c)}
                      className="border-l-4 border-[#1a73e8] bg-[#e8f0fe] rounded-r-lg px-3 py-2 cursor-pointer hover:opacity-90 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-[#1a73e8] block">건물 전체 · {building.name}</span>
                        <span className="text-[10px] font-black text-[#3c4043] truncate block">{tenant?.name || '임차인 미지정'}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {currentTerm && (
                          <>
                            <div className="text-[8px] text-[#5f6368]">{currentTerm.startDate.substring(2)} ~ {currentTerm.endDate.substring(2)}</div>
                            <div className="text-[9px] font-bold text-[#5f6368]">
                              {diagramMoney(currentTerm.deposit)} · <span className="text-[#1a73e8]">{diagramMoney(currentTerm.monthlyRent)}/월</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 단면도 */}
        {allFloorNumbers.length === 0 ? renderEmptyState('층별 정보') : (
          <div id="floor-diagram-container" className="border border-[#dadce0] rounded-lg overflow-hidden">
            {/* 범례 + 통계 + 건물전체 등록 버튼 */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#f8f9fa] border-b border-[#dadce0]">
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                {LEGEND.map(({ bg, border, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${bg} border ${border} flex-shrink-0`}/>
                    <span className="text-[8px] md:text-[9px] text-[#5f6368]">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[9px] md:text-[10px] font-black text-[#5f6368] whitespace-nowrap">
                  {activeCount} / {bldgUnits.length}호
                </span>
                <button
                  onClick={() => { setSelectionMode(m => !m); if (selectionMode) setSelectedZoneIds([]); }}
                  title="구역 선택 모드 (또는 Ctrl+클릭)"
                  className={`flex items-center gap-0.5 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap transition-all ${selectionMode ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] border border-[#dadce0] hover:bg-[#f1f3f4]'}`}
                >
                  <MousePointer2 size={9}/> {selectionMode ? '선택중' : '선택'}
                </button>
                <button
                  onClick={() => {
                    const nc = createEmptyLeaseContract('LEASE_OUT');
                    nc.targetType = 'BUILDING';
                    nc.targetIds = [building.id];
                    setLeaseForm(nc);
                    setEditingContractId(null);
                    setLeaseModalTab('BASIC');
                    setSelectedTermIndex(null);
                    setEditingCollateralIndex(null);
                    setIsLeaseModalOpen(true);
                  }}
                  className="flex items-center gap-0.5 text-[#1a73e8] text-[8px] md:text-[9px] font-bold hover:text-[#1557b0] border border-[#1a73e8] px-1.5 py-0.5 rounded whitespace-nowrap"
                >
                  <Plus size={9}/> 건물 전체
                </button>
                <button
                  onClick={() => {
                    const rowsEl = document.getElementById('floor-diagram-rows');
                    if (!rowsEl) return;
                    const w = window.open('', '_blank', 'width=800,height=1100');
                    if (!w) return;
                    const floorCount = filteredFloorNumbers.length;
                    const rowH = Math.min(40, Math.max(26, Math.floor(700 / Math.max(floorCount, 1))));
                    const cloned = rowsEl.cloneNode(true) as HTMLElement;
                    cloned.style.maxHeight = 'none';
                    cloned.style.overflow = 'visible';
                    cloned.removeAttribute('id');
                    // 행 높이 조정
                    cloned.querySelectorAll(':scope > div').forEach(el => {
                      (el as HTMLElement).style.minHeight = rowH + 'px';
                    });
                    // 선택 오버레이/체크마크 제거
                    cloned.querySelectorAll('.ring-2, .ring-inset').forEach(el => el.remove());
                    cloned.querySelectorAll('[class*="bg-[#1a73e8]"][class*="rounded-full"]').forEach(el => {
                      if ((el as HTMLElement).querySelector('svg')) el.remove();
                    });
                    // 버튼 제거
                    cloned.querySelectorAll('button').forEach(el => el.remove());
                    // 합계 푸터 HTML
                    const footerEl = document.querySelector('#floor-diagram-container .border-t-2');
                    const footerHtml = footerEl ? (footerEl.cloneNode(true) as HTMLElement).outerHTML : '';
                    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${building.name} 층별 계약현황</title>
<style>
@page { size: A4 portrait; margin: 10mm 12mm; }
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
}
* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Malgun Gothic','Apple SD Gothic Neo',sans-serif; }
body { color: #202124; font-size: 9px; line-height: 1.3; }
.hdr { text-align: center; padding: 10px 0 8px; border-bottom: 2px solid #1a73e8; }
.hdr h2 { font-size: 14px; font-weight: 900; }
.hdr p { font-size: 9px; color: #5f6368; margin-top: 2px; }
.wrap { border: 1px solid #dadce0; border-radius: 4px; overflow: hidden; margin-top: 6px; }
.legend { display:flex; align-items:center; gap:10px; padding:6px 10px; background:#f8f9fa; border-bottom:1px solid #dadce0; font-size:8px; }
.legend-item { display:flex; align-items:center; gap:3px; }
.legend-box { width:9px; height:9px; border-radius:2px; border:1px solid; }
.legend-right { margin-left:auto; font-weight:900; color:#5f6368; font-size:9px; }
/* Layout */
.flex { display:flex; } .flex-1 { flex:1; } .flex-col { flex-direction:column; }
.items-center { align-items:center; } .items-stretch { align-items:stretch; }
.justify-between { justify-content:space-between; } .justify-center { justify-content:center; }
.gap-1 { gap:3px; } .gap-2 { gap:6px; } .gap-3 { gap:10px; } .gap-5 { gap:16px; }
.min-w-0 { min-width:0; } .flex-shrink-0 { flex-shrink:0; }
.overflow-hidden { overflow:hidden; }
.px-2 { padding-left:6px; padding-right:6px; } .px-3 { padding-left:10px; padding-right:10px; }
.py-1 { padding-top:3px; padding-bottom:3px; } .py-2 { padding-top:6px; padding-bottom:6px; }
.mb-0\\.5 { margin-bottom:2px; } .mt-0\\.5 { margin-top:2px; } .mx-0\\.5 { margin-left:2px; margin-right:2px; }
.border-b { border-bottom:1px solid #dadce0; } .border-r { border-right:1px solid #dadce0; }
.border-l { border-left:1px solid #dadce0; } .border-l-2 { border-left-width:2px; border-left-style:solid; }
.border-t-2 { border-top:2px solid #1a73e8; }
.w-10 { width:36px; } .w-14 { width:48px; }
.last\\:border-b-0:last-child { border-bottom:none; }
.truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.whitespace-nowrap { white-space:nowrap; }
.text-right { text-align:right; } .text-center { text-align:center; }
/* Colors */
.bg-\\[\\#e8f0fe\\] { background:#e8f0fe; } .bg-\\[\\#f8f9fa\\] { background:#f8f9fa; }
.bg-\\[\\#d2e3fc\\] { background:#d2e3fc; } .bg-white { background:#fff; }
.text-\\[\\#1a73e8\\] { color:#1a73e8; } .text-\\[\\#34a853\\] { color:#34a853; }
.text-\\[\\#ea4335\\] { color:#ea4335; } .text-\\[\\#3c4043\\] { color:#3c4043; }
.text-\\[\\#5f6368\\] { color:#5f6368; } .text-\\[\\#9aa0a6\\] { color:#9aa0a6; }
.text-\\[\\#202124\\] { color:#202124; } .text-\\[\\#b0b0b0\\] { color:#b0b0b0; }
.text-\\[\\#dadce0\\] { color:#dadce0; } .text-gray-400 { color:#9ca3af; }
.border-l-\\[\\#1a73e8\\] { border-left-color:#1a73e8; }
.border-l-\\[\\#dadce0\\] { border-left-color:#dadce0; }
.border-\\[\\#dadce0\\] { border-color:#dadce0; }
.border-\\[\\#1a73e8\\] { border-color:#1a73e8; }
.border-\\[\\#1a73e8\\]\\/30 { border-color:rgba(26,115,232,0.3); }
/* Font weight/size */
.font-black { font-weight:900; } .font-bold { font-weight:700; }
.text-\\[7px\\] { font-size:7px; } .text-\\[8px\\] { font-size:8px; }
.text-\\[9px\\] { font-size:9px; } .text-\\[10px\\] { font-size:10px; } .text-\\[11px\\] { font-size:11px; }
.leading-tight { line-height:1.2; }
/* Opacity for filtered */
.opacity-20 { opacity:0.2; } .pointer-events-none { pointer-events:none; }
/* Hide interactive elements */
button, svg { display:none !important; }
</style></head><body>
<div class="hdr">
  <h2>${selectedProperty?.name || ''} · ${building.name}</h2>
  <p>층별 계약현황 · ${new Date().toLocaleDateString('ko-KR')} · 금액단위: 만원</p>
</div>
<div class="wrap">
  <div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:#e8f0fe;border-color:#1a73e8;"></div><span>임대중</span></div>
    <div class="legend-item"><div class="legend-box" style="background:#fff;border-color:#dadce0;"></div><span>공실</span></div>
    <div class="legend-item"><div class="legend-box" style="background:#f8f9fa;border-color:#dadce0;"></div><span>미등록</span></div>
    <div class="legend-right">${activeCount} / ${bldgUnits.length}호</div>
  </div>
  ${cloned.outerHTML}
  ${footerHtml}
</div>
</body></html>`);
                    w.document.close();
                    setTimeout(() => { w.print(); w.close(); }, 400);
                  }}
                  className="flex items-center gap-0.5 text-[#5f6368] text-[8px] md:text-[9px] font-bold hover:text-[#202124] border border-[#dadce0] px-1.5 py-0.5 rounded whitespace-nowrap"
                >
                  <Printer size={9}/> 인쇄
                </button>
              </div>
            </div>
            {/* 필터 툴바 */}
            <div className="border-b border-[#dadce0]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-white">
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-1 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded transition-all ${
                    showFilters || hasActiveFilters ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'
                  }`}
                >
                  <Filter size={10}/> 필터
                  {hasActiveFilters && <span className="w-1.5 h-1.5 bg-[#ea4335] rounded-full"/>}
                </button>
                <div className="flex items-center gap-1">
                  {[
                    { label: '지상', fn: () => setDiagramFilters(prev => prev.floorFrom === 1 && prev.floorTo === null ? { ...prev, floorFrom: null } : { ...prev, floorFrom: 1, floorTo: null }), active: diagramFilters.floorFrom === 1 && diagramFilters.floorTo === null },
                    { label: '지하', fn: () => setDiagramFilters(prev => prev.floorFrom === null && prev.floorTo === 0 ? { ...prev, floorTo: null } : { ...prev, floorFrom: null, floorTo: 0 }), active: diagramFilters.floorFrom === null && diagramFilters.floorTo === 0 },
                    { label: '공실', fn: () => setDiagramFilters(prev => ({ ...prev, statuses: prev.statuses.includes('VACANT') ? prev.statuses.filter(s => s !== 'VACANT') : [...prev.statuses.filter(s => s !== 'ACTIVE' && s !== 'EXPIRED'), 'VACANT'] })), active: diagramFilters.statuses.includes('VACANT') && diagramFilters.statuses.length === 1 },
                  ].map(p => (
                    <button key={p.label} onClick={p.fn}
                      className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${
                        p.active ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] border border-[#dadce0] hover:bg-[#f1f3f4]'
                      }`}>{p.label}</button>
                  ))}
                  {hasActiveFilters && (
                    <button onClick={() => setDiagramFilters({ floorFrom: null, floorTo: null, statuses: [], tenantSearch: '', expiryMonths: null })}
                      className="text-[8px] md:text-[9px] font-bold text-[#ea4335] px-1.5 py-0.5 rounded hover:bg-red-50 transition-all"
                    >초기화</button>
                  )}
                </div>
              </div>
              {showFilters && (
                <div className="px-3 py-2 bg-[#f8f9fa] border-t border-[#dadce0] space-y-2">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] md:text-[9px] font-bold text-[#5f6368]">층 범위:</span>
                      <input type="number" placeholder="부터" className="w-12 border border-[#dadce0] rounded px-1.5 py-0.5 text-[9px] text-center"
                        value={diagramFilters.floorFrom ?? ''} onChange={e => setDiagramFilters(prev => ({ ...prev, floorFrom: e.target.value ? Number(e.target.value) : null }))}/>
                      <span className="text-[8px] text-[#5f6368]">~</span>
                      <input type="number" placeholder="까지" className="w-12 border border-[#dadce0] rounded px-1.5 py-0.5 text-[9px] text-center"
                        value={diagramFilters.floorTo ?? ''} onChange={e => setDiagramFilters(prev => ({ ...prev, floorTo: e.target.value ? Number(e.target.value) : null }))}/>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] md:text-[9px] font-bold text-[#5f6368]">상태:</span>
                      {(['ACTIVE', 'VACANT', 'EXPIRED'] as const).map(status => {
                        const labels = { ACTIVE: '임대중', VACANT: '공실', EXPIRED: '만료' };
                        const isOn = diagramFilters.statuses.includes(status);
                        return (
                          <button key={status} onClick={() => setDiagramFilters(prev => ({
                            ...prev, statuses: isOn ? prev.statuses.filter(s => s !== status) : [...prev.statuses, status]
                          }))} className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${isOn ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#5f6368]'}`}
                          >{labels[status]}</button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] md:text-[9px] font-bold text-[#5f6368]">임차인:</span>
                      <input type="text" placeholder="이름 검색..." className="w-24 border border-[#dadce0] rounded px-1.5 py-0.5 text-[9px]"
                        value={diagramFilters.tenantSearch} onChange={e => setDiagramFilters(prev => ({ ...prev, tenantSearch: e.target.value }))}/>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] md:text-[9px] font-bold text-[#5f6368]">만료 임박:</span>
                      <select className="border border-[#dadce0] rounded px-1.5 py-0.5 text-[9px] bg-white"
                        value={diagramFilters.expiryMonths ?? ''} onChange={e => setDiagramFilters(prev => ({ ...prev, expiryMonths: e.target.value ? Number(e.target.value) : null }))}>
                        <option value="">전체</option>
                        <option value="1">1개월 이내</option>
                        <option value="3">3개월 이내</option>
                        <option value="6">6개월 이내</option>
                        <option value="12">12개월 이내</option>
                      </select>
                    </div>
                  </div>
                  {(() => {
                    const totalUnits = bldgUnits.length;
                    const occupiedUnits = bldgUnits.filter(u => leaseContracts.some(c => c.targetIds.includes(u.id) && c.status === 'ACTIVE')).length;
                    const rate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] md:text-[9px] font-bold text-[#5f6368]">입주율:</span>
                        <div className="flex-1 h-2 bg-[#dadce0] rounded-full overflow-hidden max-w-[150px]">
                          <div className="h-full bg-[#1a73e8] rounded-full transition-all" style={{ width: `${rate}%` }}/>
                        </div>
                        <span className="text-[9px] font-black text-[#1a73e8]">{rate}%</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            {/* 층별 행 */}
            <div id="floor-diagram-rows" className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              {filteredFloorNumbers.map(renderFloorRow)}
            </div>
            {/* 합계 푸터 */}
            <div className="flex items-stretch border-t-2 border-[#1a73e8] bg-[#e8f0fe]">
              <div className="w-10 md:w-14 flex-shrink-0 flex items-center justify-center bg-[#d2e3fc] border-r border-[#1a73e8]/30">
                <span className="font-black text-[9px] md:text-[10px] text-[#1a73e8]">합계</span>
              </div>
              <div className="flex-1 flex items-center gap-3 md:gap-5 px-3 py-2 overflow-x-auto">
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-[7px] md:text-[8px] text-[#5f6368] whitespace-nowrap">면적</span>
                  <span className="text-[9px] md:text-[10px] font-black text-[#202124] whitespace-nowrap">{formatArea(summaryData.totalArea)}</span>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-[7px] md:text-[8px] text-[#5f6368] whitespace-nowrap">임차인</span>
                  <span className="text-[9px] md:text-[10px] font-black text-[#202124] whitespace-nowrap">{summaryData.tenantCount}명</span>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-[7px] md:text-[8px] text-[#5f6368] whitespace-nowrap">보증금</span>
                  <span className="text-[9px] md:text-[10px] font-black text-[#1a73e8] whitespace-nowrap">{diagramMoney(summaryData.depositSum)}</span>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-[7px] md:text-[8px] text-[#5f6368] whitespace-nowrap">월차임</span>
                  <span className="text-[9px] md:text-[10px] font-black text-[#34a853] whitespace-nowrap">{diagramMoney(summaryData.monthlyRentSum)}/월</span>
                </div>
                {summaryData.maintenanceFeeSum > 0 && (
                  <div className="flex flex-col items-center min-w-0">
                    <span className="text-[7px] md:text-[8px] text-[#5f6368] whitespace-nowrap">관리비</span>
                    <span className="text-[9px] md:text-[10px] font-black text-[#ea4335] whitespace-nowrap">{diagramMoney(summaryData.maintenanceFeeSum)}/월</span>
                  </div>
                )}
              </div>
            </div>
            {/* 구역 선택 액션바 */}
            {selectedZoneIds.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#202124] border-t border-[#3c4043]">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-[#1a73e8] rounded-full flex items-center justify-center flex-shrink-0">
                    <Check size={9} className="text-white" strokeWidth={3}/>
                  </div>
                  <span className="text-[10px] font-bold text-white whitespace-nowrap">{selectedZoneIds.length}개 구역 선택됨</span>
                  <span className="text-[9px] text-gray-400 hidden md:inline">· Ctrl+클릭으로 추가선택</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedZoneIds([]); setSelectionMode(false); }}
                    className="text-[10px] text-gray-400 hover:text-white font-bold px-2 py-1 rounded transition-all"
                  >취소</button>
                  {selectedHaveContracts && (
                    <button
                      onClick={handleDeleteFromSelection}
                      className="bg-[#ea4335] text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-[#c5221f] transition-all"
                    >삭제</button>
                  )}
                  {selectedHaveContracts && selectedZoneIds.length >= 2 && (
                    <button
                      onClick={handleMergeFromSelection}
                      className="bg-[#34a853] text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-[#2d8e47] transition-all flex items-center gap-1"
                    ><Merge size={10}/> 병합</button>
                  )}
                  <button
                    onClick={handleRegisterFromSelection}
                    className="bg-[#1a73e8] text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-[#1557b0] transition-all"
                  >등록</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ========================================
  // 빈 상태
  // ========================================
  const renderEmptyState = (label: string) => (
    <div className="flex flex-col items-center justify-center py-16 md:py-24 text-gray-300">
      <FileText size={40} className="mb-3 opacity-50"/>
      <p className="font-bold text-xs md:text-sm">{label} 계약이 없습니다.</p>
    </div>
  );

  // ========================================
  // 탭 컨텐츠
  // ========================================
  const renderTabContent = () => {
    if (activeTab === 'LEASE') {
      return renderFloorDiagram();
    }
    if (activeTab === 'SUBLEASE') {
      const contracts = getSubleaseContractsForProp();
      if (contracts.length === 0) return renderEmptyState('전대차');
      return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4">{contracts.map(c => renderLeaseCard(c))}</div>;
    }
    if (activeTab === 'SERVICE') {
      const contracts = getMaintenanceContractsForProp();
      if (contracts.length === 0) return renderEmptyState('용역');
      return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4">{contracts.map(c => renderMaintenanceCard(c))}</div>;
    }
    const labels: Record<string, string> = { CONSTRUCTION: '도급', INSURANCE: '보험', SURETY: '보증보험' };
    return renderEmptyState(labels[activeTab] || '');
  };

  const canAddContract = activeTab === 'LEASE' || activeTab === 'SUBLEASE' || activeTab === 'SERVICE';

  // ========================================
  // 공통 UI 컴포넌트: 태그 선택기 (임대인/임차인 복수 선택)
  // ========================================
  const renderTagSelector = (
    label: string,
    selectedIds: string[],
    candidates: Stakeholder[],
    field: 'landlordIds' | 'tenantIds'
  ) => (
    <div>
      <label className="text-[11px] font-bold text-gray-400 block mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selectedIds.map(id => {
          const s = stakeholders.find(sh => sh.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 bg-[#e8f0fe] text-[#1a73e8] px-2 py-1 rounded-full text-[10px] md:text-xs font-bold">
              {s?.name || id}
              <button type="button" onClick={() => handleRemoveId(field, id)} className="hover:bg-[#d2e3fc] rounded-full p-0.5"><X size={10}/></button>
            </span>
          );
        })}
      </div>
      <select
        className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
        value=""
        onChange={e => { handleAddId(field, e.target.value); }}
      >
        <option value="">추가 선택...</option>
        {candidates.filter(s => !selectedIds.includes(s.id)).map(s => (
          <option key={s.id} value={s.id}>{s.name}{s.representative ? ` (${s.representative})` : ''}</option>
        ))}
      </select>
    </div>
  );

  // ========================================
  // 임대차 모달: 탭 1 - 기본정보
  // ========================================
  const renderBasicTab = () => {
    const isSublease = leaseForm.type === 'SUBLEASE_OUT' || leaseForm.type === 'SUBLEASE_IN';
    return (
      <div className="space-y-5 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {/* 계약유형 */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">계약유형</label>
            <select
              className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
              value={leaseForm.type}
              onChange={e => updateLeaseForm({ type: e.target.value as LeaseType })}
            >
              {isSublease ? (
                <>
                  <option value="SUBLEASE_OUT">전대 (임대)</option>
                  <option value="SUBLEASE_IN">전대 (임차)</option>
                </>
              ) : (
                <>
                  <option value="LEASE_OUT">임대</option>
                  <option value="LEASE_IN">임차</option>
                </>
              )}
            </select>
          </div>

          {/* 대상 구분 + 층별 체크리스트 */}
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">임대 대상</label>
            {/* 호실 / 층 / 건물 토글 */}
            <div className="flex gap-1.5 mb-2">
              {([['UNIT', '호실 단위'], ['FLOOR', '층 단위'], ['BUILDING', '건물 단위']] as const).map(([tt, label]) => (
                <button key={tt} type="button"
                  onClick={() => {
                    if (tt === 'FLOOR') setModalBldgId(selectedProperty?.buildings[0]?.id || '');
                    updateLeaseForm({ targetType: tt as ContractTargetType, targetIds: [] });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${leaseForm.targetType === tt ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {leaseForm.targetType === 'FLOOR' ? (() => {
              const effBldgId = modalBldgId || selectedProperty?.buildings[0]?.id || '';
              const modalBldg = selectedProperty?.buildings.find(b => b.id === effBldgId);
              const floorsSorted = modalBldg ? [...modalBldg.spec.floors].sort((a, b) => b.floorNumber - a.floorNumber) : [];
              const allFloorIds = floorsSorted.map(f => makeFloorId(effBldgId, f.floorNumber));
              const allSelected = allFloorIds.length > 0 && allFloorIds.every(id => leaseForm.targetIds.includes(id));
              return (
                <>
                  {/* 건물 탭 (복수 건물) */}
                  {selectedProperty && selectedProperty.buildings.length > 1 && (
                    <div className="flex gap-1.5 mb-2">
                      {selectedProperty.buildings.map(b => (
                        <button key={b.id} type="button"
                          onClick={() => {
                            setModalBldgId(b.id);
                            updateLeaseForm({ targetIds: leaseForm.targetIds.filter(id => { const p = parseFloorId(id); return !!p && p.bldgId === b.id; }) });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${effBldgId === b.id ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'}`}
                        >{b.name}</button>
                      ))}
                    </div>
                  )}
                  {!modalBldg ? (
                    <div className="border border-[#dadce0] rounded-lg px-3 py-3 text-[10px] text-gray-400 text-center">등록된 건물이 없습니다</div>
                  ) : floorsSorted.length === 0 ? (
                    <div className="border border-[#dadce0] rounded-lg px-3 py-3 text-[10px] text-gray-400 text-center">층별 정보가 없습니다. 건축물대장을 먼저 조회해주세요.</div>
                  ) : (
                    <div className="border border-[#dadce0] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#f8f9fa] border-b border-[#dadce0]">
                        <span className="text-[9px] text-[#5f6368] font-bold">총 {floorsSorted.length}층</span>
                        <button type="button"
                          onClick={() => {
                            if (allSelected) updateLeaseForm({ targetIds: leaseForm.targetIds.filter(id => !allFloorIds.includes(id)) });
                            else updateLeaseForm({ targetIds: [...new Set([...leaseForm.targetIds, ...allFloorIds])] });
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${allSelected ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8]'}`}
                        >전체 선택</button>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {floorsSorted.map(f => {
                          const fid = makeFloorId(effBldgId, f.floorNumber);
                          const isChecked = leaseForm.targetIds.includes(fid);
                          return (
                            <label key={f.floorNumber} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#f8f9fa] cursor-pointer border-b border-[#f1f3f4] last:border-b-0">
                              <input type="checkbox" checked={isChecked}
                                onChange={e => {
                                  if (e.target.checked) updateLeaseForm({ targetIds: [...leaseForm.targetIds, fid] });
                                  else updateLeaseForm({ targetIds: leaseForm.targetIds.filter(x => x !== fid) });
                                }}
                                className="w-3.5 h-3.5 accent-[#1a73e8] flex-shrink-0"
                              />
                              <span className={`text-[10px] font-black w-7 text-right flex-shrink-0 ${isChecked ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>{floorNumLabel(f.floorNumber)}</span>
                              <span className="text-[10px] text-[#5f6368] flex-1">{f.usage}</span>
                              {f.area > 0 && <span className="text-[9px] text-[#9aa0a6] flex-shrink-0">{f.area.toFixed(1)}㎡</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })() : leaseForm.targetType === 'BUILDING' ? (
              /* 건물 단위 체크리스트 */
              <div className="border border-[#dadce0] rounded-lg overflow-hidden">
                {selectedProperty?.buildings.length ? selectedProperty.buildings.map(b => (
                  <label key={b.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#f8f9fa] cursor-pointer border-b border-[#f1f3f4] last:border-b-0">
                    <input type="checkbox"
                      checked={leaseForm.targetIds.includes(b.id)}
                      onChange={e => {
                        if (e.target.checked) updateLeaseForm({ targetIds: [...leaseForm.targetIds, b.id] });
                        else updateLeaseForm({ targetIds: leaseForm.targetIds.filter(x => x !== b.id) });
                      }}
                      className="w-3.5 h-3.5 accent-[#1a73e8]"
                    />
                    <span className="text-xs font-bold text-[#202124]">{b.name}</span>
                  </label>
                )) : (
                  <div className="px-3 py-2 text-[10px] text-gray-400">등록된 건물이 없습니다</div>
                )}
              </div>
            ) : (
              /* 호실 단위 - 층별 그룹 체크리스트 */
              <div className="border border-[#dadce0] rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {(() => {
                  const floorMap = new Map<number, Unit[]>();
                  propertyUnits.forEach(u => {
                    if (!floorMap.has(u.floor)) floorMap.set(u.floor, []);
                    floorMap.get(u.floor)!.push(u);
                  });
                  const floors = Array.from(floorMap.keys()).sort((a, b) => b - a);
                  if (floors.length === 0) return (
                    <div className="px-3 py-3 text-[10px] text-gray-400 text-center">등록된 호실이 없습니다</div>
                  );
                  return floors.map(floor => {
                    const units = floorMap.get(floor)!.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
                    const allSelected = units.every(u => leaseForm.targetIds.includes(u.id));
                    const someSelected = units.some(u => leaseForm.targetIds.includes(u.id));
                    const floorLabel = floor === 0 ? 'B1' : floor < 0 ? `B${Math.abs(floor)}` : `${floor}층`;
                    return (
                      <div key={floor} className="border-b border-[#f1f3f4] last:border-b-0 flex items-center gap-2 px-3 py-2 hover:bg-[#f8f9fa]">
                        <span className={`text-[10px] font-black w-7 text-right flex-shrink-0 ${someSelected ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>{floorLabel}</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 flex-1">
                          {units.map(u => (
                            <label key={u.id} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox"
                                checked={leaseForm.targetIds.includes(u.id)}
                                onChange={e => {
                                  if (e.target.checked) updateLeaseForm({ targetIds: [...leaseForm.targetIds, u.id] });
                                  else updateLeaseForm({ targetIds: leaseForm.targetIds.filter(x => x !== u.id) });
                                }}
                                className="w-3 h-3 accent-[#1a73e8]"
                              />
                              <span className="text-[10px] font-bold text-[#202124]">{u.unitNumber}호</span>
                              <span className="text-[9px] text-[#5f6368]">{u.usage}</span>
                            </label>
                          ))}
                        </div>
                        {units.length > 1 && (
                          <button type="button"
                            onClick={() => {
                              const ids = units.map(u => u.id);
                              if (allSelected) updateLeaseForm({ targetIds: leaseForm.targetIds.filter(x => !ids.includes(x)) });
                              else updateLeaseForm({ targetIds: [...new Set([...leaseForm.targetIds, ...ids])] });
                            }}
                            className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded transition-all ${allSelected ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8] hover:border-[#1a73e8]'}`}
                          >전체</button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            {/* 선택 요약 태그 */}
            {leaseForm.targetIds.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {leaseForm.targetIds.map(id => {
                  const u = propertyUnits.find(u => u.id === id);
                  const b = selectedProperty?.buildings.find(b => b.id === id);
                  const label = u ? `${u.unitNumber}호` : b ? b.name : floorIdToLabel(id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 bg-[#e8f0fe] text-[#1a73e8] px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {label}
                      <button type="button"
                        onClick={() => updateLeaseForm({ targetIds: leaseForm.targetIds.filter(x => x !== id) })}
                        className="hover:opacity-60"
                      ><X size={9}/></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 임대인 */}
          {renderTagSelector('임대인', leaseForm.landlordIds, landlords, 'landlordIds')}

          {/* 임차인 */}
          {renderTagSelector('임차인', leaseForm.tenantIds, tenants, 'tenantIds')}

          {/* 상태 */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">상태</label>
            <select
              className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
              value={leaseForm.status}
              onChange={e => updateLeaseForm({ status: e.target.value as LeaseContract['status'] })}
            >
              <option value="ACTIVE">정상</option>
              <option value="PENDING">대기</option>
              <option value="EXPIRED">만료</option>
              <option value="TERMINATED">해지</option>
            </select>
          </div>

          {/* 최초 계약일 */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">최초 계약일</label>
            <input
              type="date"
              className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
              value={leaseForm.originalContractDate}
              onChange={e => updateLeaseForm({ originalContractDate: e.target.value })}
            />
          </div>
        </div>

        {/* 비고 */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 block mb-1.5">비고</label>
          <textarea
            className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8] min-h-[60px]"
            value={leaseForm.note || ''}
            onChange={e => updateLeaseForm({ note: e.target.value })}
            placeholder="메모 입력..."
          />
        </div>
      </div>
    );
  };

  // ========================================
  // 임대차 모달: 탭 2 - 계약조건
  // ========================================
  const renderConditionsTab = () => {
    const cond = leaseForm.conditions;
    return (
      <div className="space-y-5 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">연장의사 통보기간 (개월)</label>
            <input
              type="number" min="0"
              className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
              value={cond.renewalNoticePeriod ?? ''}
              onChange={e => updateConditions({ renewalNoticePeriod: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">임대료 상승률 (%)</label>
            <input
              type="number" min="0" step="0.1"
              className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
              value={cond.rentIncreaseRate ?? ''}
              onChange={e => updateConditions({ rentIncreaseRate: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">인상 상한 (%)</label>
            <input
              type="number" min="0" step="0.1"
              className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
              value={cond.rentIncreaseCap ?? ''}
              onChange={e => updateConditions({ rentIncreaseCap: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>

        {/* 원상복구 */}
        <div className="bg-[#f8f9fa] p-3 md:p-4 rounded-lg border border-[#dadce0]">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox" className="w-4 h-4 accent-[#1a73e8]"
              checked={cond.restorationRequired}
              onChange={e => updateConditions({ restorationRequired: e.target.checked })}
            />
            <span className="text-xs md:text-sm font-bold text-[#202124]">원상복구 의무</span>
          </label>
          {cond.restorationRequired && (
            <textarea
              className="w-full border border-[#dadce0] p-2.5 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8] min-h-[50px]"
              value={cond.restorationNote || ''}
              onChange={e => updateConditions({ restorationNote: e.target.value })}
              placeholder="원상복구 관련 조건..."
            />
          )}
        </div>

        {/* 전대차 가능 */}
        <div className="bg-[#f8f9fa] p-3 md:p-4 rounded-lg border border-[#dadce0]">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox" className="w-4 h-4 accent-[#1a73e8]"
              checked={cond.subleaseAllowed}
              onChange={e => updateConditions({ subleaseAllowed: e.target.checked })}
            />
            <span className="text-xs md:text-sm font-bold text-[#202124]">전대차 가능</span>
          </label>
          {cond.subleaseAllowed && (
            <textarea
              className="w-full border border-[#dadce0] p-2.5 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8] min-h-[50px]"
              value={cond.subleaseNote || ''}
              onChange={e => updateConditions({ subleaseNote: e.target.value })}
              placeholder="전대차 관련 조건..."
            />
          )}
        </div>

        {/* 특약사항 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[11px] font-bold text-gray-400">특약사항</label>
            <button type="button" onClick={handleAddSpecialTerm} className="text-[10px] md:text-xs font-bold text-[#1a73e8] hover:text-[#1557b0] flex items-center gap-1">
              <Plus size={12}/> 추가
            </button>
          </div>
          <div className="space-y-2">
            {(cond.specialTerms || []).map((st, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[10px] font-bold text-[#5f6368] mt-2.5 w-5 flex-shrink-0">{i + 1}.</span>
                <textarea
                  className="flex-1 border border-[#dadce0] p-2.5 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8] min-h-[40px]"
                  value={st}
                  onChange={e => handleUpdateSpecialTerm(i, e.target.value)}
                  placeholder="특약 내용 입력..."
                />
                <button type="button" onClick={() => handleRemoveSpecialTerm(i)} className="text-gray-300 hover:text-red-400 mt-2"><Trash2 size={14}/></button>
              </div>
            ))}
            {(cond.specialTerms || []).length === 0 && (
              <p className="text-[10px] md:text-xs text-gray-300 text-center py-4">등록된 특약사항이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // 임대차 모달: 탭 3 - 계약이력
  // ========================================
  const renderTermsTab = () => {
    return (
      <div className="space-y-5 md:space-y-6">
        {/* 차수 목록 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm min-w-[500px]">
            <thead className="bg-[#f8f9fa]">
              <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold tracking-tight md:tracking-normal">
                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap">차수</th>
                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap">유형</th>
                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap">기간</th>
                <th className="p-1.5 md:p-2.5 text-right whitespace-nowrap">보증금</th>
                <th className="p-1.5 md:p-2.5 text-right whitespace-nowrap">월 임대료</th>
                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap hidden md:table-cell">인상률</th>
              </tr>
            </thead>
            <tbody>
              {leaseForm.terms.map((term, idx) => (
                <tr
                  key={term.id}
                  onClick={() => setSelectedTermIndex(selectedTermIndex === idx ? null : idx)}
                  className={`border-b border-[#f1f3f4] cursor-pointer transition-all hover:bg-[#f1f3f4] ${selectedTermIndex === idx ? 'bg-[#e8f0fe]' : ''}`}
                >
                  <td className="p-1.5 md:p-2.5 text-center font-bold text-[#202124]">{term.termNumber}차</td>
                  <td className="p-1.5 md:p-2.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold ${
                      term.type === 'NEW' ? 'bg-[#e8f0fe] text-[#1a73e8]' : term.type === 'RENEWAL' ? 'bg-[#e6f4ea] text-[#34a853]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {TERM_TYPE_LABELS[term.type]}
                    </span>
                  </td>
                  <td className="p-1.5 md:p-2.5 text-center text-[10px] md:text-xs text-[#5f6368] whitespace-nowrap">
                    {term.startDate ? `${term.startDate.substring(2)} ~ ${term.endDate ? term.endDate.substring(2) : ''}` : '-'}
                  </td>
                  <td className="p-1.5 md:p-2.5 text-right font-bold text-[#1a73e8] whitespace-nowrap">{formatMoney(term.deposit)}</td>
                  <td className="p-1.5 md:p-2.5 text-right font-bold text-[#34a853] whitespace-nowrap">{formatMoney(term.monthlyRent)}</td>
                  <td className="p-1.5 md:p-2.5 text-center text-[#5f6368] hidden md:table-cell">{term.rentIncreaseRate ? `${term.rentIncreaseRate}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={handleAddTerm} className="text-[10px] md:text-xs font-bold text-[#1a73e8] hover:text-[#1557b0] flex items-center gap-1">
          <Plus size={14}/> 차수 추가
        </button>

        {/* 선택된 차수 편집 패널 */}
        {selectedTermIndex !== null && selectedTermIndex < leaseForm.terms.length && (() => {
          const ti = selectedTermIndex;
          const term = leaseForm.terms[ti];
          return (
            <div className="bg-[#f8f9fa] p-3 md:p-5 rounded-xl border border-[#dadce0] space-y-5">
              <div className="flex justify-between items-center">
                <h4 className="text-xs md:text-sm font-black text-[#202124]">{term.termNumber}차 상세</h4>
                <div className="flex items-center gap-2">
                  <select
                    className="border border-[#dadce0] p-1.5 rounded-lg text-[10px] md:text-xs font-bold bg-white"
                    value={term.type}
                    onChange={e => updateTerm(ti, { type: e.target.value as ContractTerm['type'] })}
                  >
                    <option value="NEW">신규</option>
                    <option value="RENEWAL">갱신</option>
                    <option value="IMPLICIT">묵시적</option>
                  </select>
                  {leaseForm.terms.length > 1 && (
                    <button type="button" onClick={() => {
                      setLeaseForm(prev => ({ ...prev, terms: prev.terms.filter((_, i) => i !== ti) }));
                      setSelectedTermIndex(null);
                    }} className="text-gray-300 hover:text-red-400"><Trash2 size={14}/></button>
                  )}
                </div>
              </div>

              {/* 기간 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">계약 체결일</label>
                  <input type="date" className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={term.contractDate} onChange={e => updateTerm(ti, { contractDate: e.target.value })}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">시작일</label>
                  <input type="date" className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={term.startDate} onChange={e => updateTerm(ti, { startDate: e.target.value })}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">종료일</label>
                  <input type="date" className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={term.endDate} onChange={e => updateTerm(ti, { endDate: e.target.value })}/>
                </div>
              </div>

              {/* 금액 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">보증금</label>
                  <input
                    className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold text-[#1a73e8] bg-white"
                    value={formatNumberInput(term.deposit)}
                    onChange={e => updateTerm(ti, { deposit: parseNumberInput(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">월 임대료</label>
                  <input
                    className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold text-[#34a853] bg-white"
                    value={formatNumberInput(term.monthlyRent)}
                    onChange={e => updateTerm(ti, { monthlyRent: parseNumberInput(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">부가세</label>
                  <select className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={term.rentVatIncluded ? 'TRUE' : 'FALSE'} onChange={e => updateTerm(ti, { rentVatIncluded: e.target.value === 'TRUE' })}>
                    <option value="TRUE">포함</option>
                    <option value="FALSE">별도</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">납입일</label>
                    <input type="number" min="1" max="31" className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={term.paymentDay} onChange={e => updateTerm(ti, { paymentDay: Number(e.target.value) })}/>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">납부</label>
                    <select className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={term.paymentType} onChange={e => updateTerm(ti, { paymentType: e.target.value as 'PREPAID' | 'POSTPAID' })}>
                      <option value="PREPAID">선납</option>
                      <option value="POSTPAID">후납</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 인상률 (갱신 시) */}
              {term.type !== 'NEW' && (
                <div className="w-full md:w-48">
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">인상률 (%)</label>
                  <input
                    type="number" min="0" step="0.1"
                    className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white"
                    value={term.rentIncreaseRate ?? ''}
                    onChange={e => updateTerm(ti, { rentIncreaseRate: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              )}

              {/* 비용항목 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-gray-400">비용항목</label>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_COST_ITEMS.map(label => (
                      <button
                        key={label} type="button"
                        onClick={() => handleAddCostItem(ti, label)}
                        className="text-[8px] md:text-[10px] font-bold text-[#1a73e8] border border-[#d2e3fc] bg-[#e8f0fe] px-1.5 py-0.5 rounded hover:bg-[#d2e3fc] transition-colors"
                      >
                        +{label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddCostItem(ti, '')}
                      className="text-[8px] md:text-[10px] font-bold text-[#5f6368] border border-[#dadce0] px-1.5 py-0.5 rounded hover:bg-gray-50"
                    >
                      +직접입력
                    </button>
                  </div>
                </div>
                {term.costItems.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] md:text-xs min-w-[400px]">
                      <thead>
                        <tr className="text-[8px] md:text-[10px] text-[#5f6368] bg-white border-b border-[#dadce0]">
                          <th className="p-1.5 text-left">항목명</th>
                          <th className="p-1.5 text-center">정산방식</th>
                          <th className="p-1.5 text-right">금액</th>
                          <th className="p-1.5 text-center">부가세</th>
                          <th className="p-1.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {term.costItems.map(ci => (
                          <tr key={ci.id} className="border-b border-[#f1f3f4]">
                            <td className="p-1.5">
                              <input className="border border-[#dadce0] p-1 rounded text-xs font-medium w-full bg-white" value={ci.label} onChange={e => handleUpdateCostItem(ti, ci.id, { label: e.target.value })} placeholder="항목명"/>
                            </td>
                            <td className="p-1.5 text-center">
                              <select className="border border-[#dadce0] p-1 rounded text-[10px] font-bold bg-white" value={ci.method} onChange={e => handleUpdateCostItem(ti, ci.id, { method: e.target.value as SettlementMethod })}>
                                <option value="FIXED">고정</option>
                                <option value="ACTUAL_COST">실비</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input className="border border-[#dadce0] p-1 rounded text-xs font-bold text-right w-full bg-white" value={formatNumberInput(ci.amount)} onChange={e => handleUpdateCostItem(ti, ci.id, { amount: parseNumberInput(e.target.value) })}/>
                            </td>
                            <td className="p-1.5 text-center">
                              <select className="border border-[#dadce0] p-1 rounded text-[10px] font-bold bg-white" value={ci.vatIncluded ? 'Y' : 'N'} onChange={e => handleUpdateCostItem(ti, ci.id, { vatIncluded: e.target.value === 'Y' })}>
                                <option value="Y">포함</option>
                                <option value="N">별도</option>
                              </select>
                            </td>
                            <td className="p-1.5 text-center">
                              <button type="button" onClick={() => handleRemoveCostItem(ti, ci.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={12}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {term.costItems.length === 0 && (
                  <p className="text-[10px] text-gray-300 text-center py-3">등록된 비용항목이 없습니다.</p>
                )}
              </div>

              {/* 첨부파일 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Paperclip size={12}/> 첨부파일</label>
                  <label className="text-[10px] md:text-xs font-bold text-[#1a73e8] hover:text-[#1557b0] flex items-center gap-1 cursor-pointer">
                    <Upload size={12}/> 업로드
                    <input type="file" accept=".pdf,.doc,.docx,.hwp,.jpg,.png" multiple className="hidden" onChange={e => handleFileUpload(ti, e.target.files)}/>
                  </label>
                </div>
                {term.attachments.length > 0 ? (
                  <div className="space-y-1.5">
                    {term.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between bg-white border border-[#dadce0] p-2 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="text-[#1a73e8] flex-shrink-0"/>
                          <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-bold text-[#202124] truncate">{att.name}</p>
                            <p className="text-[8px] md:text-[10px] text-[#5f6368]">{att.fileName} | {att.uploadedAt}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveAttachment(ti, att.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0 ml-2"><X size={14}/></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-300 text-center py-3">첨부된 파일이 없습니다.</p>
                )}
              </div>

              {/* 비고 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">비고</label>
                <textarea
                  className="w-full border border-[#dadce0] p-2 rounded-lg text-xs font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8] min-h-[40px]"
                  value={term.note || ''}
                  onChange={e => updateTerm(ti, { note: e.target.value })}
                  placeholder="메모..."
                />
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // ========================================
  // 임대차 모달: 탭 4 - 담보설정
  // ========================================
  const renderCollateralTab = () => {
    const lots = selectedProperty?.lots || [];
    const buildings = selectedProperty?.buildings || [];

    return (
      <div className="space-y-5 md:space-y-6">
        {/* 담보 목록 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm min-w-[400px]">
            <thead className="bg-[#f8f9fa]">
              <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold">
                <th className="p-1.5 md:p-2.5 text-center">유형</th>
                <th className="p-1.5 md:p-2.5 text-right">금액</th>
                <th className="p-1.5 md:p-2.5 text-center">대상</th>
                <th className="p-1.5 md:p-2.5 text-center">순위</th>
                <th className="p-1.5 md:p-2.5 text-center hidden md:table-cell">설정일</th>
                <th className="p-1.5 md:p-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {leaseForm.collaterals.map((coll, idx) => (
                <tr
                  key={coll.id}
                  onClick={() => setEditingCollateralIndex(editingCollateralIndex === idx ? null : idx)}
                  className={`border-b border-[#f1f3f4] cursor-pointer hover:bg-[#f1f3f4] transition-all ${editingCollateralIndex === idx ? 'bg-[#e8f0fe]' : ''}`}
                >
                  <td className="p-1.5 md:p-2.5 text-center text-[10px] md:text-xs font-bold">{COLLATERAL_TYPE_LABELS[coll.type]}</td>
                  <td className="p-1.5 md:p-2.5 text-right font-bold text-[#1a73e8] whitespace-nowrap">{formatMoney(coll.amount)}</td>
                  <td className="p-1.5 md:p-2.5 text-center text-[10px] md:text-xs">
                    {coll.targetType === 'LOT' ? '토지' : coll.targetType === 'BUILDING' ? '건물' : '공동담보'}
                    {coll.targetIds.length > 0 && <span className="text-[#5f6368] ml-1">({coll.targetIds.length}건)</span>}
                  </td>
                  <td className="p-1.5 md:p-2.5 text-center font-bold">{coll.priority}순위</td>
                  <td className="p-1.5 md:p-2.5 text-center text-[10px] text-[#5f6368] hidden md:table-cell">{coll.registrationDate || '-'}</td>
                  <td className="p-1.5 md:p-2.5">
                    <button type="button" onClick={e => { e.stopPropagation(); handleRemoveCollateral(idx); }} className="text-gray-300 hover:text-red-400"><Trash2 size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leaseForm.collaterals.length === 0 && (
            <p className="text-[10px] md:text-xs text-gray-300 text-center py-6">등록된 담보가 없습니다.</p>
          )}
        </div>

        <button type="button" onClick={handleAddCollateral} className="text-[10px] md:text-xs font-bold text-[#1a73e8] hover:text-[#1557b0] flex items-center gap-1">
          <Plus size={14}/> 담보 추가
        </button>

        {/* 담보 편집 패널 */}
        {editingCollateralIndex !== null && editingCollateralIndex < leaseForm.collaterals.length && (() => {
          const ci = editingCollateralIndex;
          const coll = leaseForm.collaterals[ci];
          return (
            <div className="bg-[#f8f9fa] p-3 md:p-5 rounded-xl border border-[#dadce0] space-y-4">
              <h4 className="text-xs md:text-sm font-black text-[#202124]">담보 상세</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">담보 유형</label>
                  <select className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={coll.type} onChange={e => handleUpdateCollateral(ci, { type: e.target.value as CollateralType })}>
                    <option value="MORTGAGE">근저당권</option>
                    <option value="JEONSE_RIGHT">전세권</option>
                    <option value="GUARANTEE_INSURANCE">보증보험</option>
                    <option value="PLEDGE">질권</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">설정금액</label>
                  <input
                    className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold text-[#1a73e8] bg-white"
                    value={formatNumberInput(coll.amount)}
                    onChange={e => handleUpdateCollateral(ci, { amount: parseNumberInput(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">순위</label>
                  <input type="number" min="1" className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={coll.priority} onChange={e => handleUpdateCollateral(ci, { priority: Number(e.target.value) })}/>
                </div>
              </div>

              {/* 대상유형 및 자산 선택 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">대상유형</label>
                <div className="flex gap-2 mb-3">
                  {(['LOT', 'BUILDING', 'JOINT'] as const).map(tt => (
                    <button
                      key={tt} type="button"
                      onClick={() => handleUpdateCollateral(ci, { targetType: tt, targetIds: [] })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${coll.targetType === tt ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'}`}
                    >
                      {tt === 'LOT' ? '토지' : tt === 'BUILDING' ? '건물' : '공동담보'}
                    </button>
                  ))}
                </div>

                {/* 자산 목록 체크박스 */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(coll.targetType === 'LOT' || coll.targetType === 'JOINT') && lots.map(lot => {
                    const addr = lot.address;
                    const lotLabel = `${addr.eupMyeonDong} ${addr.bonbun}${addr.bubun ? '-' + addr.bubun : ''} (${lot.jimok})`;
                    return (
                      <label key={lot.id} className="flex items-center gap-2 bg-white border border-[#dadce0] p-2 rounded-lg cursor-pointer hover:bg-[#f8f9fa]">
                        <input type="checkbox" className="w-3.5 h-3.5 accent-[#1a73e8]" checked={coll.targetIds.includes(lot.id)} onChange={() => toggleCollateralTarget(ci, lot.id)}/>
                        <span className="text-[10px] md:text-xs font-medium text-[#202124]">[토지] {lotLabel}</span>
                      </label>
                    );
                  })}
                  {(coll.targetType === 'BUILDING' || coll.targetType === 'JOINT') && buildings.map(bld => (
                    <label key={bld.id} className="flex items-center gap-2 bg-white border border-[#dadce0] p-2 rounded-lg cursor-pointer hover:bg-[#f8f9fa]">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-[#1a73e8]" checked={coll.targetIds.includes(bld.id)} onChange={() => toggleCollateralTarget(ci, bld.id)}/>
                      <span className="text-[10px] md:text-xs font-medium text-[#202124]">[건물] {bld.name}</span>
                    </label>
                  ))}
                  {((coll.targetType === 'LOT' && lots.length === 0) || (coll.targetType === 'BUILDING' && buildings.length === 0) || (coll.targetType === 'JOINT' && lots.length === 0 && buildings.length === 0)) && (
                    <p className="text-[10px] text-gray-300 text-center py-2">해당 자산이 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">설정일</label>
                  <input type="date" className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={coll.registrationDate || ''} onChange={e => handleUpdateCollateral(ci, { registrationDate: e.target.value })}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">만료일</label>
                  <input type="date" className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={coll.expirationDate || ''} onChange={e => handleUpdateCollateral(ci, { expirationDate: e.target.value })}/>
                </div>
              </div>

              {/* 보증보험 전용 */}
              {coll.type === 'GUARANTEE_INSURANCE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">보험사</label>
                    <input className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={coll.insuranceCompany || ''} onChange={e => handleUpdateCollateral(ci, { insuranceCompany: e.target.value })} placeholder="보험사명"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">증권번호</label>
                    <input className="w-full border border-[#dadce0] p-2 md:p-2.5 rounded-lg text-xs font-bold bg-white" value={coll.policyNumber || ''} onChange={e => handleUpdateCollateral(ci, { policyNumber: e.target.value })} placeholder="증권번호"/>
                  </div>
                </div>
              )}

              {/* 비고 */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">비고</label>
                <textarea
                  className="w-full border border-[#dadce0] p-2 rounded-lg text-xs font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8] min-h-[40px]"
                  value={coll.note || ''}
                  onChange={e => handleUpdateCollateral(ci, { note: e.target.value })}
                  placeholder="메모..."
                />
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // ========================================
  // 임대차 모달 탭 목록
  // ========================================
  const LEASE_MODAL_TABS: { id: LeaseModalTab; label: string }[] = [
    { id: 'BASIC', label: '기본정보' },
    { id: 'CONDITIONS', label: '계약조건' },
    { id: 'TERMS', label: '계약이력' },
    { id: 'COLLATERAL', label: '담보설정' },
  ];

  // ========================================
  // 메인 렌더
  // ========================================
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
          {properties.map(prop => {
            const propUnitIds = units.filter(u => u.propertyId === prop.id).map(u => u.id);
            const leaseCount = leaseContracts.filter(c => {
              if (c.targetType === 'UNIT') return c.targetIds.some(id => propUnitIds.includes(id));
              if (c.targetType === 'BUILDING') return c.targetIds.some(id => prop.buildings.some(b => b.id === id));
              if (c.targetType === 'FLOOR') return c.targetIds.some(id => { const p = parseFloorId(id); return !!p && prop.buildings.some(b => b.id === p.bldgId); });
              return c.targetIds.includes(prop.id);
            }).length;
            const maintCount = maintenanceContracts.filter(c => c.targetId === prop.id).length;
            const totalCount = leaseCount + maintCount;
            return (
              <button key={prop.id}
                onClick={() => { setSelectedPropId(prop.id); setActiveTab('LEASE'); setSelectedBldgId(prop.buildings[0]?.id || ''); setDiagramFilters({ floorFrom: null, floorTo: null, statuses: [], tenantSearch: '', expiryMonths: null }); setShowFilters(false); }}
                className={`w-full text-left p-3 rounded-lg transition-all border ${selectedPropId === prop.id ? 'bg-white border-[#1a73e8] shadow-sm' : 'bg-white hover:bg-[#f1f3f4] border-transparent'}`}
              >
                <div className="flex justify-between items-start">
                  <h3 className={`font-bold text-sm truncate ${selectedPropId === prop.id ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>
                    {prop.name}
                  </h3>
                  {totalCount > 0 && (
                    <span className="text-[9px] font-bold text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">{totalCount}건</span>
                  )}
                </div>
                <div className="flex items-center text-[10px] text-[#5f6368] mt-1">
                  <MapPin size={10} className="mr-1 flex-shrink-0"/>
                  <span className="truncate">{getPropertyAddress(prop)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 오른쪽: 선택된 물건의 계약 */}
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
              {canAddContract && (
                <button
                  onClick={() => {
                    if (activeTab === 'SERVICE') handleOpenAddMaint();
                    else handleOpenAddLease(activeTab === 'SUBLEASE');
                  }}
                  className="bg-[#1a73e8] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black flex items-center gap-1 md:gap-2 hover:bg-[#1557b0] shadow-xl transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                >
                  <Plus size={14} className="md:w-[18px] md:h-[18px]"/> 계약 등록
                </button>
              )}
            </div>

            {/* 계약 유형 탭 */}
            <div className="flex border-b border-[#dadce0] bg-[#f8f9fa] px-2 md:px-4 overflow-x-auto">
              {CONTRACT_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-3 md:px-6 py-2.5 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wide md:tracking-widest transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-[#1a73e8] text-[#1a73e8] bg-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>
                  {tab.icon} {tab.label}
                  {tabCounts[tab.id] > 0 && <span className="text-[8px] md:text-[10px] ml-0.5">({tabCounts[tab.id]})</span>}
                </button>
              ))}
            </div>

            {/* 계약 카드 그리드 */}
            {renderTabContent()}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm p-16 md:p-24 text-center text-gray-300">
            <Layers size={48} className="mx-auto mb-4 opacity-30"/>
            <p className="font-bold text-sm">왼쪽에서 물건을 선택해 주세요.</p>
          </div>
        )}
      </div>

      {/* ========================================
          계약 병합 선택 모달
          ======================================== */}
      {mergeModalContracts.length > 0 && (
        <Modal onClose={() => { setMergeModalContracts([]); setMergeZoneIds([]); }}>
          <div className="p-4 md:p-6">
            <h3 className="font-black text-sm md:text-base text-[#202124] mb-1 flex items-center gap-2">
              <Merge size={16} className="text-[#34a853]"/> 계약 병합
            </h3>
            <p className="text-[10px] md:text-xs text-[#5f6368] mb-4">선택된 구역에 {mergeModalContracts.length}개의 계약이 있습니다. 기준 계약을 선택하면 나머지 계약은 삭제되고 모든 구역이 기준 계약으로 통합됩니다.</p>
            <div className="space-y-2 mb-4">
              {mergeModalContracts.map(c => {
                const tenant = stakeholders.find(s => c.tenantIds.includes(s.id));
                const currentTerm = c.terms[c.terms.length - 1];
                return (
                  <button key={c.id}
                    onClick={() => {
                      if (confirm(`"${tenant?.name || '미지정'}" 계약을 기준으로 병합하시겠습니까?\n다른 ${mergeModalContracts.length - 1}건의 계약은 삭제됩니다.`)) {
                        executeMerge(c, mergeZoneIds);
                      }
                    }}
                    className="w-full text-left border border-[#dadce0] rounded-lg p-3 hover:border-[#1a73e8] hover:bg-[#e8f0fe] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#202124]">{tenant?.name || '미지정'}</span>
                      <span className={`text-[9px] font-bold ${c.status === 'ACTIVE' ? 'text-[#1a73e8]' : 'text-gray-400'}`}>
                        {c.status === 'ACTIVE' ? '임대중' : c.status === 'EXPIRED' ? '만료' : '해지'}
                      </span>
                    </div>
                    {currentTerm && (
                      <div className="text-[10px] text-[#5f6368]">
                        <span>보증금 {formatMoney(currentTerm.deposit)}</span>
                        <span className="mx-1 text-[#dadce0]">·</span>
                        <span>월차임 {formatMoney(currentTerm.monthlyRent)}/월</span>
                        <span className="mx-1 text-[#dadce0]">·</span>
                        <span>{currentTerm.startDate?.substring(2)} ~ {currentTerm.endDate?.substring(2)}</span>
                      </div>
                    )}
                    <div className="text-[9px] text-[#9aa0a6] mt-1">대상: {getAbbreviatedTargetLabel(c)}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setMergeModalContracts([]); setMergeZoneIds([]); }}
                className="text-xs font-bold text-[#5f6368] hover:text-[#202124] px-4 py-2">취소</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================
          임대차 수정/등록 모달 (4개 탭)
          ======================================== */}
      {isLeaseModalOpen && (
        <Modal onClose={() => { setIsLeaseModalOpen(false); setEditingContractId(null); }} disableOverlayClick={true}>
          <div className="p-4 md:p-8">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 md:pb-5 mb-4 md:mb-6">
              <h3 className="text-base md:text-xl font-black text-[#202124] flex items-center gap-2">
                <Shuffle size={20} className="md:w-6 md:h-6 text-[#1a73e8]"/>
                {(leaseForm.type === 'SUBLEASE_OUT' || leaseForm.type === 'SUBLEASE_IN') ? '전대차' : '임대차'} 계약 {editingContractId ? '수정' : '등록'}
              </h3>
              <button onClick={() => { setIsLeaseModalOpen(false); setEditingContractId(null); }} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {/* 모달 내부 탭 */}
            <div className="flex border-b border-[#dadce0] mb-5 md:mb-6 overflow-x-auto">
              {LEASE_MODAL_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setLeaseModalTab(tab.id)}
                  className={`px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${leaseModalTab === tab.id ? 'border-b-2 border-[#1a73e8] text-[#1a73e8]' : 'text-[#5f6368] hover:text-[#202124]'}`}
                >
                  {tab.label}
                  {tab.id === 'TERMS' && leaseForm.terms.length > 0 && <span className="ml-1 text-[8px]">({leaseForm.terms.length})</span>}
                  {tab.id === 'COLLATERAL' && leaseForm.collaterals.length > 0 && <span className="ml-1 text-[8px]">({leaseForm.collaterals.length})</span>}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            {leaseModalTab === 'BASIC' && renderBasicTab()}
            {leaseModalTab === 'CONDITIONS' && renderConditionsTab()}
            {leaseModalTab === 'TERMS' && renderTermsTab()}
            {leaseModalTab === 'COLLATERAL' && renderCollateralTab()}

            {/* 하단 버튼 */}
            <div className="flex gap-4 border-t border-gray-100 pt-5 md:pt-8 mt-5 md:mt-8">
              <button onClick={() => { setIsLeaseModalOpen(false); setEditingContractId(null); }} className="flex-1 py-2.5 md:py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-gray-50 transition-colors text-xs md:text-sm">취소</button>
              <button onClick={handleSaveLease} className="flex-1 bg-[#1a73e8] text-white py-2.5 md:py-4 rounded-xl font-black shadow-2xl hover:bg-[#1557b0] transition-all active:scale-95 text-xs md:text-sm">{editingContractId ? '수정 저장' : '저장'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================
          용역계약 수정/등록 모달
          ======================================== */}
      {isMaintenanceModalOpen && (
        <Modal onClose={() => { setIsMaintenanceModalOpen(false); setEditingContractId(null); }} disableOverlayClick={true}>
          <div className="p-4 md:p-8">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 md:pb-5 mb-4 md:mb-6">
              <h3 className="text-base md:text-xl font-black text-[#202124] flex items-center gap-2">
                <Wrench size={20} className="md:w-6 md:h-6 text-[#fbbc05]"/>
                용역계약 {editingContractId ? '수정' : '등록'}
              </h3>
              <button onClick={() => { setIsMaintenanceModalOpen(false); setEditingContractId(null); }} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {/* 대상 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">대상 물건</label>
                <select
                  className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  value={maintForm.targetId}
                  onChange={e => setMaintForm({ ...maintForm, targetId: e.target.value })}
                >
                  <option value="">선택</option>
                  <option value={selectedPropId}>{selectedProperty?.name} (전체)</option>
                </select>
              </div>

              {/* 업체 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">업체</label>
                <select
                  className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  value={maintForm.vendorId}
                  onChange={e => setMaintForm({ ...maintForm, vendorId: e.target.value })}
                >
                  <option value="">선택</option>
                  {vendors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.representative ? ` (${s.representative})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* 시설 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">시설</label>
                <select
                  className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  value={maintForm.facilityId || ''}
                  onChange={e => setMaintForm({ ...maintForm, facilityId: e.target.value || undefined })}
                >
                  <option value="">선택 안함</option>
                  {propertyFacilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* 서비스유형 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">서비스 유형</label>
                <select
                  className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  value={maintForm.serviceType}
                  onChange={e => setMaintForm({ ...maintForm, serviceType: e.target.value as MaintenanceContract['serviceType'] })}
                >
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* 시작일 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">시작일</label>
                <input type="date" className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white" value={maintForm.term?.startDate} onChange={e => setMaintForm({ ...maintForm, term: { ...maintForm.term!, startDate: e.target.value } })}/>
              </div>

              {/* 종료일 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">종료일</label>
                <input type="date" className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white" value={maintForm.term?.endDate} onChange={e => setMaintForm({ ...maintForm, term: { ...maintForm.term!, endDate: e.target.value } })}/>
              </div>

              {/* 월 용역비 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">월 용역비</label>
                <input
                  className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold text-[#ea4335] bg-white"
                  value={formatNumberInput(maintForm.monthlyCost)}
                  onChange={e => setMaintForm({ ...maintForm, monthlyCost: parseNumberInput(e.target.value) })}
                />
              </div>

              {/* 납입일 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">납입일</label>
                <input type="number" min="1" max="31" className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white" value={maintForm.paymentDay || ''} onChange={e => setMaintForm({ ...maintForm, paymentDay: Number(e.target.value) })}/>
              </div>

              {/* 반복여부 */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-3">
                  <input type="checkbox" className="w-4 h-4 accent-[#1a73e8]" checked={maintForm.isRecurring} onChange={e => setMaintForm({ ...maintForm, isRecurring: e.target.checked })}/>
                  <span className="text-xs md:text-sm font-bold text-[#202124]">반복 계약</span>
                </label>
              </div>

              {/* 상태 */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">상태</label>
                <select
                  className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  value={maintForm.status}
                  onChange={e => setMaintForm({ ...maintForm, status: e.target.value as 'ACTIVE' | 'EXPIRED' })}
                >
                  <option value="ACTIVE">정상</option>
                  <option value="EXPIRED">만료</option>
                </select>
              </div>

              {/* 상세내용 */}
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-gray-400 block mb-1.5">상세내용</label>
                <textarea
                  className="w-full border border-[#dadce0] p-2.5 md:p-3 rounded-lg text-xs md:text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-[#1a73e8] min-h-[80px]"
                  value={maintForm.details || ''}
                  onChange={e => setMaintForm({ ...maintForm, details: e.target.value })}
                  placeholder="계약 상세 내용..."
                />
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-4 border-t border-gray-100 pt-5 md:pt-8 mt-5 md:mt-8">
              <button onClick={() => { setIsMaintenanceModalOpen(false); setEditingContractId(null); }} className="flex-1 py-2.5 md:py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-gray-50 transition-colors text-xs md:text-sm">취소</button>
              <button onClick={handleSaveMaint} className="flex-1 bg-[#1a73e8] text-white py-2.5 md:py-4 rounded-xl font-black shadow-2xl hover:bg-[#1557b0] transition-all active:scale-95 text-xs md:text-sm">{editingContractId ? '수정 저장' : '저장'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 도면 뷰어 */}
      {floorPlanViewerOpen && viewerFloorNumber !== null && selectedProperty && selectedBldgId && (() => {
        const bldg = selectedProperty.buildings.find(b => b.id === selectedBldgId);
        if (!bldg) return null;
        const floorSpec = bldg.spec.floors.find(f => f.floorNumber === viewerFloorNumber);
        const floorArea = floorSpec?.area || 0;
        const bldgUnits = units.filter(u => u.buildingId === selectedBldgId);
        return (
          <FloorPlanViewer
            isOpen={floorPlanViewerOpen}
            onClose={() => { setFloorPlanViewerOpen(false); setViewerFloorNumber(null); }}
            propertyId={selectedProperty.id}
            propertyName={selectedProperty.name}
            building={bldg}
            floorNumber={viewerFloorNumber}
            floorArea={floorArea}
            units={bldgUnits}
            leaseContracts={leaseContracts}
            stakeholders={stakeholders}
            floorPlans={floorPlans}
            floorZones={floorZones}
            onSaveFloorPlan={onSaveFloorPlan}
            onDeleteFloorPlan={onDeleteFloorPlan}
            onSaveZone={onSaveZone}
            onDeleteZone={onDeleteZone}
            allFloorPlans={floorPlans}
          />
        );
      })()}
    </div>
  );
};
