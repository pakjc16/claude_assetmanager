
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Property, Unit, Building, JibunAddress, Facility, BuildingSpec, Lot, PropertyPhoto, FloorDetail, FloorPlan, FloorZone, ZoneDetail, ZoneUsage, LeaseContract, Stakeholder } from '../types';
import { MapPin, Plus, X, Building as BuildingIcon, Edit2, Layers, Home, Info, Trash2, Ruler, Search, Loader2, FileImage, Grid3X3, Check } from 'lucide-react';
import { AddressSearch } from './AddressSearch';
import { AppSettings } from '../App';
import FloorPlanViewer from './FloorPlanViewer';

// 토지임야목록조회 API 호출 함수
interface LandInfo {
  pnu: string;
  ldCodeNm: string;      // 법정동명
  mnnmSlno: string;      // 지번
  lndcgrCodeNm: string;  // 지목명
  lndpclAr: number;      // 면적(㎡)
}

// PNU를 건축물대장 API 파라미터로 변환
// PNU 구조: 시군구코드(5) + 법정동코드(5) + 대지구분(1) + 본번(4) + 부번(4) = 19자리
interface BuildingApiParams {
  sigunguCd: string;   // 시군구코드 (5자리)
  bjdongCd: string;    // 법정동코드 (5자리)
  platGbCd: string;    // 대지구분코드 (0:대지, 1:산, 2:블록)
  bun: string;         // 본번 (4자리, 앞 0 유지)
  ji: string;          // 부번 (4자리, 앞 0 유지)
}

const pnuToBuildingParams = (pnu: string): BuildingApiParams | null => {
  if (!pnu || pnu.length !== 19) {
    console.error('유효하지 않은 PNU:', pnu);
    return null;
  }

  // PNU의 11번째 자리(대지구분)는 건축물대장 API에서 -1 적용 필요
  // PNU: 1=대지, 2=산 → API: 0=대지, 1=산
  const pnuPlatGb = parseInt(pnu.substring(10, 11));
  const apiPlatGbCd = String(pnuPlatGb - 1);

  return {
    sigunguCd: pnu.substring(0, 5),
    bjdongCd: pnu.substring(5, 10),
    platGbCd: apiPlatGbCd,
    bun: pnu.substring(11, 15),
    ji: pnu.substring(15, 19)
  };
};

// 건축물대장 표제부 응답 인터페이스
interface BuildingTitleInfo {
  mgmBldrgstPk: string;       // 관리건축물대장PK
  bldNm: string;              // 건물명
  dongNm: string;             // 동명칭
  mainPurpsCdNm: string;      // 주용도코드명
  etcPurps: string;           // 기타용도
  strctCdNm: string;          // 구조코드명
  etcStrct: string;           // 기타구조
  grndFlrCnt: number;         // 지상층수
  ugrndFlrCnt: number;        // 지하층수
  archArea: number;           // 건축면적
  totArea: number;            // 연면적
  totDongTotArea: number;     // 총동연면적
  heit: number;               // 높이
  platArea: number;           // 대지면적
  bcRat: number;              // 건폐율
  vlRat: number;              // 용적률
  rideUseElvtCnt: number;     // 승용승강기수
  emgenUseElvtCnt: number;    // 비상용승강기수
  hhldCnt: number;            // 세대수
  hoCnt: number;              // 호수
  useAprDay: string;          // 사용승인일
  pmsDay: string;             // 허가일
  stcnsDay: string;           // 착공일
  roofCdNm: string;           // 지붕코드명
  indrMechUtcnt: number;      // 옥내기계식대수
  indrAutoUtcnt: number;      // 옥내자주식대수
  oudrMechUtcnt: number;      // 옥외기계식대수
  oudrAutoUtcnt: number;      // 옥외자주식대수
  engrGrade: string;          // 에너지효율등급
  gnBldGrade: string;         // 친환경건축물등급
  itgBldGrade: string;        // 지능형건축물등급
  rserthqkDsgnApplyYn: string; // 내진설계적용여부
}

// 건축물대장 층별개요 응답 인터페이스
interface BuildingFloorInfo {
  flrGbCd: string;      // 층구분코드
  flrGbCdNm: string;    // 층구분코드명 (지상/지하)
  flrNo: number;        // 층번호
  flrNoNm: string;      // 층번호명
  strctCdNm: string;    // 구조코드명
  mainPurpsCdNm: string; // 주용도코드명
  etcPurps: string;     // 기타용도
  area: number;         // 면적
  areaExctYn: string;   // 면적제외여부
  dongNm: string;       // 동명칭
}

// 건축물대장 표제부 조회
const fetchBuildingTitleInfo = async (pnu: string, apiKey: string): Promise<BuildingTitleInfo[]> => {
  const params = pnuToBuildingParams(pnu);
  if (!params) return [];

  try {
    const url = `/api/building/getBrTitleInfo?serviceKey=${encodeURIComponent(apiKey)}&sigunguCd=${params.sigunguCd}&bjdongCd=${params.bjdongCd}&platGbCd=${params.platGbCd}&bun=${params.bun}&ji=${params.ji}&numOfRows=100&pageNo=1&_type=json`;
    console.log('[건축물대장 표제부] 요청:', url);
    console.log('[건축물대장 표제부] 파라미터:', params);

    const res = await fetch(url);
    const data = await res.json();
    console.log('[건축물대장 표제부] 응답:', data);

    const items = data.response?.body?.items?.item;
    if (!items) return [];

    const itemList = Array.isArray(items) ? items : [items];

    return itemList.map((item: any) => ({
      mgmBldrgstPk: item.mgmBldrgstPk || '',
      bldNm: item.bldNm || '',
      dongNm: item.dongNm || '',
      mainPurpsCdNm: item.mainPurpsCdNm || '',
      etcPurps: item.etcPurps || '',
      strctCdNm: item.strctCdNm || '',
      etcStrct: item.etcStrct || '',
      grndFlrCnt: parseInt(item.grndFlrCnt) || 0,
      ugrndFlrCnt: parseInt(item.ugrndFlrCnt) || 0,
      archArea: parseFloat(item.archArea) || 0,
      totArea: parseFloat(item.totArea) || 0,
      totDongTotArea: parseFloat(item.totDongTotArea) || 0,
      heit: parseFloat(item.heit) || 0,
      platArea: parseFloat(item.platArea) || 0,
      bcRat: parseFloat(item.bcRat) || 0,
      vlRat: parseFloat(item.vlRat) || 0,
      rideUseElvtCnt: parseInt(item.rideUseElvtCnt) || 0,
      emgenUseElvtCnt: parseInt(item.emgenUseElvtCnt) || 0,
      hhldCnt: parseInt(item.hhldCnt) || 0,
      hoCnt: parseInt(item.hoCnt) || 0,
      useAprDay: item.useAprDay || '',
      pmsDay: item.pmsDay || '',
      stcnsDay: item.stcnsDay || '',
      roofCdNm: item.roofCdNm || '',
      indrMechUtcnt: parseInt(item.indrMechUtcnt) || 0,
      indrAutoUtcnt: parseInt(item.indrAutoUtcnt) || 0,
      oudrMechUtcnt: parseInt(item.oudrMechUtcnt) || 0,
      oudrAutoUtcnt: parseInt(item.oudrAutoUtcnt) || 0,
      engrGrade: item.engrGrade || '',
      gnBldGrade: item.gnBldGrade || '',
      itgBldGrade: item.itgBldGrade || '',
      rserthqkDsgnApplyYn: item.rserthqkDsgnApplyYn || ''
    }));
  } catch (error) {
    console.error('건축물대장 표제부 조회 오류:', error);
    return [];
  }
};

// 건축물대장 층별개요 조회
const fetchBuildingFloorInfo = async (pnu: string, apiKey: string): Promise<BuildingFloorInfo[]> => {
  const params = pnuToBuildingParams(pnu);
  if (!params) return [];

  try {
    const url = `/api/building/getBrFlrOulnInfo?serviceKey=${encodeURIComponent(apiKey)}&sigunguCd=${params.sigunguCd}&bjdongCd=${params.bjdongCd}&platGbCd=${params.platGbCd}&bun=${params.bun}&ji=${params.ji}&numOfRows=500&pageNo=1&_type=json`;
    console.log('[건축물대장 층별개요] 요청:', url);

    const res = await fetch(url);
    const data = await res.json();
    console.log('[건축물대장 층별개요] 응답:', data);

    const items = data.response?.body?.items?.item;
    if (!items) return [];

    const itemList = Array.isArray(items) ? items : [items];

    return itemList.map((item: any) => ({
      flrGbCd: item.flrGbCd || '',
      flrGbCdNm: item.flrGbCdNm || '',
      flrNo: parseInt(item.flrNo) || 0,
      flrNoNm: item.flrNoNm || '',
      strctCdNm: item.strctCdNm || '',
      mainPurpsCdNm: item.mainPurpsCdNm || '',
      etcPurps: item.etcPurps || '',
      area: parseFloat(item.area) || 0,
      areaExctYn: item.areaExctYn || '0',
      dongNm: item.dongNm || ''
    }));
  } catch (error) {
    console.error('건축물대장 층별개요 조회 오류:', error);
    return [];
  }
};

const fetchLandInfo = async (pnu: string, apiKey: string): Promise<LandInfo | null> => {
  try {
    const url = `/api/land/ladfrlList?pnu=${pnu}&format=json&numOfRows=1&pageNo=1&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('[토지정보 API] 응답:', data);

    // 응답 구조에 따라 파싱
    const items = data.ladfrlVOList?.ladfrlVOList || data.ladfrlVOList || [];
    if (items.length > 0) {
      const item = items[0];
      return {
        pnu: item.pnu || pnu,
        ldCodeNm: item.ldCodeNm || '',
        mnnmSlno: item.mnnmSlno || '',
        lndcgrCodeNm: item.lndcgrCodeNm || '',
        lndpclAr: parseFloat(item.lndpclAr) || 0
      };
    }
    return null;
  } catch (error) {
    console.error('토지정보 조회 오류:', error);
    return null;
  }
};

// 지목코드를 약어로 변환
const jimokMap: Record<string, string> = {
  '대': '대', '전': '전', '답': '답', '과수원': '과', '목장용지': '목',
  '임야': '임', '광천지': '광', '염전': '염', '잡종지': '잡', '대지': '대',
  '공장용지': '공', '학교용지': '학', '주차장': '주', '주유소용지': '주',
  '창고용지': '창', '도로': '도', '철도용지': '철', '하천': '천', '제방': '제',
  '구거': '구', '유지': '유', '양어장': '양', '수도용지': '수', '공원': '공',
  '체육용지': '체', '유원지': '원', '종교용지': '종', '사적지': '사', '묘지': '묘'
};

const getJimokAbbr = (jimokName: string): string => {
  return jimokMap[jimokName] || jimokName.charAt(0) || '대';
};

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl rounded-xl shadow-2xl bg-white animate-in zoom-in-95 duration-200 overflow-hidden relative">
        <div className="max-h-[95vh] overflow-y-auto">{children}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent z-10" />
      </div>
    </div>,
    document.body
  );
};

export const getFullAddress = (addr: JibunAddress) => {
    const { sido, sigungu, eupMyeonDong, li, bonbun, bubun } = addr;
    return `${sido} ${sigungu} ${eupMyeonDong} ${li || ''} ${bonbun}${bubun ? '-' + bubun : ''}`.trim().replace(/\s+/g, ' ');
};

interface PropertyManagerProps {
  properties: Property[];
  units: Unit[];
  facilities: Facility[];
  onAddProperty: (prop: Property) => void;
  onUpdateProperty: (prop: Property) => void;
  onDeleteProperty: (id: string) => void;
  onUpdateBuilding: (b: Building) => void;
  onAddUnit: (unit: Unit) => void;
  onUpdateUnit: (unit: Unit) => void;
  formatArea: (areaM2: number) => string;
  formatNumberInput: (num: number | undefined | null) => string;
  parseNumberInput: (str: string) => number;
  formatMoneyInput: (amount: number | undefined | null) => string;
  parseMoneyInput: (str: string) => number;
  moneyLabel: string;
  appSettings: AppSettings;
  // 층/조닝 관련
  leaseContracts: LeaseContract[];
  stakeholders: Stakeholder[];
  floorPlans: FloorPlan[];
  floorZones: FloorZone[];
  onSaveFloorPlan: (plan: FloorPlan) => void;
  onDeleteFloorPlan: (id: string) => void;
  onSaveZone: (zone: FloorZone) => void;
  onDeleteZone: (id: string) => void;
}

// 조닝 세부용도 라벨
const ZONE_USAGE_LABELS: Record<ZoneUsage, string> = {
  STORE: '매장', COMMON: '공용면적', OFFICE: '사무실', MEETING_ROOM: '회의실', RESTAURANT: '식당',
  AUDITORIUM: '강당', STORAGE: '창고', SAMPLE_ROOM: '샘플실', CANTEEN: '캔틴', PARKING: '주차장',
  LIVING_ROOM: '거실', MASTER_BEDROOM: '안방', BEDROOM: '방', BATHROOM: '화장실', CORRIDOR: '동선',
  VOID: '보이드', LANDSCAPE: '조경공간'
};
const ZONE_USAGE_OPTIONS: ZoneUsage[] = ['STORE', 'COMMON', 'OFFICE', 'MEETING_ROOM', 'RESTAURANT', 'AUDITORIUM', 'STORAGE', 'SAMPLE_ROOM', 'CANTEEN', 'PARKING', 'LIVING_ROOM', 'MASTER_BEDROOM', 'BEDROOM', 'BATHROOM', 'CORRIDOR', 'VOID', 'LANDSCAPE'];

export const PropertyManager: React.FC<PropertyManagerProps> = ({
  properties, units, onAddProperty, onUpdateProperty, onDeleteProperty, onAddUnit, onUpdateUnit, formatArea, formatNumberInput, parseNumberInput, formatMoneyInput, parseMoneyInput, moneyLabel, appSettings,
  leaseContracts, stakeholders, floorPlans, floorZones, onSaveFloorPlan, onDeleteFloorPlan, onSaveZone, onDeleteZone
}) => {
  const [selectedPropId, setSelectedPropId] = useState<string>(properties[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LAND' | 'BUILDING' | 'FLOOR' | 'UNIT' | 'ZONING'>('OVERVIEW');
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);

  const [newProp, setNewProp] = useState<Partial<Property>>({
    type: 'LAND_AND_BUILDING', name: '', masterAddress: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' }, roadAddress: ''
  });
  const [displayAddress, setDisplayAddress] = useState('');
  const [propPnu, setPropPnu] = useState('');
  const [propLandInfo, setPropLandInfo] = useState<{ jimok: string; area: number } | null>(null);
  const [isLoadingPropLandInfo, setIsLoadingPropLandInfo] = useState(false);

  const [newUnit, setNewUnit] = useState<Partial<Unit>>({ unitNumber: '', floor: 1, area: 0, usage: '업무시설', status: 'VACANT', buildingId: '', rentType: '월세', deposit: 0, monthlyRent: 0 });

  const [newBuilding, setNewBuilding] = useState<Partial<Building>>({
      name: '', mgmBldrgstPk: '', spec: { buildingArea: 0, grossFloorArea: 0, floorCount: { underground: 0, ground: 1 }, floors: [], completionDate: '', mainUsage: '업무시설', parkingCapacity: 0, elevatorCount: 0 }
  });

  // 건축물대장 API 관련 상태
  const [buildingTitleList, setBuildingTitleList] = useState<BuildingTitleInfo[]>([]);
  const [buildingFloorList, setBuildingFloorList] = useState<BuildingFloorInfo[]>([]);
  const [isLoadingBuildingInfo, setIsLoadingBuildingInfo] = useState(false);
  const [selectedBuildingTitle, setSelectedBuildingTitle] = useState<BuildingTitleInfo | null>(null);

  // 건물 편집 관련 상태
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);

  // 테이블 정렬 상태
  const [unitSortKey, setUnitSortKey] = useState<'floor' | 'area' | 'status'>('floor');
  const [unitSortDesc, setUnitSortDesc] = useState(true);

  // 건물 목록 정렬/필터 상태
  const [buildingSortKey, setBuildingSortKey] = useState<'name' | 'area' | 'floorCount'>('name');
  const [buildingSortDesc, setBuildingSortDesc] = useState(false); // 기본 오름차순
  const [buildingFilter, setBuildingFilter] = useState<string>('');

  // 층별정보 세부 펼침 상태 (건물ID_층번호 형태로 저장)
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  // 층 탭 상태
  const [floorTabBldgId, setFloorTabBldgId] = useState<string>('');
  const [floorTabZoneFilter, setFloorTabZoneFilter] = useState<ZoneUsage | ''>('');
  const [floorPlanViewerOpen, setFloorPlanViewerOpen] = useState(false);
  const [viewerFloorNumber, setViewerFloorNumber] = useState<number | null>(null);

  // 조닝 탭 상태
  const [zoningBldgId, setZoningBldgId] = useState<string>('');
  const [zoningFloorNum, setZoningFloorNum] = useState<number | null>(null);
  const [zoningEditZone, setZoningEditZone] = useState<FloorZone | null>(null);
  const [zoningDetailForm, setZoningDetailForm] = useState<Partial<ZoneDetail>>({});

  // 사진 업로드 모달 상태
  const [isPhotoUploadModalOpen, setIsPhotoUploadModalOpen] = useState(false);
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
  const [photoUploadForm, setPhotoUploadForm] = useState<{
    name: string;
    linkedType: 'PROPERTY' | 'LOT' | 'BUILDING' | 'FLOOR' | 'UNIT';
    linkedLotId: string;
    linkedBuildingId: string;
    linkedFloor: number | null;
    linkedUnitId: string;
  }>({
    name: '',
    linkedType: 'PROPERTY',
    linkedLotId: '',
    linkedBuildingId: '',
    linkedFloor: null,
    linkedUnitId: ''
  });

  // 사진 캐러셀 상태
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 사진 파일 선택 핸들러 (모달 열기)
  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProperty || !e.target.files) return;
    const files = Array.from(e.target.files);
    setPendingPhotoFiles(files);
    setPhotoUploadForm({
      name: files.length === 1 ? files[0].name.replace(/\.[^/.]+$/, '') : '',
      linkedType: 'PROPERTY',
      linkedLotId: '',
      linkedBuildingId: '',
      linkedFloor: null,
      linkedUnitId: ''
    });
    setIsPhotoUploadModalOpen(true);
    e.target.value = ''; // 파일 선택 초기화
  };

  // 사진 업로드 확정 핸들러
  const handlePhotoUploadConfirm = () => {
    if (!selectedProperty || pendingPhotoFiles.length === 0) return;
    const newPhotos: PropertyPhoto[] = pendingPhotoFiles.map((file, idx) => ({
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${idx}`,
      url: URL.createObjectURL(file),
      name: pendingPhotoFiles.length === 1 ? photoUploadForm.name : `${photoUploadForm.name || '사진'}_${idx + 1}`,
      caption: file.name,
      uploadedAt: new Date().toISOString(),
      linkedType: photoUploadForm.linkedType,
      linkedLotId: photoUploadForm.linkedLotId || undefined,
      linkedBuildingId: photoUploadForm.linkedBuildingId || undefined,
      linkedFloor: photoUploadForm.linkedFloor ?? undefined,
      linkedUnitId: photoUploadForm.linkedUnitId || undefined
    }));
    const updatedPhotos = [...(selectedProperty.photos || []), ...newPhotos];
    onUpdateProperty({ ...selectedProperty, photos: updatedPhotos });
    setIsPhotoUploadModalOpen(false);
    setPendingPhotoFiles([]);
  };

  // 기존 사진 추가 핸들러 (호환성 유지)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhotoFileSelect(e);
  };

  // 사진 삭제 핸들러
  const handlePhotoDelete = (photoId: string) => {
    if (!selectedProperty) return;
    const updatedPhotos = (selectedProperty.photos || []).filter(p => p.id !== photoId);
    onUpdateProperty({ ...selectedProperty, photos: updatedPhotos });
    if (currentPhotoIndex >= updatedPhotos.length) {
      setCurrentPhotoIndex(Math.max(0, updatedPhotos.length - 1));
    }
  };

  // 토지(필지) 추가/수정 관련 상태
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [newLot, setNewLot] = useState<Partial<Lot>>({
    address: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' },
    jimok: '대',
    area: 0,
    pnu: ''
  });
  const [lotDisplayAddress, setLotDisplayAddress] = useState('');
  const [isLoadingLandInfo, setIsLoadingLandInfo] = useState(false);

  const selectedProperty = properties.find(p => p.id === selectedPropId);
  const propertyUnits = units.filter(u => u.propertyId === selectedPropId);

  const handleDeleteProperty = () => {
    if (!selectedProperty) return;
    if (!confirm(`"${selectedProperty.name}"을(를) 삭제하시겠습니까?\n\n⚠️ 이 물건에 포함된 토지, 건물, 호실 정보가 모두 삭제됩니다.`)) return;
    onDeleteProperty(selectedProperty.id);
    setSelectedPropId(properties.filter(p => p.id !== selectedProperty.id)[0]?.id || '');
  };

  const handleSaveProperty = async () => {
    if (!newProp.name || !newProp.masterAddress?.sido || !newProp.masterAddress?.bonbun) return;

    if (selectedProperty && selectedPropId === newProp.id) {
        // 기존 물건 수정 - 소재지 변경 시 토지/건물 재조회
        const addrChanged = propPnu && propPnu !== (selectedProperty.lots[0]?.pnu || '');
        if (addrChanged && appSettings.dataGoKrApiKey) {
          const confirmed = confirm('소재지가 변경되었습니다. 토지 및 건물 정보를 새로 조회하시겠습니까?\n\n⚠️ 기존 토지/건물 정보가 새 정보로 대체됩니다.');
          if (confirmed) {
            setIsLoadingBuildingInfo(true);
            const buildings = await registerAllBuildings(propPnu, selectedProperty.id);
            setIsLoadingBuildingInfo(false);
            const firstLot: Lot = {
              id: `lot${Date.now()}`,
              address: { ...newProp.masterAddress! },
              jimok: propLandInfo?.jimok || '대',
              area: propLandInfo?.area || 0,
              pnu: propPnu || undefined
            };
            onUpdateProperty({ ...selectedProperty, ...newProp as Property, lots: [firstLot], buildings, totalLandArea: propLandInfo?.area || 0 });
            if (buildings.length > 0) alert(`${buildings.length}개 건물이 새로 등록되었습니다.`);
          } else {
            onUpdateProperty({ ...selectedProperty, ...newProp as Property });
          }
        } else {
          onUpdateProperty({ ...selectedProperty, ...newProp as Property });
        }
    } else {
        // 신규 물건 생성
        const propertyId = `p${Date.now()}`;
        const firstLot: Lot = {
          id: `lot${Date.now()}`,
          address: { ...newProp.masterAddress! },
          jimok: propLandInfo?.jimok || '대',
          area: propLandInfo?.area || 0,
          pnu: propPnu || undefined
        };

        // PNU가 있으면 건축물 자동 등록
        let buildings: Building[] = [];
        if (propPnu && appSettings.dataGoKrApiKey) {
          setIsLoadingBuildingInfo(true);
          buildings = await registerAllBuildings(propPnu, propertyId);
          setIsLoadingBuildingInfo(false);
        }

        onAddProperty({
          id: propertyId,
          lots: [firstLot],
          buildings: buildings,
          totalLandArea: propLandInfo?.area || 0,
          ...newProp as Property
        });

        if (buildings.length > 0) {
          alert(`${buildings.length}개 건물이 자동 등록되었습니다.`);
        }
    }
    setIsPropertyModalOpen(false);
    setPropPnu('');
    setPropLandInfo(null);
  };

  // 건물 삭제
  const handleDeleteBuilding = (buildingId: string) => {
    if (!selectedProperty) return;
    const building = selectedProperty.buildings.find(b => b.id === buildingId);
    if (!confirm(`"${building?.name || '건물'}"을(를) 삭제하시겠습니까?\n\n⚠️ 이 건물에 연결된 호실도 건물 연결이 해제됩니다.`)) return;

    const updatedBuildings = selectedProperty.buildings.filter(b => b.id !== buildingId);
    onUpdateProperty({ ...selectedProperty, buildings: updatedBuildings });
  };

  // 건물 수정 모달 열기
  const openEditBuildingModal = (building: Building) => {
    setEditingBuildingId(building.id);
    setNewBuilding({
      name: building.name,
      mgmBldrgstPk: building.mgmBldrgstPk,
      spec: { ...building.spec }
    });
    setBuildingTitleList([]);
    setBuildingFloorList([]);
    setSelectedBuildingTitle(null);
    setIsBuildingModalOpen(true);
  };

  // 물건 주소 검색 결과 처리 및 토지정보 자동 조회
  const handlePropAddressSelect = async (result: { jibunAddress: JibunAddress; roadAddress: string; fullJibunAddress: string; pnu?: string }) => {
    setNewProp({
      ...newProp,
      masterAddress: result.jibunAddress,
      roadAddress: result.roadAddress
    });
    setDisplayAddress(result.fullJibunAddress);
    setPropPnu(result.pnu || '');

    // PNU가 있고 API 키가 설정된 경우 토지정보 자동 조회
    if (result.pnu && appSettings.vworldApiKey) {
      setIsLoadingPropLandInfo(true);
      const landInfo = await fetchLandInfo(result.pnu, appSettings.vworldApiKey);
      setIsLoadingPropLandInfo(false);

      if (landInfo) {
        setPropLandInfo({
          jimok: getJimokAbbr(landInfo.lndcgrCodeNm),
          area: landInfo.lndpclAr
        });
      }
    }
  };

  const handleSaveUnit = () => {
    if (!newUnit.unitNumber || !selectedProperty || !newUnit.buildingId) return;
    onAddUnit({ id: `u${Date.now()}`, propertyId: selectedProperty.id, ...newUnit as Unit });
    setIsUnitModalOpen(false);
  };

  const handleSaveBuilding = () => {
    if (!newBuilding.name || !selectedProperty) return;

    if (editingBuildingId) {
      // 기존 건물 수정
      const updatedBuildings = selectedProperty.buildings.map(b =>
        b.id === editingBuildingId
          ? { ...b, name: newBuilding.name!, mgmBldrgstPk: newBuilding.mgmBldrgstPk, spec: newBuilding.spec as BuildingSpec }
          : b
      );
      onUpdateProperty({ ...selectedProperty, buildings: updatedBuildings });
    } else {
      // 신규 건물 추가
      const bldg: Building = {
        id: `b${Date.now()}`,
        propertyId: selectedProperty.id,
        name: newBuilding.name,
        mgmBldrgstPk: newBuilding.mgmBldrgstPk,
        spec: newBuilding.spec as BuildingSpec
      };
      onUpdateProperty({ ...selectedProperty, buildings: [...selectedProperty.buildings, bldg] });
    }

    setIsBuildingModalOpen(false);
    setEditingBuildingId(null);
    setSelectedBuildingTitle(null);
  };

  // 토지(필지) 저장
  const handleSaveLot = () => {
    if (!selectedProperty) return;
    // 필수 필드 검증: 시/도, 시/군/구, 읍/면/동, 본번
    if (!newLot.address?.sido || !newLot.address?.sigungu || !newLot.address?.eupMyeonDong || !newLot.address?.bonbun) {
      alert('시/도, 시/군/구, 읍/면/동, 본번은 필수 입력 항목입니다.');
      return;
    }

    let updatedLots: Lot[];

    if (editingLotId) {
      // 기존 토지 수정
      updatedLots = selectedProperty.lots.map(lot =>
        lot.id === editingLotId
          ? { ...lot, address: newLot.address as JibunAddress, jimok: newLot.jimok || '대', area: newLot.area || 0, pnu: newLot.pnu }
          : lot
      );
    } else {
      // 신규 토지 추가
      const lot: Lot = {
        id: `lot${Date.now()}`,
        address: newLot.address as JibunAddress,
        jimok: newLot.jimok || '대',
        area: newLot.area || 0,
        pnu: newLot.pnu
      };
      updatedLots = [...selectedProperty.lots, lot];
    }

    const totalArea = updatedLots.reduce((sum, l) => sum + (l.area || 0), 0);
    onUpdateProperty({ ...selectedProperty, lots: updatedLots, totalLandArea: totalArea });
    setIsLotModalOpen(false);
    setEditingLotId(null);
  };

  // 토지 삭제
  const handleDeleteLot = (lotId: string) => {
    if (!selectedProperty) return;
    if (!confirm('이 토지를 삭제하시겠습니까?')) return;

    const updatedLots = selectedProperty.lots.filter(lot => lot.id !== lotId);
    const totalArea = updatedLots.reduce((sum, l) => sum + (l.area || 0), 0);
    onUpdateProperty({ ...selectedProperty, lots: updatedLots, totalLandArea: totalArea });
  };

  // 토지 수정 모달 열기
  const openEditLotModal = (lot: Lot) => {
    setEditingLotId(lot.id);
    setNewLot({
      address: { ...lot.address },
      jimok: lot.jimok,
      area: lot.area,
      pnu: lot.pnu
    });
    setLotDisplayAddress(getFullAddress(lot.address));
    setIsLotModalOpen(true);
  };

  // 토지 주소 검색 결과 처리 및 토지정보 자동 조회
  const handleLotAddressSelect = async (result: { jibunAddress: JibunAddress; roadAddress: string; fullJibunAddress: string; pnu?: string }) => {
    setNewLot({
      ...newLot,
      address: result.jibunAddress,
      pnu: result.pnu
    });
    setLotDisplayAddress(result.fullJibunAddress);

    // PNU가 있고 API 키가 설정된 경우 토지정보 자동 조회
    if (result.pnu && appSettings.vworldApiKey) {
      setIsLoadingLandInfo(true);
      const landInfo = await fetchLandInfo(result.pnu, appSettings.vworldApiKey);
      setIsLoadingLandInfo(false);

      if (landInfo) {
        setNewLot(prev => ({
          ...prev,
          jimok: getJimokAbbr(landInfo.lndcgrCodeNm),
          area: landInfo.lndpclAr,
          pnu: result.pnu
        }));
      }
    }
  };

  // 건축물대장 정보 조회
  const fetchBuildingInfoFromApi = async () => {
    if (!selectedProperty) return;
    // 대표지번의 PNU를 사용
    const pnu = selectedProperty.lots[0]?.pnu;
    if (!pnu) {
      alert('건축물 정보를 조회하려면 대표 토지에 PNU가 필요합니다.\n주소 검색을 통해 물건을 등록하면 PNU가 자동으로 설정됩니다.');
      return;
    }
    if (!appSettings.dataGoKrApiKey) {
      alert('공공데이터포털 API 키가 설정되지 않았습니다.\n설정 메뉴에서 API 키를 입력해 주세요.');
      return;
    }

    setIsLoadingBuildingInfo(true);
    try {
      const [titles, floors] = await Promise.all([
        fetchBuildingTitleInfo(pnu, appSettings.dataGoKrApiKey),
        fetchBuildingFloorInfo(pnu, appSettings.dataGoKrApiKey)
      ]);
      setBuildingTitleList(titles);
      setBuildingFloorList(floors);

      if (titles.length === 0) {
        alert('해당 주소에 등록된 건축물 정보가 없습니다.');
      }
    } catch (error) {
      console.error('건축물대장 조회 오류:', error);
      alert('건축물대장 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingBuildingInfo(false);
    }
  };

  // 날짜 포맷 변환 (YYYYMMDD -> YYYY-MM-DD)
  const formatDateFromApi = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return '';
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  // API 응답을 Building 객체로 변환
  const convertApiToBuilding = (title: BuildingTitleInfo, floorList: BuildingFloorInfo[], propertyId: string): Building => {
    // 해당 동의 층별정보 필터링
    const dongFloors = floorList.filter(f =>
      !title.dongNm || f.dongNm === title.dongNm || f.dongNm === ''
    );

    // 층별정보를 FloorDetail 배열로 변환
    const floors = dongFloors
      .filter(f => f.areaExctYn !== '1')
      .map(f => ({
        floorNumber: f.flrGbCdNm === '지하' ? -f.flrNo : f.flrNo,
        area: f.area,
        usage: f.etcPurps || f.mainPurpsCdNm || '',
        structure: f.strctCdNm || ''
      }));

    const totalParking = title.indrMechUtcnt + title.indrAutoUtcnt + title.oudrMechUtcnt + title.oudrAutoUtcnt;

    return {
      id: `b${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      propertyId: propertyId,
      name: title.dongNm || title.bldNm || '본관',
      mgmBldrgstPk: title.mgmBldrgstPk,
      spec: {
        buildingArea: title.archArea,
        grossFloorArea: title.totArea,
        totalDongArea: title.totDongTotArea,
        floorCount: {
          underground: title.ugrndFlrCnt,
          ground: title.grndFlrCnt
        },
        floors: floors,
        completionDate: formatDateFromApi(title.useAprDay),
        permitDate: formatDateFromApi(title.pmsDay),
        startDate: formatDateFromApi(title.stcnsDay),
        mainUsage: title.mainPurpsCdNm || '',
        detailUsage: title.etcPurps || '',
        structure: title.etcStrct || title.strctCdNm || '',
        roofType: title.roofCdNm || '',
        height: title.heit,
        bcRat: title.bcRat,
        vlRat: title.vlRat,
        platArea: title.platArea,
        parkingCapacity: totalParking,
        parkingDetail: {
          indoorMech: title.indrMechUtcnt,
          indoorSelf: title.indrAutoUtcnt,
          outdoorMech: title.oudrMechUtcnt,
          outdoorSelf: title.oudrAutoUtcnt
        },
        elevatorCount: title.rideUseElvtCnt + title.emgenUseElvtCnt,
        elevatorDetail: {
          passenger: title.rideUseElvtCnt,
          emergency: title.emgenUseElvtCnt
        },
        householdCount: title.hhldCnt,
        unitCount: title.hoCnt,
        earthquakeDesign: title.rserthqkDsgnApplyYn === '1'
      }
    };
  };

  // 건축물대장 정보를 건물 폼에 적용
  const applyBuildingTitleToForm = (title: BuildingTitleInfo) => {
    setSelectedBuildingTitle(title);
    const building = convertApiToBuilding(title, buildingFloorList, selectedProperty?.id || '');
    setNewBuilding({
      name: building.name,
      mgmBldrgstPk: building.mgmBldrgstPk,
      spec: building.spec
    });
  };

  // 모든 건물을 일괄 등록
  const registerAllBuildings = async (pnu: string, propertyId: string): Promise<Building[]> => {
    if (!appSettings.dataGoKrApiKey) return [];

    const [titles, floors] = await Promise.all([
      fetchBuildingTitleInfo(pnu, appSettings.dataGoKrApiKey),
      fetchBuildingFloorInfo(pnu, appSettings.dataGoKrApiKey)
    ]);

    if (titles.length === 0) return [];

    return titles.map(title => convertApiToBuilding(title, floors, propertyId));
  };

  // 토지 추가 모달 열기 (대표지번 주소체계에 맞춤)
  const openLotModal = () => {
    if (!selectedProperty) return;
    const masterAddr = selectedProperty.masterAddress;
    setEditingLotId(null);
    setNewLot({
      address: {
        sido: masterAddr.sido,
        sigungu: masterAddr.sigungu,
        eupMyeonDong: masterAddr.eupMyeonDong,
        li: masterAddr.li || '',
        bonbun: '',
        bubun: ''
      },
      jimok: '대',
      area: 0,
      pnu: ''
    });
    setLotDisplayAddress('');
    setIsLotModalOpen(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* 물건 목록 사이드바 */}
      <div className="w-full lg:w-72 bg-white rounded-xl border border-[#dadce0] flex-shrink-0 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-[#dadce0] flex justify-between items-center bg-[#f8f9fa]">
          <h2 className="font-bold text-sm text-[#3c4043] flex items-center gap-2"><Layers size={16} className="text-[#1a73e8]"/> 물건 목록</h2>
          <button onClick={() => { setNewProp({ type: 'LAND_AND_BUILDING', name: '', masterAddress: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' }, roadAddress: '' }); setDisplayAddress(''); setPropPnu(''); setPropLandInfo(null); setIsPropertyModalOpen(true); }} className="p-1.5 text-[#1a73e8] hover:bg-[#e8f0fe] rounded-lg transition-colors"><Plus size={18}/></button>
        </div>
        <div className="p-2 space-y-1.5 bg-[#f8f9fa] max-h-[300px] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
          {properties.map(prop => (
            <button key={prop.id} onClick={() => { setSelectedPropId(prop.id); setActiveTab('OVERVIEW'); }} className={`w-full text-left p-3 rounded-lg transition-all border ${selectedPropId === prop.id ? 'bg-white border-[#1a73e8] shadow-sm' : 'bg-white hover:bg-[#f1f3f4] border-transparent'}`}>
              <h3 className={`font-bold text-sm truncate ${selectedPropId === prop.id ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>{prop.name}</h3>
              <div className="flex items-center text-[10px] text-[#5f6368] mt-1"><MapPin size={10} className="mr-1 flex-shrink-0" /><span className="truncate">{getFullAddress(prop.masterAddress)}</span></div>
            </button>
          ))}
          {properties.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-xs">
              <p>등록된 물건이 없습니다</p>
              <p className="mt-1">+ 버튼을 눌러 추가하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 상세 정보 패널 */}
      <div className="flex-1 min-w-0">
        {selectedProperty ? (
          <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
             <div className="p-3 md:p-6 border-b border-[#f1f3f4] bg-white flex flex-col sm:flex-row justify-between items-start gap-2 md:gap-3">
                 <div className="min-w-0 flex-1">
                    <h1 className="text-lg md:text-2xl font-bold text-[#202124] mb-1 md:mb-2 truncate">{selectedProperty.name}</h1>
                    <p className="text-[#5f6368] flex items-center text-[11px] md:text-sm font-medium"><MapPin size={14} className="mr-1 text-[#1a73e8] flex-shrink-0 md:w-4 md:h-4" /><span className="truncate">{getFullAddress(selectedProperty.masterAddress)}</span></p>
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                   <button onClick={() => { setNewProp({...selectedProperty}); setDisplayAddress(getFullAddress(selectedProperty.masterAddress)); setIsPropertyModalOpen(true); }} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 border border-[#dadce0] rounded-lg text-[10px] md:text-xs font-bold text-[#5f6368] hover:bg-[#f8f9fa] transition-colors"><Edit2 size={12} className="md:w-3.5 md:h-3.5"/> 수정</button>
                   <button onClick={handleDeleteProperty} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 border border-red-200 rounded-lg text-[10px] md:text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} className="md:w-3.5 md:h-3.5"/> 삭제</button>
                 </div>
             </div>

             <div className="flex border-b border-[#dadce0] bg-[#f8f9fa] px-2 md:px-4 overflow-x-auto">
               {[
                 { id: 'OVERVIEW', label: '개요', icon: <Home size={12} className="md:w-3.5 md:h-3.5"/> },
                 { id: 'LAND', label: '토지', icon: <MapPin size={12} className="md:w-3.5 md:h-3.5"/> },
                 { id: 'BUILDING', label: '건물', icon: <BuildingIcon size={12} className="md:w-3.5 md:h-3.5"/> },
                 { id: 'FLOOR', label: '층', icon: <Layers size={12} className="md:w-3.5 md:h-3.5"/> },
                 { id: 'UNIT', label: '호실', icon: <Home size={12} className="md:w-3.5 md:h-3.5"/> },
                 { id: 'ZONING', label: '조닝', icon: <Grid3X3 size={12} className="md:w-3.5 md:h-3.5"/> }
               ].map((tab) => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-3 md:px-6 py-2.5 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-wide md:tracking-widest transition-all flex items-center gap-1.5 md:gap-3 whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-[#1a73e8] text-[#1a73e8] bg-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>
                   {tab.icon} {tab.label}
                 </button>
               ))}
             </div>

             <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-white custom-scrollbar">
                {activeTab === 'OVERVIEW' && (() => {
                   // 건폐율/용적률 계산
                   const totalBuildingArea = selectedProperty.buildings.reduce((sum, b) => sum + b.spec.buildingArea, 0);
                   const totalGrossFloorArea = selectedProperty.buildings.reduce((sum, b) => sum + b.spec.grossFloorArea, 0);
                   const bcRat = selectedProperty.totalLandArea > 0 ? (totalBuildingArea / selectedProperty.totalLandArea * 100) : 0;
                   const vlRat = selectedProperty.totalLandArea > 0 ? (totalGrossFloorArea / selectedProperty.totalLandArea * 100) : 0;
                   const photos = selectedProperty.photos || [];

                   return (
                   <div className="space-y-3">
                      {/* 주요 지표 + 대표 사진 */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:items-stretch">
                         {/* 대표 사진 + 썸네일 (클릭시 갤러리) */}
                         <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden flex flex-col">
                            <div
                               onClick={() => setIsPhotoModalOpen(true)}
                               className="cursor-pointer hover:opacity-90 transition-opacity flex-1 min-h-0"
                            >
                               {photos.length > 0 ? (
                                  <div className="relative h-full min-h-[120px]">
                                     <img
                                        src={photos[0]?.url}
                                        alt="대표 사진"
                                        className="absolute inset-0 w-full h-full object-cover"
                                     />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
                                     <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                                        <span className="text-white text-[10px] font-medium drop-shadow">{photos[0]?.name || '대표 사진'}</span>
                                        {photos.length > 1 && (
                                           <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                              +{photos.length - 1}
                                           </span>
                                        )}
                                     </div>
                                  </div>
                               ) : (
                                  <div className="h-full min-h-[120px] flex flex-col items-center justify-center bg-[#f8f9fa] hover:bg-[#e8f0fe] transition-colors">
                                     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 mb-1">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                     </svg>
                                     <p className="text-[10px] text-gray-400">클릭하여 사진 추가</p>
                                  </div>
                               )}
                            </div>
                            {/* 썸네일 그리드 */}
                            {photos.length > 1 && (
                               <div className="grid grid-cols-4 gap-0.5 p-1 bg-[#f8f9fa] flex-shrink-0">
                                  {photos.slice(1, 5).map((photo, idx) => (
                                     <div
                                        key={photo.id}
                                        onClick={() => { setCurrentPhotoIndex(idx + 1); setIsPhotoModalOpen(true); }}
                                        className="aspect-square rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative"
                                     >
                                        <img src={photo.url} alt="" className="w-full h-full object-cover"/>
                                        {idx === 3 && photos.length > 5 && (
                                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                              <span className="text-white text-xs font-bold">+{photos.length - 5}</span>
                                           </div>
                                        )}
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>

                         {/* 주요 지표 카드 2x2 */}
                         <div className="lg:col-span-2 grid grid-cols-2 gap-1.5 md:gap-2 h-full">
                            <div className="bg-white p-2 md:p-3 rounded-xl border border-[#dadce0] shadow-sm flex flex-col justify-center">
                               <p className="text-[8px] md:text-[10px] text-[#5f6368] font-medium whitespace-nowrap">총 대지면적</p>
                               <p className="text-sm md:text-xl font-black text-[#202124] whitespace-nowrap tracking-tight">{formatArea(selectedProperty.totalLandArea)}</p>
                               <p className="text-[8px] md:text-[10px] text-[#5f6368]">{selectedProperty.lots.length}개 필지</p>
                            </div>
                            <div className="bg-white p-2 md:p-3 rounded-xl border border-[#dadce0] shadow-sm flex flex-col justify-center">
                               <p className="text-[8px] md:text-[10px] text-[#5f6368] font-medium whitespace-nowrap">총 건축면적</p>
                               <p className="text-sm md:text-xl font-black text-[#202124] whitespace-nowrap tracking-tight">{formatArea(totalBuildingArea)}</p>
                               <p className="text-[8px] md:text-[10px] text-[#1a73e8] font-bold whitespace-nowrap">건폐율 {bcRat.toFixed(1)}%</p>
                            </div>
                            <div className="bg-white p-2 md:p-3 rounded-xl border border-[#dadce0] shadow-sm flex flex-col justify-center">
                               <p className="text-[8px] md:text-[10px] text-[#5f6368] font-medium whitespace-nowrap">총 연면적</p>
                               <p className="text-sm md:text-xl font-black text-[#202124] whitespace-nowrap tracking-tight">{formatArea(totalGrossFloorArea)}</p>
                               <p className="text-[8px] md:text-[10px] text-[#1a73e8] font-bold whitespace-nowrap">용적률 {vlRat.toFixed(1)}%</p>
                            </div>
                            <div className="bg-white p-2 md:p-3 rounded-xl border border-[#dadce0] shadow-sm flex flex-col justify-center">
                               <p className="text-[8px] md:text-[10px] text-[#5f6368] font-medium whitespace-nowrap">월 임대수입</p>
                               <p className="text-sm md:text-xl font-black text-[#1a73e8] whitespace-nowrap tracking-tight">{formatMoneyInput(propertyUnits.filter(u => u.status === 'OCCUPIED').reduce((sum, u) => sum + (u.monthlyRent || 0), 0))}</p>
                               <p className="text-[8px] md:text-[10px] text-[#5f6368] whitespace-nowrap">보증금 {formatMoneyInput(propertyUnits.filter(u => u.status === 'OCCUPIED').reduce((sum, u) => sum + (u.deposit || 0), 0))}</p>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3">
                         {/* 토지 현황 */}
                         <div className="bg-white p-3 md:p-4 rounded-xl border border-[#dadce0] shadow-sm">
                            <div className="flex items-center justify-between mb-2 md:mb-4">
                               <h3 className="font-bold text-xs md:text-sm text-[#3c4043] flex items-center gap-1 md:gap-2"><MapPin size={14} className="md:w-4 md:h-4 text-[#1a73e8]"/> 토지 현황</h3>
                               <button onClick={() => setActiveTab('LAND')} className="text-[10px] md:text-xs text-[#1a73e8] font-bold hover:underline">상세 →</button>
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                               {selectedProperty.lots.slice(0, 3).map((lot, idx) => (
                                  <div key={lot.id} className="flex items-center justify-between p-2 md:p-3 bg-[#f8f9fa] rounded-lg md:rounded-xl">
                                     <div className="flex items-center gap-1 md:gap-2 min-w-0">
                                        {idx === 0 && <span className="px-1 md:px-1.5 py-0.5 bg-[#1a73e8] text-white text-[7px] md:text-[8px] font-bold rounded flex-shrink-0">대표</span>}
                                        <span className="text-[10px] md:text-xs font-medium text-gray-600 truncate">{lot.address.eupMyeonDong} {lot.address.bonbun}</span>
                                     </div>
                                     <span className="text-[10px] md:text-xs font-bold text-[#1a73e8] whitespace-nowrap ml-1">{formatArea(lot.area)}</span>
                                  </div>
                               ))}
                               {selectedProperty.lots.length > 3 && (
                                  <p className="text-[10px] md:text-xs text-gray-400 text-center py-1 md:py-2">외 {selectedProperty.lots.length - 3}개 필지</p>
                               )}
                               {selectedProperty.lots.length === 0 && (
                                  <p className="text-[10px] md:text-xs text-gray-400 text-center py-4 md:py-6">등록된 토지 없음</p>
                               )}
                            </div>
                         </div>

                         {/* 건물 현황 */}
                         <div className="bg-white p-3 md:p-4 rounded-xl border border-[#dadce0] shadow-sm">
                            <div className="flex items-center justify-between mb-2 md:mb-4">
                               <h3 className="font-bold text-xs md:text-sm text-[#3c4043] flex items-center gap-1 md:gap-2"><BuildingIcon size={14} className="md:w-4 md:h-4 text-[#1a73e8]"/> 건물 현황</h3>
                               <button onClick={() => setActiveTab('BUILDING')} className="text-[10px] md:text-xs text-[#1a73e8] font-bold hover:underline">상세 →</button>
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                               {selectedProperty.buildings.slice(0, 3).map(b => {
                                  const bUnits = propertyUnits.filter(u => u.buildingId === b.id);
                                  return (
                                     <div key={b.id} className="flex items-center justify-between p-2 md:p-3 bg-[#f8f9fa] rounded-lg md:rounded-xl">
                                        <div className="min-w-0">
                                           <p className="text-[11px] md:text-sm font-bold text-gray-800 truncate">{b.name}</p>
                                           <p className="text-[9px] md:text-[10px] text-gray-500 whitespace-nowrap">지{b.spec.floorCount.ground}층·{b.spec.mainUsage.substring(0, 4)}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-1">
                                           <p className="text-[10px] md:text-xs font-bold text-[#1a73e8] whitespace-nowrap">{formatArea(b.spec.grossFloorArea)}</p>
                                           <p className="text-[9px] md:text-[10px] text-gray-400">{bUnits.length}호실</p>
                                        </div>
                                     </div>
                                  );
                               })}
                               {selectedProperty.buildings.length > 3 && (
                                  <p className="text-[10px] md:text-xs text-gray-400 text-center py-1 md:py-2">외 {selectedProperty.buildings.length - 3}개 동</p>
                               )}
                               {selectedProperty.buildings.length === 0 && (
                                  <p className="text-[10px] md:text-xs text-gray-400 text-center py-4 md:py-6">등록된 건물 없음</p>
                               )}
                            </div>
                         </div>

                         {/* 임대 현황 */}
                         <div className="bg-white p-3 md:p-4 rounded-xl border border-[#dadce0] shadow-sm">
                            <div className="flex items-center justify-between mb-2 md:mb-4">
                               <h3 className="font-bold text-xs md:text-sm text-[#3c4043] flex items-center gap-1 md:gap-2"><Layers size={14} className="md:w-4 md:h-4 text-[#1a73e8]"/> 임대 현황</h3>
                               <button onClick={() => setActiveTab('UNIT')} className="text-[10px] md:text-xs text-[#1a73e8] font-bold hover:underline">상세 →</button>
                            </div>
                            {propertyUnits.length > 0 ? (
                               <div className="space-y-2 md:space-y-4">
                                  {/* 임대율 막대 */}
                                  <div>
                                     <div className="flex justify-between text-[10px] md:text-xs mb-1">
                                        <span className="text-gray-500">임대율</span>
                                        <span className="font-bold text-[#1a73e8]">
                                           {Math.round((propertyUnits.filter(u => u.status === 'OCCUPIED').length / propertyUnits.length) * 100)}%
                                        </span>
                                     </div>
                                     <div className="h-2 md:h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                           className="h-full bg-[#1a73e8] rounded-full transition-all"
                                           style={{ width: `${(propertyUnits.filter(u => u.status === 'OCCUPIED').length / propertyUnits.length) * 100}%` }}
                                        />
                                     </div>
                                  </div>
                                  {/* 상태별 분포 */}
                                  <div className="grid grid-cols-3 gap-1.5 md:gap-2 text-center">
                                     <div className="p-2 md:p-3 bg-[#e8f0fe] rounded-lg md:rounded-xl">
                                        <p className="text-sm md:text-lg font-black text-[#1a73e8]">{propertyUnits.filter(u => u.status === 'OCCUPIED').length}</p>
                                        <p className="text-[8px] md:text-[10px] text-[#1a73e8]">임대중</p>
                                     </div>
                                     <div className="p-2 md:p-3 bg-[#f8f9fa] rounded-lg md:rounded-xl">
                                        <p className="text-sm md:text-lg font-black text-[#5f6368]">{propertyUnits.filter(u => u.status === 'VACANT').length}</p>
                                        <p className="text-[8px] md:text-[10px] text-[#5f6368]">공실</p>
                                     </div>
                                     <div className="p-2 md:p-3 bg-[#f8f9fa] rounded-lg md:rounded-xl">
                                        <p className="text-sm md:text-lg font-black text-[#5f6368]">{propertyUnits.filter(u => u.status === 'UNDER_REPAIR').length}</p>
                                        <p className="text-[8px] md:text-[10px] text-[#5f6368]">보수중</p>
                                     </div>
                                  </div>
                                  {/* 총 면적 */}
                                  <div className="p-2 md:p-3 bg-[#f8f9fa] rounded-lg md:rounded-xl">
                                     <div className="flex justify-between text-[10px] md:text-xs">
                                        <span className="text-gray-500">총 임대면적</span>
                                        <span className="font-bold whitespace-nowrap">{formatArea(propertyUnits.reduce((sum, u) => sum + u.area, 0))}</span>
                                     </div>
                                     <div className="flex justify-between text-[10px] md:text-xs mt-1">
                                        <span className="text-gray-500">임대중 면적</span>
                                        <span className="font-bold text-[#1a73e8] whitespace-nowrap">{formatArea(propertyUnits.filter(u => u.status === 'OCCUPIED').reduce((sum, u) => sum + u.area, 0))}</span>
                                     </div>
                                  </div>
                               </div>
                            ) : (
                               <p className="text-[10px] md:text-xs text-gray-400 text-center py-4 md:py-6">등록된 호실 없음</p>
                            )}
                         </div>
                      </div>

                   </div>
                   );
                })()}
                {activeTab === 'LAND' && (
                    <div className="space-y-3 md:space-y-6">
                        <div className="flex justify-between items-center gap-2">
                            <h3 className="font-black text-sm md:text-base text-[#3c4043] flex items-center gap-1 md:gap-2"><MapPin size={16} className="md:w-[18px] md:h-[18px] text-[#1a73e8]"/> 토지 목록</h3>
                            <button onClick={openLotModal} className="bg-[#1a73e8] text-white px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-2 shadow-lg hover:bg-[#1557b0] transition-all"><Plus size={14} className="md:w-4 md:h-4"/> 추가</button>
                        </div>
                        <div className="border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                            <table className="w-full text-xs md:text-sm text-left min-w-[400px]">
                                <thead className="bg-[#f8f9fa] text-[#5f6368] font-bold border-b border-[#dadce0] text-[9px] md:text-[11px] uppercase tracking-wide md:tracking-widest">
                                    <tr>
                                        <th className="p-2 md:p-5 whitespace-nowrap">지번 주소</th>
                                        <th className="p-2 md:p-5 whitespace-nowrap">지목</th>
                                        <th className="p-2 md:p-5 text-right whitespace-nowrap">면적</th>
                                        <th className="p-2 md:p-5 text-center w-16 md:w-24">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f3f4]">
                                    {selectedProperty.lots.map((lot, index) => (
                                        <tr key={lot.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-2 md:p-5">
                                                <div className="flex items-center gap-1 md:gap-2 flex-wrap md:flex-nowrap">
                                                    {index === 0 && <span className="px-1.5 md:px-2 py-0.5 bg-[#e8f0fe] text-[#1a73e8] text-[8px] md:text-[10px] font-black rounded flex-shrink-0">대표</span>}
                                                    <span className="font-bold text-[11px] md:text-sm text-gray-800 tracking-tight">{getFullAddress(lot.address)}</span>
                                                </div>
                                                {lot.pnu && <p className="text-[8px] md:text-[10px] text-gray-400 mt-0.5 md:mt-1 hidden md:block">PNU: {lot.pnu}</p>}
                                            </td>
                                            <td className="p-2 md:p-5"><span className="px-2 md:px-3 py-0.5 md:py-1 bg-gray-100 rounded-full text-[10px] md:text-xs font-black text-gray-600">{lot.jimok}</span></td>
                                            <td className="p-2 md:p-5 text-right font-black text-[11px] md:text-sm text-[#1a73e8] whitespace-nowrap">{formatArea(lot.area)}</td>
                                            <td className="p-2 md:p-5 text-center">
                                                <div className="flex items-center justify-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditLotModal(lot)} className="p-1 md:p-1.5 hover:bg-[#e8f0fe] rounded-lg transition-colors" title="수정">
                                                        <Edit2 size={12} className="md:w-3.5 md:h-3.5 text-[#1a73e8]" />
                                                    </button>
                                                    <button onClick={() => handleDeleteLot(lot.id)} className="p-1 md:p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                                                        <Trash2 size={12} className="md:w-3.5 md:h-3.5 text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedProperty.lots.length === 0 && <tr><td colSpan={4} className="p-10 md:p-20 text-center text-gray-400 italic text-xs md:text-sm">등록된 필지 데이터가 존재하지 않습니다.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'BUILDING' && (
                    <div className="space-y-3 md:space-y-6">
                        <div className="flex justify-between items-center gap-2">
                            <h3 className="font-black text-sm md:text-base text-[#3c4043] flex items-center gap-1 md:gap-2"><BuildingIcon size={16} className="md:w-[18px] md:h-[18px] text-[#1a73e8]"/> 건물 ({selectedProperty.buildings.length}동)</h3>
                            <button onClick={() => { setEditingBuildingId(null); setNewBuilding({ name: '', spec: { buildingArea: 0, grossFloorArea: 0, floorCount: { underground: 0, ground: 1 }, floors: [], completionDate: '', mainUsage: '업무시설', parkingCapacity: 0, elevatorCount: 0 } }); setBuildingTitleList([]); setBuildingFloorList([]); setSelectedBuildingTitle(null); setIsBuildingModalOpen(true); }} className="bg-[#1a73e8] text-white px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-2 shadow-lg hover:bg-[#1557b0] transition-all"><Plus size={14} className="md:w-4 md:h-4"/> 추가</button>
                        </div>
                        {/* 정렬/필터 UI */}
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <div className="flex items-center gap-1 md:gap-2">
                                <span className="text-[10px] md:text-xs font-bold text-[#5f6368] hidden md:inline">정렬:</span>
                                <select
                                    value={buildingSortKey}
                                    onChange={(e) => setBuildingSortKey(e.target.value as 'name' | 'area' | 'floorCount')}
                                    className="px-2 md:px-3 py-1 md:py-1.5 border border-[#dadce0] rounded-lg text-[10px] md:text-xs font-medium focus:outline-none focus:border-[#1a73e8]"
                                >
                                    <option value="name">동명칭</option>
                                    <option value="area">연면적</option>
                                    <option value="floorCount">층수</option>
                                </select>
                                <button
                                    onClick={() => setBuildingSortDesc(!buildingSortDesc)}
                                    className={`p-1 md:p-1.5 border border-[#dadce0] rounded-lg hover:bg-[#f8f9fa] transition-colors ${buildingSortDesc ? 'bg-[#e8f0fe]' : ''}`}
                                    title={buildingSortDesc ? '내림차순' : '오름차순'}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`md:w-3.5 md:h-3.5 ${buildingSortDesc ? 'rotate-180' : ''}`}>
                                        <path d="M12 5v14M19 12l-7 7-7-7"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="건물명 검색..."
                                    value={buildingFilter}
                                    onChange={(e) => setBuildingFilter(e.target.value)}
                                    className="w-full max-w-xs px-2 md:px-3 py-1 md:py-1.5 border border-[#dadce0] rounded-lg text-[10px] md:text-xs focus:outline-none focus:border-[#1a73e8]"
                                />
                            </div>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                            {(() => {
                                // 건물 필터링
                                let filteredBuildings = selectedProperty.buildings.filter(b =>
                                    buildingFilter === '' || b.name.toLowerCase().includes(buildingFilter.toLowerCase())
                                );
                                // 건물 정렬
                                filteredBuildings = [...filteredBuildings].sort((a, b) => {
                                    let compare = 0;
                                    if (buildingSortKey === 'name') {
                                        compare = a.name.localeCompare(b.name, 'ko');
                                    } else if (buildingSortKey === 'area') {
                                        compare = a.spec.grossFloorArea - b.spec.grossFloorArea;
                                    } else if (buildingSortKey === 'floorCount') {
                                        compare = (a.spec.floorCount.ground + a.spec.floorCount.underground) - (b.spec.floorCount.ground + b.spec.floorCount.underground);
                                    }
                                    return buildingSortDesc ? -compare : compare;
                                });
                                return filteredBuildings.map(b => {
                                const isExpanded = expandedBuildingId === b.id;
                                const buildingUnits = propertyUnits.filter(u => u.buildingId === b.id);
                                return (
                                    <div key={b.id} className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        {/* 건물 헤더 (클릭으로 펼치기/접기) */}
                                        <div
                                            className="p-3 md:p-6 cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                                            onClick={() => setExpandedBuildingId(isExpanded ? null : b.id)}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-shrink">
                                                    <div className={`p-2 md:p-3 rounded-xl border transition-colors flex-shrink-0 ${isExpanded ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-indigo-50 text-[#1a73e8] border-indigo-100'}`}>
                                                        <BuildingIcon size={20} className="md:w-6 md:h-6"/>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-black text-sm md:text-xl text-gray-900 truncate tracking-tight">{b.name}</h4>
                                                            {b.spec.earthquakeDesign && <span className="px-1.5 md:px-2 py-0.5 bg-[#e6f4ea] text-[#137333] text-[9px] md:text-[10px] font-bold rounded flex-shrink-0">내진</span>}
                                                        </div>
                                                        <p className="text-[10px] md:text-sm text-[#5f6368] mt-0.5 md:mt-1 font-medium whitespace-nowrap tracking-tight">
                                                            <span className="hidden md:inline">{b.spec.detailUsage || b.spec.mainUsage} | </span>
                                                            <span className="md:hidden">{(b.spec.detailUsage || b.spec.mainUsage).substring(0, 4)}{(b.spec.detailUsage || b.spec.mainUsage).length > 4 ? '..' : ''} </span>
                                                            지{b.spec.floorCount.ground}·B{b.spec.floorCount.underground}
                                                            <span className="hidden md:inline"> 지상 {b.spec.floorCount.ground}층 · 지하 {b.spec.floorCount.underground}층</span>
                                                            {b.spec.completionDate && <span className="ml-1 md:ml-2 text-[9px] md:text-xs">({b.spec.completionDate.substring(0, 4)})</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
                                                    <div className="grid grid-cols-3 gap-2 md:gap-6 text-right">
                                                        <div>
                                                            <p className="text-[8px] md:text-[10px] text-gray-400 font-bold whitespace-nowrap">건축</p>
                                                            <p className="font-black text-[11px] md:text-base text-gray-800 whitespace-nowrap tracking-tight">{formatArea(b.spec.buildingArea)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] md:text-[10px] text-gray-400 font-bold whitespace-nowrap">연면적</p>
                                                            <p className="font-black text-[11px] md:text-base text-[#1a73e8] whitespace-nowrap tracking-tight">{formatArea(b.spec.grossFloorArea)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] md:text-[10px] text-gray-400 font-bold whitespace-nowrap">호실</p>
                                                            <p className="font-black text-[11px] md:text-base text-gray-800 whitespace-nowrap">{buildingUnits.length}개</p>
                                                        </div>
                                                    </div>
                                                    <div className={`transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="md:w-5 md:h-5"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 펼쳐진 상세 정보 */}
                                        {isExpanded && (
                                            <div className="border-t border-[#dadce0] bg-[#f8f9fa]">
                                                {/* 건물 상세 정보 그리드 */}
                                                <div className="p-3 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6 border-b border-[#dadce0]">
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">구조</p>
                                                        <p className="font-bold text-[11px] md:text-sm text-[#202124] truncate">{b.spec.structure || '-'}</p>
                                                    </div>
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">높이</p>
                                                        <p className="font-bold text-[11px] md:text-sm text-[#202124]">{b.spec.height ? `${b.spec.height}m` : '-'}</p>
                                                    </div>
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">지붕</p>
                                                        <p className="font-bold text-[11px] md:text-sm text-[#202124] truncate">{b.spec.roofType || '-'}</p>
                                                    </div>
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">사용승인</p>
                                                        <p className="font-bold text-[11px] md:text-sm text-[#202124]">{b.spec.completionDate || '-'}</p>
                                                    </div>
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">주차</p>
                                                        <p className="font-bold text-[11px] md:text-sm text-[#202124]">{b.spec.parkingCapacity}대</p>
                                                        {b.spec.parkingDetail && (
                                                            <p className="text-[8px] md:text-xs text-[#5f6368] mt-0.5 md:mt-1">기계{b.spec.parkingDetail.indoorMech + b.spec.parkingDetail.outdoorMech}/자주{b.spec.parkingDetail.indoorSelf + b.spec.parkingDetail.outdoorSelf}</p>
                                                        )}
                                                    </div>
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">승강기</p>
                                                        <p className="font-bold text-[11px] md:text-sm text-[#202124]">{b.spec.elevatorCount}대</p>
                                                        {b.spec.elevatorDetail && (
                                                            <p className="text-[8px] md:text-xs text-[#5f6368] mt-0.5 md:mt-1">승용{b.spec.elevatorDetail.passenger}/비상{b.spec.elevatorDetail.emergency}</p>
                                                        )}
                                                    </div>
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">세대/호수</p>
                                                        <p className="font-bold text-[11px] md:text-sm text-[#202124] whitespace-nowrap">{b.spec.householdCount || 0}세대/{b.spec.unitCount || 0}호</p>
                                                    </div>
                                                    <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl border border-[#dadce0]">
                                                        <p className="text-[9px] md:text-xs text-[#5f6368] font-medium mb-1 md:mb-2">내진설계</p>
                                                        <p className={`font-bold text-[11px] md:text-sm ${b.spec.earthquakeDesign ? 'text-[#137333]' : 'text-[#5f6368]'}`}>
                                                            {b.spec.earthquakeDesign ? '적용' : '-'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 층별 정보 테이블 */}
                                                {b.spec.floors && b.spec.floors.length > 0 && (() => {
                                                    // 층별 합산 데이터 생성
                                                    const floorMap = new Map<number, { floors: typeof b.spec.floors, totalArea: number, usages: string[] }>();
                                                    b.spec.floors.forEach(floor => {
                                                        const existing = floorMap.get(floor.floorNumber);
                                                        if (existing) {
                                                            existing.floors.push(floor);
                                                            existing.totalArea += floor.area;
                                                            if (floor.usage && !existing.usages.includes(floor.usage)) {
                                                                existing.usages.push(floor.usage);
                                                            }
                                                        } else {
                                                            floorMap.set(floor.floorNumber, {
                                                                floors: [floor],
                                                                totalArea: floor.area,
                                                                usages: floor.usage ? [floor.usage] : []
                                                            });
                                                        }
                                                    });
                                                    const aggregatedFloors = Array.from(floorMap.entries())
                                                        .map(([floorNumber, data]) => ({ floorNumber, ...data }))
                                                        .sort((a, bb) => bb.floorNumber - a.floorNumber);
                                                    const uniqueFloorCount = aggregatedFloors.length;

                                                    // 전용면적 데이터 존재 여부 확인
                                                    const hasExclusiveArea = b.spec.floors.some(f => f.exclusiveArea || f.exclusiveRatio);

                                                    return (
                                                    <div className="p-3 md:p-6 border-b border-[#dadce0]">
                                                        <p className="text-[10px] md:text-xs font-black text-[#1a73e8] mb-2 md:mb-3 flex items-center gap-1 md:gap-2">
                                                            <Layers size={12} className="md:w-3.5 md:h-3.5"/> 층별 정보 ({uniqueFloorCount}개 층)
                                                        </p>
                                                        <div className="bg-white rounded-lg md:rounded-xl border border-[#dadce0] overflow-hidden overflow-x-auto">
                                                            <table className="w-full text-xs md:text-sm">
                                                                <thead className="bg-[#f8f9fa]">
                                                                    <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold tracking-tight md:tracking-normal">
                                                                        <th className="p-1.5 md:p-3 text-center w-6 md:w-8"></th>
                                                                        <th className="p-1.5 md:p-3 text-center whitespace-nowrap">층</th>
                                                                        <th className="p-1.5 md:p-3 text-center whitespace-nowrap">면적<span className="hidden md:inline">({appSettings.areaUnit === 'PYEONG' ? '평' : '㎡'})</span></th>
                                                                        {hasExclusiveArea && (
                                                                            <>
                                                                                <th className="p-1.5 md:p-3 text-center whitespace-nowrap">전용면적<span className="hidden md:inline">({appSettings.areaUnit === 'PYEONG' ? '평' : '㎡'})</span></th>
                                                                                <th className="p-1.5 md:p-3 text-center whitespace-nowrap">전용률</th>
                                                                            </>
                                                                        )}
                                                                        <th className="p-1.5 md:p-3 text-center whitespace-nowrap">용도</th>
                                                                        <th className="p-1.5 md:p-3 text-center whitespace-nowrap">호실</th>
                                                                        <th className="p-1.5 md:p-3 text-center whitespace-nowrap hidden md:table-cell">사용현황</th>
                                                                        <th className="p-1.5 md:p-3 text-center whitespace-nowrap hidden md:table-cell">사용자</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {aggregatedFloors.map((aggFloor) => {
                                                                        const floorUnits = buildingUnits.filter(u => u.floor === aggFloor.floorNumber);
                                                                        const occupiedUnits = floorUnits.filter(u => u.status === 'OCCUPIED');
                                                                        const vacantUnits = floorUnits.filter(u => u.status === 'VACANT');
                                                                        const isMultiUsage = aggFloor.floors.length > 1;
                                                                        const floorKey = `${b.id}_${aggFloor.floorNumber}`;
                                                                        const isExpanded = expandedFloors.has(floorKey);

                                                                        // 사용현황 계산
                                                                        let usageStatus = '미등록';
                                                                        if (floorUnits.length > 0) {
                                                                            if (occupiedUnits.length === floorUnits.length) {
                                                                                usageStatus = '전체사용';
                                                                            } else if (occupiedUnits.length > 0) {
                                                                                usageStatus = '일부사용';
                                                                            } else {
                                                                                usageStatus = '공실';
                                                                            }
                                                                        }

                                                                        // 사용자 통합 (중복 제거)
                                                                        const uniqueTenants = [...new Set(occupiedUnits.map(u => u.unitNumber + '호'))];
                                                                        const tenantDisplay = uniqueTenants.length > 0 ? (uniqueTenants.length === 1 ? uniqueTenants[0] : `${uniqueTenants[0]} 외 ${uniqueTenants.length - 1}`) : '-';

                                                                        return (
                                                                            <React.Fragment key={aggFloor.floorNumber}>
                                                                                <tr
                                                                                    className={`hover:bg-[#f8f9fa] ${isMultiUsage ? 'cursor-pointer' : ''}`}
                                                                                    onClick={() => {
                                                                                        if (isMultiUsage) {
                                                                                            setExpandedFloors(prev => {
                                                                                                const next = new Set(prev);
                                                                                                if (next.has(floorKey)) {
                                                                                                    next.delete(floorKey);
                                                                                                } else {
                                                                                                    next.add(floorKey);
                                                                                                }
                                                                                                return next;
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <td className="p-1 md:p-2 text-center">
                                                                                        {isMultiUsage && (
                                                                                            <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:w-3 md:h-3">
                                                                                                    <polyline points="9 18 15 12 9 6"/>
                                                                                                </svg>
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#202124] whitespace-nowrap">
                                                                                        {aggFloor.floorNumber > 0 ? `${aggFloor.floorNumber}F` : `B${Math.abs(aggFloor.floorNumber)}`}
                                                                                    </td>
                                                                                    <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#1a73e8] whitespace-nowrap tracking-tight">
                                                                                        {formatArea(aggFloor.totalArea)}
                                                                                    </td>
                                                                                    {hasExclusiveArea && (
                                                                                        <>
                                                                                            <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#5f6368] whitespace-nowrap tracking-tight">
                                                                                                {(() => {
                                                                                                    const totalExclusiveArea = aggFloor.floors.reduce((sum, f) => sum + (f.exclusiveArea || 0), 0);
                                                                                                    return totalExclusiveArea > 0 ? formatArea(totalExclusiveArea) : '-';
                                                                                                })()}
                                                                                            </td>
                                                                                            <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#5f6368] whitespace-nowrap">
                                                                                                {(() => {
                                                                                                    const avgRatio = aggFloor.floors.filter(f => f.exclusiveRatio).length > 0
                                                                                                        ? Math.round(aggFloor.floors.reduce((sum, f) => sum + (f.exclusiveRatio || 0), 0) / aggFloor.floors.filter(f => f.exclusiveRatio).length * 10) / 10
                                                                                                        : null;
                                                                                                    return avgRatio ? `${avgRatio}%` : '-';
                                                                                                })()}
                                                                                            </td>
                                                                                        </>
                                                                                    )}
                                                                                    <td className="p-1.5 md:p-3 text-center text-[#5f6368] text-[9px] md:text-xs">
                                                                                        {isMultiUsage ? (
                                                                                            <span className="px-1 md:px-2 py-0.5 bg-[#e8f0fe] text-[#1a73e8] text-[8px] md:text-[10px] font-bold rounded whitespace-nowrap">
                                                                                                복수({aggFloor.usages.length})
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="truncate max-w-[60px] md:max-w-[150px] inline-block" title={aggFloor.usages[0]}>
                                                                                                {aggFloor.usages[0] || '-'}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="p-1.5 md:p-3 text-center">
                                                                                        {floorUnits.length > 0 ? (
                                                                                            <span className="text-[9px] md:text-xs font-bold text-gray-700">{floorUnits.length}</span>
                                                                                        ) : (
                                                                                            <span className="text-[9px] md:text-xs text-gray-400">-</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="p-1.5 md:p-3 text-center hidden md:table-cell">
                                                                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                                                                            usageStatus === '전체사용' ? 'bg-[#e6f4ea] text-[#137333]' :
                                                                                            usageStatus === '일부사용' ? 'bg-[#fff3e0] text-[#e65100]' :
                                                                                            usageStatus === '공실' ? 'bg-[#fef7e0] text-[#b06000]' :
                                                                                            'bg-gray-100 text-gray-400'
                                                                                        }`}>
                                                                                            {usageStatus}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-1.5 md:p-3 text-center text-xs text-[#5f6368] hidden md:table-cell" title={uniqueTenants.join(', ')}>
                                                                                        {tenantDisplay}
                                                                                    </td>
                                                                                </tr>
                                                                                {/* 세부 용도 펼침 */}
                                                                                {isMultiUsage && isExpanded && aggFloor.floors.map((subFloor, subIdx) => (
                                                                                    <tr key={`${aggFloor.floorNumber}_${subIdx}`} className="bg-[#f8f9fa]">
                                                                                        <td className="p-1 md:p-2"></td>
                                                                                        <td className="p-1 md:p-2 text-center text-[9px] md:text-xs text-gray-400">└</td>
                                                                                        <td className="p-1 md:p-2 text-center text-[9px] md:text-xs text-[#5f6368]">{formatArea(subFloor.area)}</td>
                                                                                        <td className="p-1 md:p-2 text-center text-[9px] md:text-xs text-[#5f6368]">{subFloor.usage || '-'}</td>
                                                                                        <td className="p-1 md:p-2" colSpan={1}></td>
                                                                                    </tr>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                                {/* 합계 행 */}
                                                                <tfoot className="bg-[#e8f0fe] border-t-2 border-[#1a73e8]">
                                                                    <tr className="font-bold text-[#1a73e8] text-[10px] md:text-sm">
                                                                        <td className="p-1.5 md:p-3"></td>
                                                                        <td className="p-1.5 md:p-3 text-center whitespace-nowrap">합계</td>
                                                                        <td className="p-1.5 md:p-3 text-center whitespace-nowrap tracking-tight">
                                                                            {formatArea(b.spec.floors.reduce((sum, f) => sum + f.area, 0))}
                                                                        </td>
                                                                        <td className="p-1.5 md:p-3 text-center">-</td>
                                                                        <td className="p-1.5 md:p-3 text-center whitespace-nowrap">{buildingUnits.length}</td>
                                                                        <td className="p-1.5 md:p-3 text-center text-[9px] md:text-xs hidden md:table-cell">
                                                                            임대 {buildingUnits.filter(u => u.status === 'OCCUPIED').length} / 공실 {buildingUnits.filter(u => u.status === 'VACANT').length}
                                                                        </td>
                                                                        <td className="p-1.5 md:p-3 text-center hidden md:table-cell">-</td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    );
                                                })()}

                                                {/* 호실 요약 (층별 테이블에 이미 표시되므로 간략히) */}
                                                {buildingUnits.length > 0 && (
                                                    <div className="px-3 md:px-6 py-2 md:py-4 border-b border-[#dadce0] bg-white">
                                                        <div className="flex items-center justify-between flex-wrap gap-1 md:gap-2">
                                                            <p className="text-[10px] md:text-xs font-bold text-[#5f6368] flex items-center gap-1 md:gap-2">
                                                                <Home size={12} className="md:w-3.5 md:h-3.5 text-[#1a73e8]"/>
                                                                호실 {buildingUnits.length}개
                                                                <span className="text-[#137333]">(임대{buildingUnits.filter(u => u.status === 'OCCUPIED').length})</span>
                                                                <span className="text-[#b06000]">(공실{buildingUnits.filter(u => u.status === 'VACANT').length})</span>
                                                            </p>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActiveTab('UNIT'); }}
                                                                className="text-[10px] md:text-xs font-bold text-[#1a73e8] hover:underline"
                                                            >
                                                                호실 관리 →
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 수정/삭제 버튼 */}
                                                <div className="p-2 md:p-4 flex justify-end gap-1 md:gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditBuildingModal(b); }}
                                                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 border border-[#dadce0] rounded-lg text-[10px] md:text-sm font-bold text-[#5f6368] hover:bg-white transition-colors"
                                                    >
                                                        <Edit2 size={12} className="md:w-3.5 md:h-3.5"/> 수정
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(b.id); }}
                                                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 border border-red-200 rounded-lg text-[10px] md:text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={12} className="md:w-3.5 md:h-3.5"/> 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                            })()}
                            {selectedProperty.buildings.filter(b => buildingFilter === '' || b.name.toLowerCase().includes(buildingFilter.toLowerCase())).length === 0 && (
                                <div className="p-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                                    <BuildingIcon size={48} className="mx-auto text-gray-300 mb-4"/>
                                    <p className="text-gray-400 font-bold mb-2">{buildingFilter ? '검색 결과가 없습니다' : '등록된 건물이 없습니다'}</p>
                                    <p className="text-gray-400 text-sm">{buildingFilter ? '다른 검색어를 입력하세요' : '물건 등록 시 PNU가 있으면 건물이 자동으로 등록됩니다.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* ========== 층 탭 ========== */}
                {activeTab === 'FLOOR' && (() => {
                  if (!selectedProperty || selectedProperty.buildings.length === 0) {
                    return (
                      <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-[#f8f9fa]">
                        <BuildingIcon size={40} className="mx-auto text-gray-300 mb-3"/>
                        <p className="text-gray-400 font-bold">건물을 먼저 등록하세요</p>
                      </div>
                    );
                  }
                  const effectiveBldgId = floorTabBldgId || selectedProperty.buildings[0]?.id || '';
                  const bldg = selectedProperty.buildings.find(b => b.id === effectiveBldgId) || selectedProperty.buildings[0];
                  if (!bldg) return null;

                  const allFloorNumbers = [...new Set([
                    ...bldg.spec.floors.map(f => f.floorNumber),
                    ...propertyUnits.filter(u => u.buildingId === bldg.id).map(u => u.floor),
                  ])].sort((a, b) => b - a);

                  const getFloorSpec = (n: number) => bldg.spec.floors.find(f => f.floorNumber === n);
                  const getFloorLabel = (n: number) => n > 0 ? `${n}F` : `B${Math.abs(n)}`;

                  // 해당 건물의 모든 조닝 데이터 (층별)
                  const getFloorZones = (floorNum: number): FloorZone[] => {
                    const plan = floorPlans.find(p => p.propertyId === selectedProperty!.id && p.buildingId === bldg.id && p.floorNumber === floorNum);
                    return plan ? floorZones.filter(z => z.floorPlanId === plan.id) : [];
                  };

                  // 현재 필터에 맞는 조닝유형별 컬럼 헤더 & 값 추출
                  const zf = floorTabZoneFilter;

                  // 필터가 있을 때 해당 유형 조닝이 있는 층만 필터 (필터 없으면 전체 층)
                  const displayFloors = zf ? allFloorNumbers.filter(n => {
                    const zones = getFloorZones(n);
                    return zones.some(z => z.detail?.usage === zf);
                  }) : allFloorNumbers;

                  // 조닝유형별 세부정보 렌더
                  const renderZoneInfo = (zones: FloorZone[], floorNum: number) => {
                    const filtered = zf ? zones.filter(z => z.detail?.usage === zf) : zones;
                    if (filtered.length === 0) return <span className="text-[9px] text-[#9aa0a6]">-</span>;

                    if (!zf) {
                      // 필터 없음: 조닝유형별 개수 요약
                      const usageCounts: Record<string, number> = {};
                      filtered.forEach(z => {
                        const u = z.detail?.usage;
                        if (u) usageCounts[ZONE_USAGE_LABELS[u]] = (usageCounts[ZONE_USAGE_LABELS[u]] || 0) + 1;
                      });
                      const noUsage = filtered.filter(z => !z.detail?.usage).length;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(usageCounts).map(([label, cnt]) => (
                            <span key={label} className="px-1.5 py-0.5 bg-[#e8f0fe] text-[#1a73e8] text-[8px] md:text-[9px] font-bold rounded whitespace-nowrap">
                              {label}{cnt > 1 ? ` ×${cnt}` : ''}
                            </span>
                          ))}
                          {noUsage > 0 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[8px] md:text-[9px] font-bold rounded">미지정 ×{noUsage}</span>}
                        </div>
                      );
                    }

                    // 특정 유형 필터
                    switch (zf) {
                      case 'OFFICE':
                        return (
                          <div className="space-y-0.5">
                            {filtered.map(z => (
                              <div key={z.id} className="flex items-center gap-2 text-[9px] md:text-[10px]">
                                <span className="font-bold text-[#202124]">{z.detail?.departmentName || z.name}</span>
                                {z.detail?.headcount && <span className="text-[#5f6368]">{z.detail.headcount}명</span>}
                                {z.estimatedArea && <span className="text-[#1a73e8] font-bold">약 {formatArea(z.estimatedArea)}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      case 'MEETING_ROOM':
                        return (
                          <div className="space-y-0.5">
                            {filtered.map(z => (
                              <div key={z.id} className="flex items-center gap-2 text-[9px] md:text-[10px]">
                                <span className="font-bold text-[#202124]">{z.name}</span>
                                {z.detail?.meetingCapacity && <span className="text-[#5f6368]">{z.detail.meetingCapacity}인실</span>}
                                {z.estimatedArea && <span className="text-[#1a73e8] font-bold">약 {formatArea(z.estimatedArea)}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      case 'STORAGE': case 'SAMPLE_ROOM':
                        return (
                          <div className="space-y-0.5">
                            {filtered.map(z => (
                              <div key={z.id} className="flex items-center gap-2 text-[9px] md:text-[10px]">
                                <span className="font-bold text-[#202124]">{z.name}</span>
                                {z.detail?.storageDepartment && <span className="text-[#5f6368]">{z.detail.storageDepartment}</span>}
                                {z.detail?.managerPrimary && <span className="text-[#5f6368]">정: {z.detail.managerPrimary}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      case 'PARKING':
                        return (
                          <span className="font-bold text-[10px] md:text-xs text-[#202124]">
                            {filtered.reduce((s, z) => s + (z.detail?.parkingSpaces || 0), 0)}대
                            {filtered.some(z => z.detail?.parkingAssignee) && (
                              <span className="text-[#5f6368] font-normal ml-1">({filtered.map(z => z.detail?.parkingAssignee).filter(Boolean).join(', ')})</span>
                            )}
                          </span>
                        );
                      case 'BATHROOM':
                        return <span className="font-bold text-[10px] md:text-xs text-[#202124]">{filtered.length}개</span>;
                      case 'BEDROOM':
                        return (
                          <span className="font-bold text-[10px] md:text-xs text-[#202124]">
                            {filtered.map(z => `방${z.detail?.bedroomNumber || ''}`).join(', ')}
                          </span>
                        );
                      default:
                        return (
                          <div className="flex flex-wrap gap-1">
                            {filtered.map(z => (
                              <span key={z.id} className="text-[9px] md:text-[10px] font-bold text-[#202124]">{z.name}</span>
                            ))}
                          </div>
                        );
                    }
                  };

                  // 합계 면적
                  const totalArea = (zf ? displayFloors : allFloorNumbers).reduce((s, n) => {
                    const spec = getFloorSpec(n);
                    return s + (spec?.area || 0);
                  }, 0);

                  // 조닝유형별 컬럼 헤더
                  const getFilterColumnHeader = (): string => {
                    if (!zf) return '조닝 구성';
                    return ZONE_USAGE_LABELS[zf] + ' 정보';
                  };

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-sm md:text-base text-[#3c4043] flex items-center gap-1 md:gap-2">
                            <Layers size={16} className="md:w-[18px] md:h-[18px] text-[#1a73e8]"/> 층별 현황
                          </h3>
                          {selectedProperty.buildings.length > 1 && (
                            <select value={effectiveBldgId} onChange={e => setFloorTabBldgId(e.target.value)}
                              className="px-2 md:px-3 py-1 md:py-1.5 border border-[#dadce0] rounded-lg text-[10px] md:text-xs font-bold focus:outline-none focus:border-[#1a73e8]">
                              {selectedProperty.buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                          )}
                          <select value={floorTabZoneFilter} onChange={e => setFloorTabZoneFilter(e.target.value as ZoneUsage | '')}
                            className="px-2 md:px-3 py-1 md:py-1.5 border border-[#dadce0] rounded-lg text-[10px] md:text-xs font-bold focus:outline-none focus:border-[#1a73e8]">
                            <option value="">전체 조닝</option>
                            {ZONE_USAGE_OPTIONS.map(u => <option key={u} value={u}>{ZONE_USAGE_LABELS[u]}</option>)}
                          </select>
                        </div>
                        <span className="text-[10px] md:text-xs text-[#5f6368] font-bold">{displayFloors.length}개 층</span>
                      </div>

                      {displayFloors.length > 0 ? (
                        <div className="bg-white border border-[#dadce0] rounded-xl overflow-hidden overflow-x-auto">
                          <table className="w-full text-xs md:text-sm min-w-[400px]">
                            <thead className="bg-[#f8f9fa]">
                              <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold tracking-tight md:tracking-normal">
                                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap w-14">층</th>
                                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap">면적</th>
                                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap hidden md:table-cell">용도</th>
                                <th className="p-1.5 md:p-2.5 text-left whitespace-nowrap">{getFilterColumnHeader()}</th>
                                <th className="p-1.5 md:p-2.5 text-center whitespace-nowrap w-10">도면</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {displayFloors.map(floorNum => {
                                const floorSpec = getFloorSpec(floorNum);
                                const zones = getFloorZones(floorNum);
                                const hasPlan = floorPlans.some(p => p.propertyId === selectedProperty!.id && p.buildingId === bldg.id && p.floorNumber === floorNum);
                                return (
                                  <tr key={floorNum} className="hover:bg-[#f8f9fa]">
                                    <td className="p-1.5 md:p-2.5 text-center">
                                      <span className="font-black text-[10px] md:text-xs text-[#202124]">{getFloorLabel(floorNum)}</span>
                                    </td>
                                    <td className="p-1.5 md:p-2.5 text-center font-bold text-[10px] md:text-xs text-[#1a73e8] whitespace-nowrap">
                                      {floorSpec ? formatArea(floorSpec.area) : '-'}
                                    </td>
                                    <td className="p-1.5 md:p-2.5 text-center text-[9px] md:text-[10px] text-[#5f6368] hidden md:table-cell whitespace-nowrap">
                                      {floorSpec?.usage || '-'}
                                    </td>
                                    <td className="p-1.5 md:p-2.5">{renderZoneInfo(zones, floorNum)}</td>
                                    <td className="p-1.5 md:p-2.5 text-center">
                                      <button onClick={() => { setViewerFloorNumber(floorNum); setFloorPlanViewerOpen(true); }}
                                        className="p-1 hover:bg-[#e8f0fe] rounded transition-colors" title={hasPlan ? '도면 보기' : '도면 추가'}>
                                        <FileImage size={12} className={hasPlan ? 'text-[#1a73e8]' : 'text-gray-400'}/>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-[#e8f0fe] border-t-2 border-[#1a73e8]">
                              <tr className="font-bold text-[#1a73e8] text-[10px] md:text-sm">
                                <td className="p-1.5 md:p-2.5 text-center">합계</td>
                                <td className="p-1.5 md:p-2.5 text-center whitespace-nowrap">{formatArea(totalArea)}</td>
                                <td className="p-1.5 md:p-2.5 hidden md:table-cell"></td>
                                <td className="p-1.5 md:p-2.5" colSpan={2}></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-[#f8f9fa]">
                          <Layers size={32} className="mx-auto text-gray-300 mb-2"/>
                          <p className="text-gray-400 font-bold text-sm">{zf ? `${ZONE_USAGE_LABELS[zf]} 구역이 없습니다` : '층 정보가 없습니다'}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ========== 조닝 탭 ========== */}
                {activeTab === 'ZONING' && (() => {
                  if (!selectedProperty || selectedProperty.buildings.length === 0) {
                    return (
                      <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-[#f8f9fa]">
                        <Grid3X3 size={40} className="mx-auto text-gray-300 mb-3"/>
                        <p className="text-gray-400 font-bold">건물을 먼저 등록하세요</p>
                      </div>
                    );
                  }
                  const effectiveBldgId = zoningBldgId || selectedProperty.buildings[0]?.id || '';
                  const zBldg = selectedProperty.buildings.find(b => b.id === effectiveBldgId) || selectedProperty.buildings[0];
                  if (!zBldg) return null;

                  const bldgFloorNums = [...new Set([
                    ...zBldg.spec.floors.map(f => f.floorNumber),
                    ...propertyUnits.filter(u => u.buildingId === zBldg.id).map(u => u.floor),
                  ])].sort((a, b) => b - a);
                  const effectiveFloor = zoningFloorNum ?? bldgFloorNums[0] ?? null;

                  const plan = floorPlans.find(p => p.propertyId === selectedProperty!.id && p.buildingId === zBldg.id && p.floorNumber === effectiveFloor);
                  const zones = plan ? floorZones.filter(z => z.floorPlanId === plan.id) : [];

                  const getDetailSummary = (zone: FloorZone): string => {
                    const d = zone.detail;
                    if (!d) return '-';
                    switch (d.usage) {
                      case 'OFFICE': return [d.departmentName, d.headcount ? `${d.headcount}명` : ''].filter(Boolean).join(' / ') || '-';
                      case 'MEETING_ROOM': return d.meetingCapacity ? `${d.meetingCapacity}인실` : '-';
                      case 'STORAGE': case 'SAMPLE_ROOM': return [d.storageDepartment, d.managerPrimary ? `정: ${d.managerPrimary}` : ''].filter(Boolean).join(' / ') || '-';
                      case 'PARKING': return [d.parkingSpaces ? `${d.parkingSpaces}대` : '', d.parkingAssignee].filter(Boolean).join(' / ') || '-';
                      case 'BATHROOM': return [d.toiletCount ? `양변기${d.toiletCount}` : '', d.urinalCount ? `소변기${d.urinalCount}` : '', d.sinkCount ? `세면대${d.sinkCount}` : ''].filter(Boolean).join(' ') || '-';
                      case 'BEDROOM': return `방${d.bedroomNumber || ''}`;
                      default: return d.note || '-';
                    }
                  };

                  const handleEditZone = (zone: FloorZone) => {
                    setZoningEditZone(zone);
                    setZoningDetailForm(zone.detail ? { ...zone.detail } : {});
                  };

                  const handleSaveZoneDetail = () => {
                    if (!zoningEditZone) return;
                    const detail = zoningDetailForm.usage ? zoningDetailForm as ZoneDetail : undefined;
                    if (detail?.usage === 'BEDROOM' && !detail.bedroomNumber) {
                      const existingNums = zones.filter(z => z.id !== zoningEditZone.id && z.detail?.usage === 'BEDROOM').map(z => z.detail?.bedroomNumber || 0);
                      detail.bedroomNumber = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
                    }
                    onSaveZone({ ...zoningEditZone, detail, excludeFromGFA: zoningEditZone.excludeFromGFA, updatedAt: new Date().toISOString() });
                    setZoningEditZone(null);
                    setZoningDetailForm({});
                  };

                  return (
                    <div className="space-y-3">
                      {/* 건물 + 층 선택 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm md:text-base text-[#3c4043] flex items-center gap-1 md:gap-2">
                          <Grid3X3 size={16} className="md:w-[18px] md:h-[18px] text-[#1a73e8]"/> 조닝
                        </h3>
                        {selectedProperty.buildings.length > 1 && (
                          <select value={effectiveBldgId} onChange={e => { setZoningBldgId(e.target.value); setZoningFloorNum(null); }}
                            className="px-2 md:px-3 py-1 md:py-1.5 border border-[#dadce0] rounded-lg text-[10px] md:text-xs font-bold focus:outline-none focus:border-[#1a73e8]">
                            {selectedProperty.buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        )}
                        <select value={effectiveFloor ?? ''} onChange={e => setZoningFloorNum(e.target.value ? Number(e.target.value) : null)}
                          className="px-2 md:px-3 py-1 md:py-1.5 border border-[#dadce0] rounded-lg text-[10px] md:text-xs font-bold focus:outline-none focus:border-[#1a73e8]">
                          {bldgFloorNums.map(n => <option key={n} value={n}>{n > 0 ? `${n}F` : `B${Math.abs(n)}`}</option>)}
                        </select>
                        {effectiveFloor !== null && (
                          <button onClick={() => { setViewerFloorNumber(effectiveFloor); setFloorPlanViewerOpen(true); }}
                            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold text-[#1a73e8] border border-[#1a73e8] rounded-lg hover:bg-[#e8f0fe] transition-colors">
                            <FileImage size={12}/> 도면 보기
                          </button>
                        )}
                      </div>

                      {/* 조닝 테이블 */}
                      {(() => {
                        const boundary = zones.find(z => z.type === 'FLOOR_BOUNDARY');
                        const displayZones = zones.filter(z => z.type !== 'FLOOR_BOUNDARY');
                        const boundaryArea = boundary?.estimatedArea || 0;
                        const zonedArea = displayZones.filter(z => !z.excludeFromGFA).reduce((s, z) => s + (z.estimatedArea || 0), 0);
                        const miscArea = Math.max(0, boundaryArea - zonedArea);
                        const totalZoneCount = displayZones.length + (boundary && miscArea > 0 ? 1 : 0);
                        const excludedArea = displayZones.filter(z => z.excludeFromGFA).reduce((s, z) => s + (z.estimatedArea || 0), 0);

                        return displayZones.length > 0 || boundary ? (
                          <div className="bg-white border border-[#dadce0] rounded-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-xs md:text-sm min-w-[500px]">
                              <thead className="bg-[#f8f9fa]">
                                <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold tracking-tight md:tracking-normal">
                                  <th className="p-1.5 md:p-3 text-left whitespace-nowrap">구역명</th>
                                  <th className="p-1.5 md:p-3 text-center whitespace-nowrap">면적</th>
                                  <th className="p-1.5 md:p-3 text-center whitespace-nowrap">세부용도</th>
                                  <th className="p-1.5 md:p-3 text-left whitespace-nowrap">상세정보</th>
                                  <th className="p-1.5 md:p-3 text-center whitespace-nowrap hidden md:table-cell">산입</th>
                                  <th className="p-1.5 md:p-3 text-center w-12">관리</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {displayZones.map(zone => (
                                  <tr key={zone.id} className={`hover:bg-[#f8f9fa] cursor-pointer ${zone.excludeFromGFA ? 'opacity-60' : ''}`} onClick={() => handleEditZone(zone)}>
                                    <td className="p-1.5 md:p-3">
                                      <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: zone.color, opacity: zone.opacity }}/>
                                        <span className="font-bold text-[10px] md:text-sm text-[#202124]">
                                          {zone.detail?.usage === 'BEDROOM' ? `방${zone.detail.bedroomNumber || ''}` : zone.name}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#1a73e8] whitespace-nowrap">
                                      {zone.estimatedArea ? `약 ${formatArea(zone.estimatedArea)}` : '-'}
                                    </td>
                                    <td className="p-1.5 md:p-3 text-center">
                                      {zone.detail?.usage ? (
                                        <span className="px-2 py-0.5 bg-[#e8f0fe] text-[#1a73e8] text-[9px] md:text-[10px] font-bold rounded whitespace-nowrap">
                                          {ZONE_USAGE_LABELS[zone.detail.usage]}
                                        </span>
                                      ) : <span className="text-gray-400 text-[9px]">미지정</span>}
                                    </td>
                                    <td className="p-1.5 md:p-3 text-[9px] md:text-xs text-[#5f6368] truncate max-w-[200px]">{getDetailSummary(zone)}</td>
                                    <td className="p-1.5 md:p-3 text-center hidden md:table-cell">
                                      {zone.excludeFromGFA ? (
                                        <span className="text-[9px] text-red-400 font-bold">제외</span>
                                      ) : (
                                        <span className="text-[9px] text-green-500 font-bold">포함</span>
                                      )}
                                    </td>
                                    <td className="p-1.5 md:p-3 text-center">
                                      <button onClick={(e) => { e.stopPropagation(); handleEditZone(zone); }}
                                        className="p-1 md:p-1.5 hover:bg-[#e8f0fe] rounded-lg transition-colors">
                                        <Edit2 size={10} className="md:w-3 md:h-3 text-[#1a73e8]"/>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {/* 기타영역 (미조닝 면적) */}
                                {boundary && miscArea > 0.1 && (
                                  <tr className="bg-[#f8f9fa]">
                                    <td className="p-1.5 md:p-3">
                                      <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-gray-300"/>
                                        <span className="font-bold text-[10px] md:text-sm text-[#5f6368]">기타영역</span>
                                      </div>
                                    </td>
                                    <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#5f6368] whitespace-nowrap">
                                      약 {formatArea(miscArea)}
                                    </td>
                                    <td className="p-1.5 md:p-3 text-center"><span className="text-gray-400 text-[9px]">미지정</span></td>
                                    <td className="p-1.5 md:p-3 text-[9px] text-[#9aa0a6]">바닥영역 중 조닝 미설정 부분</td>
                                    <td className="p-1.5 md:p-3 text-center hidden md:table-cell"><span className="text-[9px] text-green-500 font-bold">포함</span></td>
                                    <td className="p-1.5 md:p-3"></td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot className="bg-[#e8f0fe] border-t-2 border-[#1a73e8]">
                                <tr className="font-bold text-[#1a73e8] text-[10px] md:text-sm">
                                  <td className="p-1.5 md:p-3">합계 {totalZoneCount}개</td>
                                  <td className="p-1.5 md:p-3 text-center whitespace-nowrap">약 {formatArea(boundaryArea)}</td>
                                  <td className="p-1.5 md:p-3" colSpan={2}>
                                    {excludedArea > 0 && <span className="text-[9px] text-[#5f6368] font-normal">(산입제외 약 {formatArea(excludedArea)})</span>}
                                  </td>
                                  <td className="p-1.5 md:p-3 hidden md:table-cell"></td>
                                  <td className="p-1.5 md:p-3"></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-[#f8f9fa]">
                            <Grid3X3 size={32} className="mx-auto text-gray-300 mb-2"/>
                            <p className="text-gray-400 font-bold text-sm">{plan ? '등록된 구역이 없습니다' : '도면을 먼저 업로드하세요'}</p>
                            <p className="text-gray-400 text-xs mt-1">도면 뷰어에서 구역을 설정하면 여기에 표시됩니다</p>
                          </div>
                        );
                      })()}

                      {/* 조닝 편집 모달 */}
                      {zoningEditZone && (
                        <Modal onClose={() => { setZoningEditZone(null); setZoningDetailForm({}); }}>
                          <div className="p-4 md:p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                              <h3 className="text-lg md:text-xl font-black text-[#202124] flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: zoningEditZone.color, opacity: zoningEditZone.opacity }}/>
                                {zoningEditZone.name} - 세부정보
                              </h3>
                              <button onClick={() => { setZoningEditZone(null); setZoningDetailForm({}); }} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                              <div>
                                <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">면적</label>
                                <p className="font-bold text-sm text-[#1a73e8]">{zoningEditZone.estimatedArea ? `약 ${formatArea(zoningEditZone.estimatedArea)}` : '-'}</p>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">연결 호실</label>
                                <p className="font-bold text-sm text-[#202124]">
                                  {zoningEditZone.linkedUnitId ? units.find(u => u.id === zoningEditZone.linkedUnitId)?.unitNumber + '호' : '-'}
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-[#5f6368] mb-1 block uppercase tracking-widest">세부용도</label>
                              <select value={zoningDetailForm.usage || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, usage: e.target.value as ZoneUsage })}
                                className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#e8f0fe] focus:border-[#1a73e8] outline-none">
                                <option value="">선택하세요</option>
                                {ZONE_USAGE_OPTIONS.map(u => <option key={u} value={u}>{ZONE_USAGE_LABELS[u]}</option>)}
                              </select>
                            </div>
                            {/* 사무실 */}
                            {zoningDetailForm.usage === 'OFFICE' && (
                              <div className="grid grid-cols-2 gap-3 bg-[#f8f9fa] p-3 rounded-lg">
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">부서명</label>
                                  <input type="text" value={zoningDetailForm.departmentName || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, departmentName: e.target.value })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="예: 총무팀"/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">근무인원</label>
                                  <input type="number" value={zoningDetailForm.headcount || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, headcount: Number(e.target.value) || undefined })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="0"/>
                                </div>
                              </div>
                            )}
                            {/* 회의실 */}
                            {zoningDetailForm.usage === 'MEETING_ROOM' && (
                              <div className="bg-[#f8f9fa] p-3 rounded-lg">
                                <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">수용인원 (몇인실)</label>
                                <input type="number" value={zoningDetailForm.meetingCapacity || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, meetingCapacity: Number(e.target.value) || undefined })}
                                  className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="예: 10"/>
                              </div>
                            )}
                            {/* 창고/샘플실 */}
                            {(zoningDetailForm.usage === 'STORAGE' || zoningDetailForm.usage === 'SAMPLE_ROOM') && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#f8f9fa] p-3 rounded-lg">
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">부서명</label>
                                  <input type="text" value={zoningDetailForm.storageDepartment || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, storageDepartment: e.target.value })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm"/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">정관리자</label>
                                  <input type="text" value={zoningDetailForm.managerPrimary || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, managerPrimary: e.target.value })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm"/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">부관리자</label>
                                  <input type="text" value={zoningDetailForm.managerSecondary || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, managerSecondary: e.target.value })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm"/>
                                </div>
                              </div>
                            )}
                            {/* 주차장 */}
                            {zoningDetailForm.usage === 'PARKING' && (
                              <div className="space-y-3 bg-[#f8f9fa] p-3 rounded-lg">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">주차대수</label>
                                    <input type="number" value={zoningDetailForm.parkingSpaces || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, parkingSpaces: Number(e.target.value) || undefined })}
                                      className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="0"/>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">배정대상</label>
                                    <input type="text" value={zoningDetailForm.parkingAssignee || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, parkingAssignee: e.target.value })}
                                      className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="예: 대표이사"/>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">지정주차 차량번호</label>
                                  <div className="space-y-1">
                                    {(zoningDetailForm.assignedVehicles || []).map((v, i) => (
                                      <div key={i} className="flex items-center gap-1">
                                        <input type="text" value={v} onChange={e => {
                                          const arr = [...(zoningDetailForm.assignedVehicles || [])];
                                          arr[i] = e.target.value;
                                          setZoningDetailForm({ ...zoningDetailForm, assignedVehicles: arr });
                                        }} className="flex-1 border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="예: 12가3456"/>
                                        <button onClick={() => {
                                          const arr = (zoningDetailForm.assignedVehicles || []).filter((_, idx) => idx !== i);
                                          setZoningDetailForm({ ...zoningDetailForm, assignedVehicles: arr });
                                        }} className="p-1 text-red-400 hover:text-red-600"><X size={14}/></button>
                                      </div>
                                    ))}
                                    <button onClick={() => setZoningDetailForm({ ...zoningDetailForm, assignedVehicles: [...(zoningDetailForm.assignedVehicles || []), ''] })}
                                      className="text-[10px] font-bold text-[#1a73e8] flex items-center gap-0.5 hover:underline"><Plus size={12}/>차량 추가</button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* 화장실 */}
                            {zoningDetailForm.usage === 'BATHROOM' && (
                              <div className="grid grid-cols-3 gap-3 bg-[#f8f9fa] p-3 rounded-lg">
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">양변기</label>
                                  <input type="number" value={zoningDetailForm.toiletCount || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, toiletCount: Number(e.target.value) || undefined })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="0"/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">소변기</label>
                                  <input type="number" value={zoningDetailForm.urinalCount || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, urinalCount: Number(e.target.value) || undefined })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="0"/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">세면대</label>
                                  <input type="number" value={zoningDetailForm.sinkCount || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, sinkCount: Number(e.target.value) || undefined })}
                                    className="w-full border border-[#dadce0] p-2 rounded-lg text-sm" placeholder="0"/>
                                </div>
                              </div>
                            )}
                            {/* 방 자동연번 */}
                            {zoningDetailForm.usage === 'BEDROOM' && (
                              <div className="bg-[#f8f9fa] p-3 rounded-lg">
                                <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">방 번호 (자동)</label>
                                <p className="text-sm font-bold text-[#202124]">
                                  방{zoningDetailForm.bedroomNumber || (() => {
                                    const existingNums = zones.filter(z => z.id !== zoningEditZone.id && z.detail?.usage === 'BEDROOM').map(z => z.detail?.bedroomNumber || 0);
                                    return existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
                                  })()}
                                </p>
                              </div>
                            )}
                            {/* 연면적 산입 제외 */}
                            <label className="flex items-center gap-2 cursor-pointer py-1">
                              <input type="checkbox" checked={zoningEditZone.excludeFromGFA || false}
                                onChange={e => setZoningEditZone({ ...zoningEditZone, excludeFromGFA: e.target.checked })}
                                className="w-4 h-4 rounded border-[#dadce0] text-[#1a73e8] focus:ring-[#1a73e8]"/>
                              <span className="text-xs font-bold text-[#5f6368]">연면적 산입 제외</span>
                              <span className="text-[9px] text-[#9aa0a6]">(주차장, 필로티 등 건축물대장 연면적에 미포함)</span>
                            </label>
                            {/* 메모 */}
                            {zoningDetailForm.usage && (
                              <div>
                                <label className="text-[10px] font-bold text-[#5f6368] mb-1 block">메모</label>
                                <textarea value={zoningDetailForm.note || ''} onChange={e => setZoningDetailForm({ ...zoningDetailForm, note: e.target.value })}
                                  className="w-full border border-[#dadce0] p-2 rounded-lg text-sm resize-none" rows={2} placeholder="기타 참고사항"/>
                              </div>
                            )}
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                              <button onClick={() => { setZoningEditZone(null); setZoningDetailForm({}); }}
                                className="px-4 py-2 text-xs font-bold text-[#5f6368] hover:bg-[#f8f9fa] rounded-lg">취소</button>
                              <button onClick={handleSaveZoneDetail}
                                className="px-4 py-2 text-xs font-bold bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0]">저장</button>
                            </div>
                          </div>
                        </Modal>
                      )}
                    </div>
                  );
                })()}

                {activeTab === 'UNIT' && (
                  <div className="space-y-3 md:space-y-6">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="font-black text-sm md:text-base text-[#3c4043] flex items-center gap-1 md:gap-2"><Layers size={16} className="md:w-[18px] md:h-[18px] text-[#1a73e8]"/> 호실 ({propertyUnits.length}개)</h3>
                      <button
                        onClick={() => {
                          if (selectedProperty.buildings.length === 0) {
                            alert('호실을 추가하려면 먼저 건물을 등록해야 합니다.');
                            return;
                          }
                          setNewUnit({buildingId: selectedProperty.buildings[0]?.id || '', unitNumber: '', floor: 1, area: 0, usage: '업무시설', status: 'VACANT', rentType: '월세', deposit: 0, monthlyRent: 0});
                          setIsUnitModalOpen(true);
                        }}
                        className="bg-[#1a73e8] text-white px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-2 shadow-lg hover:bg-[#1557b0] transition-all"
                      >
                        <Plus size={14} className="md:w-4 md:h-4"/> 추가
                      </button>
                    </div>

                    {/* 건물이 없는 경우 안내 */}
                    {selectedProperty.buildings.length === 0 && (
                      <div className="bg-[#fef7e0] border border-[#feefc3] p-3 md:p-4 rounded-lg md:rounded-xl text-[11px] md:text-sm text-[#b06000] font-medium">
                        호실을 추가하려면 먼저 <strong>건물 탭</strong>에서 건물을 등록해야 합니다.
                      </div>
                    )}

                    {/* 건물별 호실 테이블 */}
                    {selectedProperty.buildings.map(building => {
                      const buildingUnits = propertyUnits.filter(u => u.buildingId === building.id);
                      return (
                        <div key={building.id} className="space-y-2 md:space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="p-1.5 md:p-2 bg-indigo-50 text-[#1a73e8] rounded-lg"><BuildingIcon size={14} className="md:w-4 md:h-4"/></div>
                              <div>
                                <h4 className="font-bold text-[11px] md:text-sm text-[#202124]">{building.name}</h4>
                                <p className="text-[9px] md:text-[10px] text-[#5f6368]">{buildingUnits.length}개 호실</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setNewUnit({buildingId: building.id, unitNumber: '', floor: 1, area: 0, usage: building.spec.detailUsage || building.spec.mainUsage || '업무시설', status: 'VACANT', rentType: '월세', deposit: 0, monthlyRent: 0});
                                setIsUnitModalOpen(true);
                              }}
                              className="text-[10px] md:text-xs font-bold text-[#1a73e8] hover:bg-[#e8f0fe] px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Plus size={12} className="md:w-3.5 md:h-3.5"/> 추가
                            </button>
                          </div>

                          {buildingUnits.length > 0 ? (
                            <div className="bg-white border border-[#dadce0] rounded-lg md:rounded-xl overflow-hidden overflow-x-auto">
                              {/* 정렬 버튼 */}
                              <div className="px-2 md:px-4 py-1.5 md:py-2 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center gap-1 md:gap-2">
                                <span className="text-[8px] md:text-[10px] text-gray-500 font-bold hidden md:inline">정렬:</span>
                                {[
                                  { key: 'floor', label: '층' },
                                  { key: 'area', label: '면적' },
                                  { key: 'status', label: '상태' }
                                ].map(opt => (
                                  <button
                                    key={opt.key}
                                    onClick={() => {
                                      if (unitSortKey === opt.key) setUnitSortDesc(!unitSortDesc);
                                      else { setUnitSortKey(opt.key as any); setUnitSortDesc(true); }
                                    }}
                                    className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[10px] font-bold rounded ${unitSortKey === opt.key ? 'bg-[#1a73e8] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                  >
                                    {opt.label} {unitSortKey === opt.key && (unitSortDesc ? '↓' : '↑')}
                                  </button>
                                ))}
                              </div>
                              <table className="w-full text-xs md:text-sm min-w-[500px]">
                                <thead className="bg-[#f8f9fa]">
                                  <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold tracking-tight md:tracking-normal">
                                    <th className="p-1.5 md:p-3 text-center whitespace-nowrap">호실</th>
                                    <th className="p-1.5 md:p-3 text-center whitespace-nowrap">층</th>
                                    <th className="p-1.5 md:p-3 text-center whitespace-nowrap">면적</th>
                                    <th className="p-1.5 md:p-3 text-center whitespace-nowrap hidden md:table-cell">용도</th>
                                    <th className="p-1.5 md:p-3 text-center whitespace-nowrap">상태</th>
                                    <th className="p-1.5 md:p-3 text-center whitespace-nowrap">보증금</th>
                                    <th className="p-1.5 md:p-3 text-center whitespace-nowrap">월차임</th>
                                    <th className="p-1.5 md:p-3 text-center w-12 md:w-20">관리</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {buildingUnits
                                    .sort((a, b) => {
                                      let cmp = 0;
                                      if (unitSortKey === 'floor') cmp = b.floor - a.floor;
                                      else if (unitSortKey === 'area') cmp = b.area - a.area;
                                      else if (unitSortKey === 'status') cmp = a.status.localeCompare(b.status);
                                      return unitSortDesc ? cmp : -cmp;
                                    })
                                    .map(unit => (
                                      <tr key={unit.id} className="hover:bg-[#f8f9fa] group">
                                        <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#202124] whitespace-nowrap">{unit.unitNumber}호</td>
                                        <td className="p-1.5 md:p-3 text-center text-[10px] md:text-sm text-gray-600 whitespace-nowrap">
                                          {unit.floor > 0 ? `${unit.floor}F` : `B${Math.abs(unit.floor)}`}
                                        </td>
                                        <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-[#1a73e8] whitespace-nowrap tracking-tight">{formatArea(unit.area)}</td>
                                        <td className="p-1.5 md:p-3 text-center text-[#5f6368] text-[9px] md:text-xs hidden md:table-cell">{unit.usage}</td>
                                        <td className="p-1.5 md:p-3 text-center">
                                          <span className={`px-1 md:px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold whitespace-nowrap ${
                                            unit.status === 'OCCUPIED' ? 'bg-[#e6f4ea] text-[#137333]' :
                                            unit.status === 'UNDER_REPAIR' ? 'bg-orange-50 text-orange-600' :
                                            'bg-[#fef7e0] text-[#b06000]'
                                          }`}>
                                            {unit.status === 'OCCUPIED' ? '임대' : unit.status === 'UNDER_REPAIR' ? '보수' : '공실'}
                                          </span>
                                        </td>
                                        <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-gray-700 whitespace-nowrap tracking-tight">
                                          {unit.status === 'OCCUPIED' && unit.deposit ? formatMoneyInput(unit.deposit) : '-'}
                                        </td>
                                        <td className="p-1.5 md:p-3 text-center font-bold text-[10px] md:text-sm text-gray-700 whitespace-nowrap tracking-tight">
                                          {unit.status === 'OCCUPIED' && unit.monthlyRent ? formatMoneyInput(unit.monthlyRent) : '-'}
                                        </td>
                                        <td className="p-1.5 md:p-3 text-center">
                                          <div className="flex items-center justify-center gap-0.5 md:gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button className="p-1 md:p-1.5 hover:bg-[#e8f0fe] rounded-lg transition-colors" title="수정">
                                              <Edit2 size={10} className="md:w-3 md:h-3 text-[#1a73e8]" />
                                            </button>
                                            <button className="p-1 md:p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                                              <Trash2 size={10} className="md:w-3 md:h-3 text-red-500" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                                {/* 합계 행 */}
                                <tfoot className="bg-[#e8f0fe] border-t-2 border-[#1a73e8]">
                                  <tr className="font-bold text-[#1a73e8] text-[10px] md:text-sm">
                                    <td className="p-1.5 md:p-3 text-center whitespace-nowrap">합계</td>
                                    <td className="p-1.5 md:p-3 text-center whitespace-nowrap">{buildingUnits.length}개</td>
                                    <td className="p-1.5 md:p-3 text-center whitespace-nowrap tracking-tight">{formatArea(buildingUnits.reduce((sum, u) => sum + u.area, 0))}</td>
                                    <td className="p-1.5 md:p-3 text-center hidden md:table-cell">-</td>
                                    <td className="p-1.5 md:p-3 text-center text-[8px] md:text-xs whitespace-nowrap">
                                      {buildingUnits.filter(u => u.status === 'OCCUPIED').length}/{buildingUnits.filter(u => u.status === 'VACANT').length}
                                    </td>
                                    <td className="p-1.5 md:p-3 text-center whitespace-nowrap tracking-tight">
                                      {formatMoneyInput(buildingUnits.filter(u => u.status === 'OCCUPIED').reduce((sum, u) => sum + (u.deposit || 0), 0))}
                                    </td>
                                    <td className="p-1.5 md:p-3 text-center whitespace-nowrap tracking-tight">
                                      {formatMoneyInput(buildingUnits.filter(u => u.status === 'OCCUPIED').reduce((sum, u) => sum + (u.monthlyRent || 0), 0))}
                                    </td>
                                    <td className="p-1.5 md:p-3"></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <div className="py-4 md:py-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg md:rounded-xl text-[11px] md:text-sm bg-[#f8f9fa]">
                              등록된 호실이 없습니다
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* 건물 미지정 호실 */}
                    {propertyUnits.filter(u => !selectedProperty.buildings.find(b => b.id === u.buildingId)).length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 text-red-500 rounded-lg"><Layers size={16}/></div>
                          <div>
                            <h4 className="font-bold text-red-600">건물 미지정 호실</h4>
                            <p className="text-[10px] text-red-400">건물 연결이 필요합니다</p>
                          </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex flex-wrap gap-2">
                            {propertyUnits.filter(u => !selectedProperty.buildings.find(b => b.id === u.buildingId)).map(unit => (
                              <span key={unit.id} className="px-3 py-1 bg-white border border-red-200 rounded-full text-sm font-bold text-red-600">
                                {unit.unitNumber}호
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {propertyUnits.length === 0 && selectedProperty.buildings.length > 0 && (
                      <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-[#f8f9fa]">
                        <Layers size={40} className="mx-auto text-gray-300 mb-3"/>
                        <p className="text-gray-400 font-bold">등록된 호실이 없습니다</p>
                        <p className="text-gray-400 text-sm mt-1">건물별 "호실 추가" 버튼을 클릭하세요</p>
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-gray-400 bg-[#f8f9fa] rounded-2xl border-2 border-dashed border-gray-200">
             <Layers size={48} className="mb-3 opacity-20"/>
             <p className="font-bold text-sm">조회할 자산을 리스트에서 선택해 주세요.</p>
          </div>
        )}
      </div>

      {isPropertyModalOpen && (
        <Modal onClose={() => setIsPropertyModalOpen(false)} disableOverlayClick={true}>
           <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                 <h3 className="text-2xl font-black text-[#202124] flex items-center gap-3"><Edit2 size={24} className="text-[#1a73e8]"/> 물건 정보</h3>
                 <button onClick={() => setIsPropertyModalOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="md:col-span-2">
                    <label className="text-xs font-black text-[#5f6368] mb-2 block uppercase tracking-widest">물건명 <span className="text-[#ea4335]">*</span></label>
                    <input className="w-full border border-[#dadce0] p-4 rounded-xl focus:ring-4 focus:ring-[#e8f0fe] focus:border-[#1a73e8] outline-none font-black text-lg transition-all" value={newProp.name} onChange={e => setNewProp({...newProp, name: e.target.value})} placeholder="예: 강남 시그니처 타워"/>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-2xl md:col-span-2 space-y-4 border border-[#dadce0]">
                    <div className="flex items-center justify-between">
                       <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><MapPin size={16}/> 소재지</p>
                       <AddressSearch
                         placeholder="주소 검색"
                         appSettings={appSettings}
                         onAddressSelect={handlePropAddressSelect}
                       />
                    </div>

                    {(displayAddress || newProp.masterAddress?.sido) && (
                      <div className="bg-white p-4 rounded-xl border border-[#dadce0] space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">지번주소</label>
                          <p className="font-bold text-[#202124]">
                            {displayAddress || getFullAddress(newProp.masterAddress!)}
                          </p>
                          {propPnu && <p className="text-[10px] text-gray-400 mt-1">PNU: {propPnu}</p>}
                        </div>
                        {newProp.roadAddress && (
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">도로명주소</label>
                            <p className="font-bold text-[#202124]">{newProp.roadAddress}</p>
                          </div>
                        )}

                        {/* 토지정보 조회 중 또는 조회 결과 */}
                        {isLoadingPropLandInfo && (
                          <div className="flex items-center gap-2 p-3 bg-[#e8f0fe] rounded-lg text-sm text-[#1a73e8]">
                            <Loader2 size={14} className="animate-spin" />
                            <span>토지정보 조회중...</span>
                          </div>
                        )}
                        {propLandInfo && !isLoadingPropLandInfo && (
                          <div className="p-3 bg-[#e6f4ea] rounded-lg border border-[#ceead6]">
                            <p className="text-xs font-bold text-[#137333] mb-2">토지정보 자동 조회됨</p>
                            <div className="flex gap-6 text-sm">
                              <div>
                                <span className="text-gray-500">지목:</span>
                                <span className="ml-2 font-bold text-[#202124]">{propLandInfo.jimok}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">면적:</span>
                                <span className="ml-2 font-bold text-[#1a73e8]">{formatArea(propLandInfo.area)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">시/도</label>
                            <p className="text-sm font-medium">{newProp.masterAddress?.sido}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">시/군/구</label>
                            <p className="text-sm font-medium">{newProp.masterAddress?.sigungu}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">읍/면/동</label>
                            <p className="text-sm font-medium">{newProp.masterAddress?.eupMyeonDong}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">본번</label>
                            <p className="text-sm font-medium">{newProp.masterAddress?.bonbun}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">부번</label>
                            <p className="text-sm font-medium">{newProp.masterAddress?.bubun || '-'}</p>
                          </div>
                          {newProp.masterAddress?.li && (
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 mb-1 block">리</label>
                              <p className="text-sm font-medium">{newProp.masterAddress?.li}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!displayAddress && !newProp.masterAddress?.sido && (
                      <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-200 text-center">
                        <Search size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">주소 검색 버튼을 클릭하여 소재지를 입력하세요</p>
                      </div>
                    )}
                 </div>
              </div>
              <div className="flex gap-3 border-t border-gray-100 pt-8">
                 <button onClick={() => setIsPropertyModalOpen(false)} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소</button>
                 <button onClick={handleSaveProperty} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">저장</button>
              </div>
           </div>
        </Modal>
      )}

      {isUnitModalOpen && selectedProperty && (
        <Modal onClose={() => setIsUnitModalOpen(false)} disableOverlayClick={true}>
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                   <h3 className="text-xl font-black text-[#202124] flex items-center gap-3"><Layers size={24} className="text-[#1a73e8]"/> 호실 추가</h3>
                   <button onClick={() => setIsUnitModalOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
                </div>

                {/* 건물 선택 */}
                <div className="bg-[#e8f0fe] p-4 rounded-xl border border-[#c2d7f8]">
                    <label className="text-xs font-black text-[#1a73e8] block mb-2 uppercase tracking-widest flex items-center gap-2"><BuildingIcon size={14}/> 소속 건물 <span className="text-red-500">*</span></label>
                    <select
                        className="w-full border border-[#1a73e8] bg-white p-3 rounded-lg font-bold focus:ring-2 focus:ring-[#1a73e8] outline-none"
                        value={newUnit.buildingId}
                        onChange={e => {
                            const bldg = selectedProperty.buildings.find(b => b.id === e.target.value);
                            setNewUnit({...newUnit, buildingId: e.target.value, usage: bldg?.spec.mainUsage || newUnit.usage});
                        }}
                    >
                        {selectedProperty.buildings.length === 0 ? (
                            <option value="">-- 등록된 건물이 없습니다 --</option>
                        ) : (
                            selectedProperty.buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.spec.mainUsage})</option>
                            ))
                        )}
                    </select>
                </div>

                {/* 기본 정보 */}
                <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                    <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><Home size={14}/> 기본 정보</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">호실 번호 <span className="text-red-500">*</span></label>
                            <input
                                className="w-full border border-[#dadce0] p-3 rounded-lg font-black bg-white focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                value={newUnit.unitNumber}
                                onChange={e => setNewUnit({...newUnit, unitNumber: e.target.value})}
                                placeholder="예: 101"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">해당 층수 <span className="text-red-500">*</span></label>
                            {(() => {
                                const selectedBldg = selectedProperty?.buildings.find(b => b.id === newUnit.buildingId);
                                const groundFloors = selectedBldg?.spec.floorCount.ground || 1;
                                const undergroundFloors = selectedBldg?.spec.floorCount.underground || 0;
                                const floorOptions: number[] = [];
                                // 지상층 (1층부터)
                                for (let i = groundFloors; i >= 1; i--) floorOptions.push(i);
                                // 지하층 (음수로)
                                for (let i = 1; i <= undergroundFloors; i++) floorOptions.push(-i);
                                return (
                                    <select
                                        className="w-full border border-[#dadce0] p-3 rounded-lg font-bold bg-white focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                        value={newUnit.floor}
                                        onChange={e => setNewUnit({...newUnit, floor: Number(e.target.value)})}
                                    >
                                        {floorOptions.map(f => (
                                            <option key={f} value={f}>
                                                {f > 0 ? `${f}층` : `지하 ${Math.abs(f)}층`}
                                            </option>
                                        ))}
                                    </select>
                                );
                            })()}
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">전용 면적 (㎡)</label>
                            <input
                                type="text"
                                className="w-full border border-[#dadce0] p-3 rounded-lg font-black text-[#1a73e8] bg-white focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                value={formatNumberInput(newUnit.area)}
                                onChange={e => setNewUnit({...newUnit, area: parseNumberInput(e.target.value)})}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">용도</label>
                            <select
                                className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                value={newUnit.usage}
                                onChange={e => setNewUnit({...newUnit, usage: e.target.value})}
                            >
                                <option value="업무시설">업무시설 (사무실)</option>
                                <option value="근린생활시설">근린생활시설 (상가)</option>
                                <option value="판매시설">판매시설</option>
                                <option value="창고시설">창고시설</option>
                                <option value="주거시설">주거시설</option>
                                <option value="숙박시설">숙박시설</option>
                                <option value="기타">기타</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 임대 현황 */}
                <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                    <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><Info size={14}/> 임대 현황</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">임대 상태</label>
                            <select
                                className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                value={newUnit.status}
                                onChange={e => setNewUnit({...newUnit, status: e.target.value as Unit['status']})}
                            >
                                <option value="VACANT">공실</option>
                                <option value="OCCUPIED">임대중</option>
                                <option value="UNDER_REPAIR">보수중</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">임대 유형</label>
                            <select
                                className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                value={newUnit.rentType || '월세'}
                                onChange={e => setNewUnit({...newUnit, rentType: e.target.value})}
                            >
                                <option value="월세">월세</option>
                                <option value="전세">전세</option>
                                <option value="반전세">반전세</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">보증금 ({moneyLabel})</label>
                            <input
                                type="text"
                                className="w-full border border-[#dadce0] p-3 rounded-lg font-black bg-white focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                value={formatMoneyInput(newUnit.deposit)}
                                onChange={e => setNewUnit({...newUnit, deposit: parseMoneyInput(e.target.value)})}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">월세 ({moneyLabel})</label>
                            <input
                                type="text"
                                className={`w-full border border-[#dadce0] p-3 rounded-lg font-black bg-white focus:ring-2 focus:ring-[#e8f0fe] outline-none ${newUnit.rentType === '전세' ? 'bg-gray-100 text-gray-400' : ''}`}
                                value={newUnit.rentType === '전세' ? '0' : formatMoneyInput(newUnit.monthlyRent)}
                                onChange={e => setNewUnit({...newUnit, monthlyRent: parseMoneyInput(e.target.value)})}
                                placeholder="0"
                                disabled={newUnit.rentType === '전세'}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 border-t border-gray-100 pt-6">
                   <button onClick={() => setIsUnitModalOpen(false)} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소</button>
                   <button onClick={handleSaveUnit} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">저장</button>
                </div>
            </div>
        </Modal>
      )}

      {isBuildingModalOpen && (
          <Modal onClose={() => { setIsBuildingModalOpen(false); setEditingBuildingId(null); setBuildingTitleList([]); setBuildingFloorList([]); setSelectedBuildingTitle(null); }} disableOverlayClick={true}>
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                          <BuildingIcon size={24} className="text-[#1a73e8]"/>
                          {editingBuildingId ? '건물 수정' : '건물 추가'}
                      </h3>
                      <button onClick={() => { setIsBuildingModalOpen(false); setEditingBuildingId(null); setBuildingTitleList([]); setBuildingFloorList([]); setSelectedBuildingTitle(null); }} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  {/* 건축물대장 조회 섹션 */}
                  <div className="bg-[#e8f0fe] p-5 rounded-2xl border border-[#c2d7f8] space-y-4">
                      <div className="flex items-center justify-between">
                          <div>
                              <p className="text-sm font-black text-[#1a73e8] flex items-center gap-2">
                                  <Search size={16}/> 건축물대장 자동 조회
                              </p>
                              <p className="text-xs text-[#5f6368] mt-1">
                                  {selectedProperty?.lots[0]?.pnu
                                      ? `PNU: ${selectedProperty.lots[0].pnu}`
                                      : '대표 토지에 PNU 정보가 없습니다'}
                              </p>
                          </div>
                          <button
                              onClick={fetchBuildingInfoFromApi}
                              disabled={isLoadingBuildingInfo || !selectedProperty?.lots[0]?.pnu || !appSettings.dataGoKrApiKey}
                              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a73e8] text-white font-bold text-sm rounded-xl hover:bg-[#1557b0] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                              {isLoadingBuildingInfo ? (
                                  <><Loader2 size={14} className="animate-spin"/> 조회중...</>
                              ) : (
                                  <><Search size={14}/> 건축물 조회</>
                              )}
                          </button>
                      </div>

                      {/* 조회된 건축물 목록 */}
                      {buildingTitleList.length > 0 && (
                          <div className="space-y-2">
                              <p className="text-xs font-bold text-[#5f6368]">조회된 건축물 ({buildingTitleList.length}건) - 클릭하여 선택</p>
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                  {buildingTitleList.map((title, idx) => (
                                      <button
                                          key={idx}
                                          onClick={() => applyBuildingTitleToForm(title)}
                                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                                              selectedBuildingTitle?.mgmBldrgstPk === title.mgmBldrgstPk
                                                  ? 'bg-white border-[#1a73e8] ring-2 ring-[#e8f0fe]'
                                                  : 'bg-white border-[#dadce0] hover:border-[#1a73e8]'
                                          }`}
                                      >
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <p className="font-bold text-[#202124]">
                                                      {title.dongNm || title.bldNm || '(동명칭 없음)'}
                                                  </p>
                                                  <p className="text-xs text-[#5f6368] mt-1">
                                                      {title.mainPurpsCdNm} | 지상 {title.grndFlrCnt}층 · 지하 {title.ugrndFlrCnt}층
                                                  </p>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-xs text-[#1a73e8] font-bold">{title.totArea?.toLocaleString()}㎡</p>
                                                  <p className="text-[10px] text-[#5f6368]">
                                                      {title.useAprDay ? `${title.useAprDay.substring(0, 4)}.${title.useAprDay.substring(4, 6)}` : '-'}
                                                  </p>
                                              </div>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  {/* 선택된 건축물 추가 정보 */}
                  {selectedBuildingTitle && (
                      <div className="bg-[#e6f4ea] p-4 rounded-xl border border-[#ceead6] space-y-3">
                          <p className="text-xs font-bold text-[#137333] flex items-center gap-2">
                              <Info size={14}/> 건축물대장 추가 정보
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">구조</span>
                                  <span className="font-bold text-[#202124]">{selectedBuildingTitle.etcStrct || selectedBuildingTitle.strctCdNm || '-'}</span>
                              </div>
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">높이</span>
                                  <span className="font-bold text-[#202124]">{selectedBuildingTitle.heit ? `${selectedBuildingTitle.heit}m` : '-'}</span>
                              </div>
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">건폐율</span>
                                  <span className="font-bold text-[#202124]">{selectedBuildingTitle.bcRat ? `${selectedBuildingTitle.bcRat}%` : '-'}</span>
                              </div>
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">용적률</span>
                                  <span className="font-bold text-[#202124]">{selectedBuildingTitle.vlRat ? `${selectedBuildingTitle.vlRat}%` : '-'}</span>
                              </div>
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">지붕</span>
                                  <span className="font-bold text-[#202124]">{selectedBuildingTitle.roofCdNm || '-'}</span>
                              </div>
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">세대/호수</span>
                                  <span className="font-bold text-[#202124]">{selectedBuildingTitle.hhldCnt || 0}세대 / {selectedBuildingTitle.hoCnt || 0}호</span>
                              </div>
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">내진설계</span>
                                  <span className={`font-bold ${selectedBuildingTitle.rserthqkDsgnApplyYn === '1' ? 'text-[#137333]' : 'text-[#5f6368]'}`}>
                                      {selectedBuildingTitle.rserthqkDsgnApplyYn === '1' ? '적용' : '미적용'}
                                  </span>
                              </div>
                              <div>
                                  <span className="text-[10px] text-[#5f6368] block">에너지효율</span>
                                  <span className="font-bold text-[#202124]">{selectedBuildingTitle.engrGrade || '-'}</span>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* 기본 정보 */}
                  <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                      <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><BuildingIcon size={14}/> 기본 정보</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">건물명 <span className="text-red-500">*</span></label>
                              <input
                                  className="w-full border border-[#dadce0] p-3 rounded-lg focus:ring-2 focus:ring-[#e8f0fe] outline-none font-black bg-white"
                                  value={newBuilding.name}
                                  onChange={e => setNewBuilding({...newBuilding, name: e.target.value})}
                                  placeholder="예: A동, 본관"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">주용도</label>
                              <select
                                  className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                  value={newBuilding.spec?.mainUsage || ''}
                                  onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, mainUsage: e.target.value}})}
                              >
                                  <option value="업무시설">업무시설 (사무실)</option>
                                  <option value="근린생활시설">근린생활시설 (상가)</option>
                                  <option value="판매시설">판매시설</option>
                                  <option value="공장">공장</option>
                                  <option value="창고시설">창고시설</option>
                                  <option value="숙박시설">숙박시설</option>
                                  <option value="의료시설">의료시설</option>
                                  <option value="교육연구시설">교육연구시설</option>
                                  <option value="운동시설">운동시설</option>
                                  <option value="주거시설">주거시설 (아파트/오피스텔)</option>
                                  <option value="복합용도">복합용도</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">준공일</label>
                              <input
                                  type="date"
                                  className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                  value={newBuilding.spec?.completionDate || ''}
                                  onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, completionDate: e.target.value}})}
                              />
                          </div>
                      </div>
                  </div>

                  {/* 규모 정보 */}
                  <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                      <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><Ruler size={14}/> 규모</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">지상 층수</label>
                              <input
                                  type="number"
                                  min="0"
                                  className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                  value={newBuilding.spec?.floorCount.ground || 0}
                                  onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, floorCount: {...newBuilding.spec!.floorCount, ground: Number(e.target.value)}}})}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">지하 층수</label>
                              <input
                                  type="number"
                                  min="0"
                                  className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                  value={newBuilding.spec?.floorCount.underground || 0}
                                  onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, floorCount: {...newBuilding.spec!.floorCount, underground: Number(e.target.value)}}})}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">건축면적 (㎡)</label>
                              <input
                                  className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-black focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                  value={formatNumberInput(newBuilding.spec?.buildingArea)}
                                  onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, buildingArea: parseNumberInput(e.target.value)}})}
                                  placeholder="0"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">연면적 (㎡) {newBuilding.spec?.floors?.length ? <span className="text-[#1a73e8] normal-case tracking-normal">· 자동합산</span> : ''}</label>
                              <input
                                  className={`w-full border border-[#dadce0] p-3 rounded-lg font-black text-[#1a73e8] outline-none ${newBuilding.spec?.floors?.length ? 'bg-gray-50 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-[#e8f0fe]'}`}
                                  value={formatNumberInput(newBuilding.spec?.floors?.length ? newBuilding.spec.floors.reduce((sum, f) => sum + (f.area || 0), 0) : newBuilding.spec?.grossFloorArea)}
                                  onChange={e => {
                                      if (!newBuilding.spec?.floors?.length) {
                                          setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, grossFloorArea: parseNumberInput(e.target.value)}});
                                      }
                                  }}
                                  readOnly={!!newBuilding.spec?.floors?.length}
                                  placeholder="0"
                              />
                          </div>
                      </div>
                  </div>

                  {/* 부대시설 */}
                  <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                      <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><Info size={14}/> 부대시설</p>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">주차 대수</label>
                              <div className="flex items-center gap-2">
                                  <input
                                      type="number"
                                      min="0"
                                      className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newBuilding.spec?.parkingCapacity || 0}
                                      onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, parkingCapacity: Number(e.target.value)}})}
                                  />
                                  <span className="text-sm text-gray-500 font-bold">대</span>
                              </div>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">승강기 대수</label>
                              <div className="flex items-center gap-2">
                                  <input
                                      type="number"
                                      min="0"
                                      className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newBuilding.spec?.elevatorCount || 0}
                                      onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, elevatorCount: Number(e.target.value)}})}
                                  />
                                  <span className="text-sm text-gray-500 font-bold">대</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* 층별 정보 */}
                  <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-[10px] md:text-xs font-black text-[#1a73e8] uppercase tracking-wide md:tracking-widest flex items-center gap-1 md:gap-2">
                              <Layers size={12} className="md:w-3.5 md:h-3.5"/> 층별 정보 {newBuilding.spec?.floors?.length ? `(${newBuilding.spec.floors.length}개 층)` : ''}
                          </p>
                          <div className="flex items-center gap-2">
                              {newBuilding.spec?.floors && newBuilding.spec.floors.length > 0 && (
                                  <span className="text-[8px] md:text-[10px] text-[#5f6368]">
                                      {selectedBuildingTitle ? '건축물대장에서 자동 조회됨' : '수동 입력'}
                                  </span>
                              )}
                              <button
                                  type="button"
                                  onClick={() => {
                                      const ground = newBuilding.spec?.floorCount?.ground || 0;
                                      const underground = newBuilding.spec?.floorCount?.underground || 0;
                                      if (ground === 0 && underground === 0) {
                                          alert('지상 또는 지하 층수를 먼저 입력하세요.');
                                          return;
                                      }
                                      if (newBuilding.spec?.floors && newBuilding.spec.floors.length > 0) {
                                          if (!confirm('기존 층별정보가 초기화됩니다. 계속하시겠습니까?')) return;
                                      }
                                      const floors: FloorDetail[] = [];
                                      for (let i = underground; i >= 1; i--) {
                                          floors.push({ floorNumber: -i, area: 0, usage: '' });
                                      }
                                      for (let i = 1; i <= ground; i++) {
                                          floors.push({ floorNumber: i, area: 0, usage: '' });
                                      }
                                      const grossFloorArea = floors.reduce((sum, f) => sum + (f.area || 0), 0);
                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec!, floors, grossFloorArea } });
                                  }}
                                  className="px-2 md:px-3 py-1 md:py-1.5 bg-white border border-[#dadce0] text-[#5f6368] rounded-lg text-[9px] md:text-[10px] font-bold hover:bg-gray-50 hover:border-[#1a73e8] hover:text-[#1a73e8] transition-colors"
                              >
                                  층별정보 생성
                              </button>
                          </div>
                      </div>
                      {newBuilding.spec?.floors && newBuilding.spec.floors.length > 0 ? (
                          <>
                              <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                                  <table className="w-full text-xs md:text-sm min-w-[800px]">
                                      <thead className="bg-white sticky top-0 z-10">
                                          <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase tracking-tight md:tracking-normal">
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">층</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">면적</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">전용면적</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">전용률</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">용도</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">보증금</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">월차임</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap border-r border-gray-200">관리비</th>
                                              <th className="p-1.5 md:p-2 text-center font-bold whitespace-nowrap w-10"></th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {[...newBuilding.spec.floors]
                                              .sort((a, b) => b.floorNumber - a.floorNumber)
                                              .map((floor) => {
                                                  const actualIndex = newBuilding.spec.floors.findIndex(f => f.floorNumber === floor.floorNumber);

                                                  return (
                                                      <tr key={floor.floorNumber} className="hover:bg-white">
                                                          <td className="p-1.5 md:p-2 text-center font-bold text-[10px] md:text-sm text-[#202124] whitespace-nowrap border-r border-gray-100">
                                                              {floor.floorNumber > 0 ? `${floor.floorNumber}F` : `B${Math.abs(floor.floorNumber)}`}
                                                          </td>
                                                          <td className="p-1 md:p-1.5 border-r border-gray-100">
                                                              <input
                                                                  type="text"
                                                                  value={floor.area ? formatNumberInput(floor.area) : ''}
                                                                  onChange={(e) => {
                                                                      const value = parseNumberInput(e.target.value);
                                                                      const updated = [...newBuilding.spec.floors];
                                                                      updated[actualIndex] = { ...floor, area: value || 0 };
                                                                      if (floor.exclusiveRatio && value) {
                                                                          updated[actualIndex].exclusiveArea = Math.round(value * (floor.exclusiveRatio / 100) * 10) / 10;
                                                                      }
                                                                      const grossFloorArea = updated.reduce((sum, f) => sum + (f.area || 0), 0);
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated, grossFloorArea } });
                                                                  }}
                                                                  placeholder="0"
                                                                  className="w-full px-2 py-1 text-center text-[10px] md:text-sm font-bold text-[#1a73e8] bg-white border border-gray-200 rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                                                              />
                                                          </td>
                                                          <td className="p-1 md:p-1.5 border-r border-gray-100">
                                                              <input
                                                                  type="text"
                                                                  value={floor.exclusiveArea ? formatNumberInput(floor.exclusiveArea) : ''}
                                                                  onChange={(e) => {
                                                                      const value = parseNumberInput(e.target.value);
                                                                      const updated = [...newBuilding.spec.floors];
                                                                      updated[actualIndex] = {
                                                                          ...floor,
                                                                          exclusiveArea: value || undefined,
                                                                          exclusiveRatio: value && floor.area ? Math.round((value / floor.area) * 100 * 10) / 10 : undefined
                                                                      };
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated } });
                                                                  }}
                                                                  placeholder="-"
                                                                  className="w-full px-2 py-1 text-center text-[10px] md:text-sm font-bold bg-white border border-gray-200 rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                                                              />
                                                          </td>
                                                          <td className="p-1 md:p-1.5 border-r border-gray-100">
                                                              <input
                                                                  type="text"
                                                                  value={floor.exclusiveRatio ? `${floor.exclusiveRatio}%` : ''}
                                                                  onChange={(e) => {
                                                                      const value = parseFloat(e.target.value.replace('%', ''));
                                                                      const updated = [...newBuilding.spec.floors];
                                                                      updated[actualIndex] = {
                                                                          ...floor,
                                                                          exclusiveRatio: value || undefined,
                                                                          exclusiveArea: value && floor.area ? Math.round(floor.area * (value / 100) * 10) / 10 : undefined
                                                                      };
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated } });
                                                                  }}
                                                                  placeholder="-"
                                                                  className="w-full px-2 py-1 text-center text-[10px] md:text-sm font-bold bg-white border border-gray-200 rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                                                              />
                                                          </td>
                                                          <td className="p-1 md:p-1.5 border-r border-gray-100">
                                                              <input
                                                                  type="text"
                                                                  value={floor.usage || ''}
                                                                  onChange={(e) => {
                                                                      const updated = [...newBuilding.spec.floors];
                                                                      updated[actualIndex] = { ...floor, usage: e.target.value };
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated } });
                                                                  }}
                                                                  placeholder="-"
                                                                  className="w-full px-2 py-1 text-center text-[9px] md:text-xs bg-white border border-gray-200 rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                                                              />
                                                          </td>
                                                          <td className="p-1 md:p-1.5 border-r border-gray-100">
                                                              <input
                                                                  type="text"
                                                                  value={floor.deposit ? formatMoneyInput(floor.deposit) : ''}
                                                                  onChange={(e) => {
                                                                      const value = parseMoneyInput(e.target.value);
                                                                      const updated = [...newBuilding.spec.floors];
                                                                      updated[actualIndex] = { ...floor, deposit: value || undefined };
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated } });
                                                                  }}
                                                                  placeholder="-"
                                                                  className="w-full px-2 py-1 text-right text-[10px] md:text-sm font-bold bg-white border border-gray-200 rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                                                              />
                                                          </td>
                                                          <td className="p-1 md:p-1.5 border-r border-gray-100">
                                                              <input
                                                                  type="text"
                                                                  value={floor.monthlyRent ? formatMoneyInput(floor.monthlyRent) : ''}
                                                                  onChange={(e) => {
                                                                      const value = parseMoneyInput(e.target.value);
                                                                      const updated = [...newBuilding.spec.floors];
                                                                      updated[actualIndex] = { ...floor, monthlyRent: value || undefined };
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated } });
                                                                  }}
                                                                  placeholder="-"
                                                                  className="w-full px-2 py-1 text-right text-[10px] md:text-sm font-bold bg-white border border-gray-200 rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                                                              />
                                                          </td>
                                                          <td className="p-1 md:p-1.5 border-r border-gray-100">
                                                              <input
                                                                  type="text"
                                                                  value={floor.maintenanceFee ? formatMoneyInput(floor.maintenanceFee) : ''}
                                                                  onChange={(e) => {
                                                                      const value = parseMoneyInput(e.target.value);
                                                                      const updated = [...newBuilding.spec.floors];
                                                                      updated[actualIndex] = { ...floor, maintenanceFee: value || undefined };
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated } });
                                                                  }}
                                                                  placeholder="-"
                                                                  className="w-full px-2 py-1 text-right text-[10px] md:text-sm font-bold bg-white border border-gray-200 rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                                                              />
                                                          </td>
                                                          <td className="p-1 md:p-1.5 text-center">
                                                              <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                      const updated = newBuilding.spec.floors.filter(f => f.floorNumber !== floor.floorNumber);
                                                                      const grossFloorArea = updated.reduce((sum, f) => sum + (f.area || 0), 0);
                                                                      setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec, floors: updated, grossFloorArea } });
                                                                  }}
                                                                  className="text-gray-300 hover:text-red-500 transition-colors"
                                                                  title="층 삭제"
                                                              >
                                                                  <X size={14}/>
                                                              </button>
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                      </tbody>
                                  </table>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button
                                      type="button"
                                      onClick={() => {
                                          const floors = newBuilding.spec?.floors || [];
                                          const maxFloor = floors.length > 0 ? Math.max(...floors.map(f => f.floorNumber)) : 0;
                                          const newFloor: FloorDetail = { floorNumber: maxFloor + 1, area: 0, usage: '' };
                                          setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec!, floors: [...floors, newFloor] } });
                                      }}
                                      className="px-2 md:px-3 py-1 md:py-1.5 bg-white border border-dashed border-[#dadce0] text-[#5f6368] rounded-lg text-[9px] md:text-[10px] font-bold hover:border-[#1a73e8] hover:text-[#1a73e8] transition-colors flex items-center gap-1"
                                  >
                                      <Plus size={12}/> 상층 추가
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          const floors = newBuilding.spec?.floors || [];
                                          const minFloor = floors.length > 0 ? Math.min(...floors.map(f => f.floorNumber)) : 0;
                                          const newFloorNum = minFloor > 0 ? -1 : minFloor - 1;
                                          const newFloor: FloorDetail = { floorNumber: newFloorNum, area: 0, usage: '' };
                                          setNewBuilding({ ...newBuilding, spec: { ...newBuilding.spec!, floors: [...floors, newFloor] } });
                                      }}
                                      className="px-2 md:px-3 py-1 md:py-1.5 bg-white border border-dashed border-[#dadce0] text-[#5f6368] rounded-lg text-[9px] md:text-[10px] font-bold hover:border-[#1a73e8] hover:text-[#1a73e8] transition-colors flex items-center gap-1"
                                  >
                                      <Plus size={12}/> 지하층 추가
                                  </button>
                              </div>
                          </>
                      ) : (
                          <div className="py-8 text-center text-gray-400 text-xs font-bold border-2 border-dashed border-gray-200 rounded-xl">
                              지상/지하 층수를 입력한 뒤 "층별정보 생성" 버튼을 눌러주세요
                          </div>
                      )}
                  </div>

                  <div className="flex gap-3 border-t border-gray-100 pt-6">
                      <button onClick={() => { setIsBuildingModalOpen(false); setEditingBuildingId(null); setBuildingTitleList([]); setBuildingFloorList([]); setSelectedBuildingTitle(null); }} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소</button>
                      <button onClick={handleSaveBuilding} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">
                          {editingBuildingId ? '수정 저장' : '저장'}
                      </button>
                  </div>
              </div>
          </Modal>
      )}

      {/* 사진 갤러리 모달 */}
      {isPhotoModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col" onClick={() => setIsPhotoModalOpen(false)}>
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-white/10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold">사진 갤러리</h3>
            <div className="flex items-center gap-2">
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload}/>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm rounded-lg transition-colors"
              >
                <Plus size={16}/> 사진 추가
              </button>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X size={20}/>
              </button>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {selectedProperty.photos && selectedProperty.photos.length > 0 ? (
              <>
                {/* 선택된 사진 (큰 이미지) */}
                <div className="flex-1 flex items-center justify-center p-4 relative">
                  <img
                    src={selectedProperty.photos[currentPhotoIndex]?.url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                  {/* 이전/다음 버튼 */}
                  {selectedProperty.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? (selectedProperty.photos?.length || 1) - 1 : prev - 1)}
                        className="absolute left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <button
                        onClick={() => setCurrentPhotoIndex(prev => prev === (selectedProperty.photos?.length || 1) - 1 ? 0 : prev + 1)}
                        className="absolute right-[200px] w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </>
                  )}
                </div>

                {/* 썸네일 사이드바 */}
                <div className="w-[180px] bg-black/50 border-l border-white/10 overflow-y-auto p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProperty.photos.map((photo, idx) => (
                      <div key={photo.id} className="relative group">
                        <button
                          onClick={() => setCurrentPhotoIndex(idx)}
                          className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${idx === currentPhotoIndex ? 'border-[#1a73e8]' : 'border-transparent hover:border-white/30'}`}
                        >
                          <img src={photo.url} alt="" className="w-full h-full object-cover"/>
                        </button>
                        <button
                          onClick={() => handlePhotoDelete(photo.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* 사진 없을 때 */
              <div className="flex-1 flex flex-col items-center justify-center text-white/60">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className="text-lg mb-2">등록된 사진이 없습니다</p>
                <p className="text-sm mb-4">상단의 "사진 추가" 버튼을 클릭하여 사진을 등록하세요</p>
              </div>
            )}
          </div>

          {/* 하단 정보 */}
          {selectedProperty.photos && selectedProperty.photos.length > 0 && (() => {
            const currentPhoto = selectedProperty.photos[currentPhotoIndex];
            const linkedInfo = [];
            if (currentPhoto?.linkedType === 'LOT' && currentPhoto.linkedLotId) {
              const lot = selectedProperty.lots.find(l => l.id === currentPhoto.linkedLotId);
              if (lot) linkedInfo.push(`토지: ${lot.address.eupMyeonDong} ${lot.address.bonbun}`);
            }
            if (currentPhoto?.linkedType === 'BUILDING' && currentPhoto.linkedBuildingId) {
              const building = selectedProperty.buildings.find(b => b.id === currentPhoto.linkedBuildingId);
              if (building) linkedInfo.push(`건물: ${building.name}`);
            }
            if (currentPhoto?.linkedType === 'FLOOR' && currentPhoto.linkedBuildingId) {
              const building = selectedProperty.buildings.find(b => b.id === currentPhoto.linkedBuildingId);
              if (building) linkedInfo.push(`${building.name} ${currentPhoto.linkedFloor}층`);
            }
            if (currentPhoto?.linkedType === 'UNIT' && currentPhoto.linkedUnitId) {
              const unit = propertyUnits.find(u => u.id === currentPhoto.linkedUnitId);
              if (unit) linkedInfo.push(`호실: ${unit.unitNumber}호`);
            }
            return (
              <div className="p-2 border-t border-white/10 flex items-center justify-between text-white/60 text-xs" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  <span>{currentPhoto?.name || '사진 ' + (currentPhotoIndex + 1)}</span>
                  {linkedInfo.length > 0 && <span className="text-[#1a73e8]">{linkedInfo.join(' · ')}</span>}
                </div>
                <span>{currentPhotoIndex + 1} / {selectedProperty.photos.length}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* 사진 업로드 모달 */}
      {isPhotoUploadModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center" onClick={() => setIsPhotoUploadModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#dadce0]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">사진 정보 입력</h3>
                <button onClick={() => setIsPhotoUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20}/>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{pendingPhotoFiles.length}개 파일 선택됨</p>
            </div>
            <div className="p-6 space-y-4">
              {/* 사진 이름 */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">사진 이름</label>
                <input
                  type="text"
                  value={photoUploadForm.name}
                  onChange={(e) => setPhotoUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 외관, 로비, 옥상 등"
                  className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-sm focus:outline-none focus:border-[#1a73e8]"
                />
              </div>
              {/* 연계 유형 */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">연계 대상</label>
                <select
                  value={photoUploadForm.linkedType}
                  onChange={(e) => setPhotoUploadForm(prev => ({
                    ...prev,
                    linkedType: e.target.value as any,
                    linkedLotId: '',
                    linkedBuildingId: '',
                    linkedFloor: null,
                    linkedUnitId: ''
                  }))}
                  className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-sm focus:outline-none focus:border-[#1a73e8]"
                >
                  <option value="PROPERTY">물건 전체</option>
                  <option value="LOT">토지</option>
                  <option value="BUILDING">건물</option>
                  <option value="FLOOR">층</option>
                  <option value="UNIT">호실</option>
                </select>
              </div>
              {/* 토지 선택 */}
              {photoUploadForm.linkedType === 'LOT' && (
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">토지 선택</label>
                  <select
                    value={photoUploadForm.linkedLotId}
                    onChange={(e) => setPhotoUploadForm(prev => ({ ...prev, linkedLotId: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-sm focus:outline-none focus:border-[#1a73e8]"
                  >
                    <option value="">선택하세요</option>
                    {selectedProperty.lots.map(lot => (
                      <option key={lot.id} value={lot.id}>{lot.address.eupMyeonDong} {lot.address.bonbun}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* 건물 선택 */}
              {(photoUploadForm.linkedType === 'BUILDING' || photoUploadForm.linkedType === 'FLOOR') && (
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">건물 선택</label>
                  <select
                    value={photoUploadForm.linkedBuildingId}
                    onChange={(e) => setPhotoUploadForm(prev => ({ ...prev, linkedBuildingId: e.target.value, linkedFloor: null }))}
                    className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-sm focus:outline-none focus:border-[#1a73e8]"
                  >
                    <option value="">선택하세요</option>
                    {selectedProperty.buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* 층 선택 */}
              {photoUploadForm.linkedType === 'FLOOR' && photoUploadForm.linkedBuildingId && (() => {
                const building = selectedProperty.buildings.find(b => b.id === photoUploadForm.linkedBuildingId);
                if (!building) return null;
                const floors: number[] = [];
                for (let i = building.spec.floorCount.underground; i >= 1; i--) floors.push(-i);
                for (let i = 1; i <= building.spec.floorCount.ground; i++) floors.push(i);
                return (
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">층 선택</label>
                    <select
                      value={photoUploadForm.linkedFloor ?? ''}
                      onChange={(e) => setPhotoUploadForm(prev => ({ ...prev, linkedFloor: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-sm focus:outline-none focus:border-[#1a73e8]"
                    >
                      <option value="">선택하세요</option>
                      {floors.map(f => (
                        <option key={f} value={f}>{f > 0 ? `${f}층` : `지하${Math.abs(f)}층`}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
              {/* 호실 선택 */}
              {photoUploadForm.linkedType === 'UNIT' && (
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">호실 선택</label>
                  <select
                    value={photoUploadForm.linkedUnitId}
                    onChange={(e) => setPhotoUploadForm(prev => ({ ...prev, linkedUnitId: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-sm focus:outline-none focus:border-[#1a73e8]"
                  >
                    <option value="">선택하세요</option>
                    {propertyUnits.map(unit => {
                      const building = selectedProperty.buildings.find(b => b.id === unit.buildingId);
                      return (
                        <option key={unit.id} value={unit.id}>{building?.name} - {unit.unitNumber}호</option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#dadce0] flex gap-3">
              <button
                onClick={() => setIsPhotoUploadModalOpen(false)}
                className="flex-1 py-2.5 border border-[#dadce0] rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handlePhotoUploadConfirm}
                className="flex-1 py-2.5 bg-[#1a73e8] text-white rounded-lg text-sm font-bold hover:bg-[#1557b0]"
              >
                업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토지(필지) 추가/수정 모달 */}
      {isLotModalOpen && selectedProperty && (
          <Modal onClose={() => { setIsLotModalOpen(false); setEditingLotId(null); }} disableOverlayClick={true}>
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <MapPin size={24} className="text-[#1a73e8]"/>
                        {editingLotId ? '토지 수정' : '토지 추가'}
                      </h3>
                      <button onClick={() => { setIsLotModalOpen(false); setEditingLotId(null); }} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  {/* 대표지번 주소체계 안내 */}
                  <div className="bg-[#e8f0fe] p-4 rounded-xl border border-[#c2d7f8]">
                      <p className="text-sm text-[#1a73e8] font-medium">
                        <span className="font-black">대표지번:</span> {selectedProperty.masterAddress.sido} {selectedProperty.masterAddress.sigungu} {selectedProperty.masterAddress.eupMyeonDong}{selectedProperty.masterAddress.li ? ` ${selectedProperty.masterAddress.li}` : ''} {selectedProperty.masterAddress.bonbun}{selectedProperty.masterAddress.bubun ? `-${selectedProperty.masterAddress.bubun}` : ''}
                      </p>
                      <p className="text-xs text-[#5f6368] mt-1">주소 검색으로 토지를 추가하면 지목과 면적이 자동으로 입력됩니다.</p>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><MapPin size={16}/> 지번 주소</p>
                            <AddressSearch
                              placeholder="주소 검색"
                              appSettings={appSettings}
                              onAddressSelect={handleLotAddressSelect}
                            />
                          </div>

                          {/* 검색 결과 표시 */}
                          {lotDisplayAddress && (
                            <div className="bg-white p-4 rounded-xl border border-[#dadce0]">
                              <p className="font-bold text-[#202124]">{lotDisplayAddress}</p>
                              {newLot.pnu && <p className="text-xs text-gray-400 mt-1">PNU: {newLot.pnu}</p>}
                              {isLoadingLandInfo && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-[#1a73e8]">
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>토지정보 조회중...</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 주소 입력 (기본값: 대표지번, 수정 가능) */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              <div>
                                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">시/도 <span className="text-red-500">*</span></label>
                                  <input
                                      className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newLot.address?.sido}
                                      onChange={e => setNewLot({...newLot, address: {...newLot.address!, sido: e.target.value}})}
                                      placeholder="서울특별시"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">시/군/구 <span className="text-red-500">*</span></label>
                                  <input
                                      className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newLot.address?.sigungu}
                                      onChange={e => setNewLot({...newLot, address: {...newLot.address!, sigungu: e.target.value}})}
                                      placeholder="강남구"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">읍/면/동 <span className="text-red-500">*</span></label>
                                  <input
                                      className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newLot.address?.eupMyeonDong}
                                      onChange={e => setNewLot({...newLot, address: {...newLot.address!, eupMyeonDong: e.target.value}})}
                                      placeholder="역삼동"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">리 (선택)</label>
                                  <input
                                      className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newLot.address?.li || ''}
                                      onChange={e => setNewLot({...newLot, address: {...newLot.address!, li: e.target.value}})}
                                      placeholder=""
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">본번 <span className="text-red-500">*</span></label>
                                  <input
                                      className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-black focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newLot.address?.bonbun}
                                      onChange={e => setNewLot({...newLot, address: {...newLot.address!, bonbun: e.target.value}})}
                                      placeholder="100"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">부번</label>
                                  <input
                                      className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-black focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                      value={newLot.address?.bubun || ''}
                                      onChange={e => setNewLot({...newLot, address: {...newLot.address!, bubun: e.target.value}})}
                                      placeholder="1"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* 지목 및 면적 */}
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="text-xs font-black text-[#5f6368] mb-2 block uppercase tracking-widest">지목</label>
                              <select
                                  className="w-full border border-[#dadce0] p-4 rounded-xl text-lg font-black focus:ring-4 focus:ring-[#e8f0fe] outline-none bg-white"
                                  value={newLot.jimok}
                                  onChange={e => setNewLot({...newLot, jimok: e.target.value})}
                              >
                                  <option value="대">대 (대지)</option>
                                  <option value="전">전 (밭)</option>
                                  <option value="답">답 (논)</option>
                                  <option value="임">임 (임야)</option>
                                  <option value="잡">잡 (잡종지)</option>
                                  <option value="도">도 (도로)</option>
                                  <option value="공">공 (공장용지)</option>
                                  <option value="주">주 (주차장)</option>
                                  <option value="창">창 (창고용지)</option>
                                  <option value="학">학 (학교용지)</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-black text-[#5f6368] mb-2 block uppercase tracking-widest">면적 (㎡)</label>
                              <input
                                  type="text"
                                  className="w-full border border-[#dadce0] p-4 rounded-xl text-lg font-black text-[#1a73e8] focus:ring-4 focus:ring-[#e8f0fe] outline-none"
                                  value={formatNumberInput(newLot.area)}
                                  onChange={e => setNewLot({...newLot, area: parseNumberInput(e.target.value)})}
                                  placeholder="0"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3 border-t border-gray-100 pt-8">
                      <button onClick={() => setIsLotModalOpen(false)} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소</button>
                      <button onClick={handleSaveLot} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">저장</button>
                  </div>
              </div>
          </Modal>
      )}

      {/* 도면 뷰어 (층/조닝 탭) */}
      {floorPlanViewerOpen && viewerFloorNumber !== null && selectedProperty && (() => {
        const bldgId = activeTab === 'ZONING' ? (zoningBldgId || selectedProperty.buildings[0]?.id) : (floorTabBldgId || selectedProperty.buildings[0]?.id);
        const bldg = selectedProperty.buildings.find(b => b.id === bldgId);
        if (!bldg) return null;
        const floorSpec = bldg.spec.floors.find(f => f.floorNumber === viewerFloorNumber);
        const floorArea = floorSpec?.area || 0;
        const bldgUnits = units.filter(u => u.buildingId === bldg.id);
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
