
import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Property, Building, FloorPlan, FloorZone, ParkingSpot, VehicleType, ParkingStatus, Stakeholder
} from '../types';
import {
  ParkingSquare, Plus, X, Edit2, Trash2, MapPin, Layers, ChevronDown,
  Car, Zap, Camera, CheckCircle, Wrench, AlertCircle, Upload, Search
} from 'lucide-react';

// ──────────────────────────────────────────────
// 상수 / 라벨
// ──────────────────────────────────────────────

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  SEDAN: '세단', SUV: 'SUV', VAN: '승합차', EV: '전기차', TRUCK: '트럭', OTHER: '기타',
};

const PARKING_STATUS: Record<ParkingStatus, { label: string; color: string; icon: React.FC<any> }> = {
  IDLE:         { label: '이용가능', color: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',    icon: CheckCircle },
  OCCUPIED:     { label: '주차중',   color: 'bg-[#e8f0fe] text-[#1a73e8] border-[#c5d9f8]',    icon: Car },
  UNDER_REPAIR: { label: '수리중',   color: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',    icon: Wrench },
};

const CAR_BRANDS = [
  '현대', '기아', '제네시스', 'KG모빌리티', '쉐보레', '르노코리아',
  'BMW', '벤츠', '아우디', '폭스바겐', '토요타', '혼다', '렉서스',
  '테슬라', '볼보', '포르쉐', '재규어', '랜드로버', 'MINI', '포드',
  '지프', '링컨', '캐딜락', '닛산', '인피니티', '마쯔다', '스바루',
  '피아트', '알파로메오', '마세라티', '페라리', '람보르기니', '벤틀리',
];

const floorLabel = (n: number) => n < 0 ? `B${Math.abs(n)}F` : `${n}F`;

// ──────────────────────────────────────────────
// 모달
// ──────────────────────────────────────────────

const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-xl rounded-xl shadow-2xl bg-white overflow-hidden relative">
        <div className="max-h-[90vh] overflow-y-auto">{children}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-white to-transparent z-10"/>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent z-10"/>
      </div>
    </div>,
    document.body
  );
};

// ──────────────────────────────────────────────
// 평면도 읽기전용 뷰 (SVG 오버레이)
// ──────────────────────────────────────────────

const FloorPlanReadView = ({
  plan, zones, spots, selectedZoneId, onSelectZone,
}: {
  plan: FloorPlan;
  zones: FloorZone[];
  spots: ParkingSpot[];
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ratio = plan.height / Math.max(plan.width, 1);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none bg-gray-100 rounded-lg overflow-hidden border border-[#dadce0]"
      style={{ paddingBottom: `${ratio * 100}%` }}
    >
      {/* 배경 도면 이미지 */}
      <img
        src={plan.fileData}
        alt="floor plan"
        className="absolute inset-0 w-full h-full object-fill"
        draggable={false}
      />
      {/* SVG 조닝 오버레이 */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${plan.width} ${plan.height}`}
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
      >
        {zones.map(zone => {
          const isParking = zone.detail?.usage === 'PARKING';
          const isSelected = zone.id === selectedZoneId;
          const pts = zone.points.map(p => `${p.x * plan.width},${p.y * plan.height}`).join(' ');
          const cx = zone.points.reduce((s, p) => s + p.x, 0) / (zone.points.length || 1) * plan.width;
          const cy = zone.points.reduce((s, p) => s + p.y, 0) / (zone.points.length || 1) * plan.height;
          const zoneSpots = spots.filter(s => s.zoneId === zone.id);
          const fontSize = Math.max(plan.width, plan.height) * 0.018;

          return (
            <g
              key={zone.id}
              style={{ pointerEvents: isParking ? 'all' : 'none', cursor: isParking ? 'pointer' : 'default' }}
              onClick={() => isParking && onSelectZone(isSelected ? null : zone.id)}
            >
              <polygon
                points={pts}
                fill={isParking ? (isSelected ? '#1a73e8' : '#4285f4') : zone.color}
                fillOpacity={isParking ? (isSelected ? 0.55 : 0.30) : 0.12}
                stroke={isParking ? (isSelected ? '#1557b0' : '#1a73e8') : zone.color}
                strokeWidth={isParking ? (isSelected ? plan.width * 0.003 : plan.width * 0.002) : plan.width * 0.001}
                strokeLinejoin="round"
              />
              {isParking && (
                <>
                  <text x={cx} y={cy - fontSize * 0.4} textAnchor="middle" fontSize={fontSize} fontWeight="bold" fill={isSelected ? '#fff' : '#1a73e8'}>
                    {zone.name || 'P'}
                  </text>
                  <text x={cx} y={cy + fontSize * 1.0} textAnchor="middle" fontSize={fontSize * 0.85} fill={isSelected ? '#fff' : '#1557b0'}>
                    {zoneSpots.length}면
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────

interface ParkingManagerProps {
  properties: Property[];
  floorPlans: FloorPlan[];
  floorZones: FloorZone[];
  parkingSpots: ParkingSpot[];
  stakeholders: Stakeholder[];
  onSaveParkingSpot: (spot: ParkingSpot) => void;
  onDeleteParkingSpot: (id: string) => void;
}

const EMPTY_FORM: Partial<ParkingSpot> = {
  spotNumber: '',
  isDesignated: false,
  capacity: 1,
  status: 'IDLE',
  vehicleType: undefined,
  vehicleBrand: '',
  vehicleModel: '',
  designatedPlate: '',
  designatedPhoto: undefined,
  assignmentStartDate: '',
  assignmentEndDate: '',
  notes: '',
};

export const ParkingManager: React.FC<ParkingManagerProps> = ({
  properties, floorPlans, floorZones, parkingSpots, stakeholders, onSaveParkingSpot, onDeleteParkingSpot,
}) => {
  // 인물 이름 헬퍼: ID → 이름, 없으면 fallback 텍스트
  const getPersonName = (id?: string, fallback?: string) => {
    if (id) return stakeholders.find(s => s.id === id)?.name || fallback || id;
    return fallback || '';
  };
  const [selectedPropId, setSelectedPropId] = useState(properties[0]?.id || '');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [spotForm, setSpotForm] = useState<Partial<ParkingSpot>>(EMPTY_FORM);
  const [brandSearch, setBrandSearch] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ─── 선택된 물건/건물/층 계산 ───
  const selectedProperty = properties.find(p => p.id === selectedPropId);
  const buildings: Building[] = selectedProperty?.buildings || [];

  const activeBuildingId = selectedBuildingId || buildings[0]?.id || '';
  const activeBuilding = buildings.find(b => b.id === activeBuildingId);

  // 주차장 조닝이 있는 층만 표시
  const floors: number[] = (() => {
    if (!activeBuilding) return [];
    const { underground, ground } = activeBuilding.spec.floorCount;
    const allFloors: number[] = [];
    for (let i = underground; i >= 1; i--) allFloors.push(-i);
    for (let i = 1; i <= ground; i++) allFloors.push(i);
    return allFloors.filter(f => {
      const plan = floorPlans.find(p => p.buildingId === activeBuildingId && p.floorNumber === f);
      if (!plan) return false;
      return floorZones.some(z => z.floorPlanId === plan.id && z.detail?.usage === 'PARKING');
    });
  })();

  const activeFloor = selectedFloor ?? floors[0] ?? null;

  // 현재 층 도면
  const currentPlan = floorPlans.find(
    p => p.propertyId === selectedPropId && p.buildingId === activeBuildingId && p.floorNumber === activeFloor
  ) ?? null;

  // 현재 도면의 조닝 전체 / PARKING 조닝
  const currentZones = currentPlan ? floorZones.filter(z => z.floorPlanId === currentPlan.id) : [];
  const parkingZones = currentZones.filter(z => z.detail?.usage === 'PARKING');

  // 선택된 조닝의 주차면들
  const selectedZoneSpots = parkingSpots.filter(
    s => s.zoneId === selectedZoneId && s.buildingId === activeBuildingId && s.floorNumber === activeFloor
  );

  // ─── 층별 주차 통계 (요약 테이블용) ───
  const floorStats = floors.map(floor => {
    const plan = floorPlans.find(p => p.propertyId === selectedPropId && p.buildingId === activeBuildingId && p.floorNumber === floor);
    if (!plan) return null;
    const zones = floorZones.filter(z => z.floorPlanId === plan.id && z.detail?.usage === 'PARKING');
    if (zones.length === 0) return null;
    const spots = parkingSpots.filter(s => s.buildingId === activeBuildingId && s.floorNumber === floor);
    const designated = spots.filter(s => s.isDesignated).length;
    const ev = spots.filter(s => s.vehicleType === 'EV').length;
    const evZones = zones.filter(z => parkingSpots.some(s => s.zoneId === z.id && s.vehicleType === 'EV')).length;
    const idle = spots.filter(s => s.status === 'IDLE').length;
    const occupied = spots.filter(s => s.status === 'OCCUPIED').length;
    const repair = spots.filter(s => s.status === 'UNDER_REPAIR').length;
    const totalCap = spots.reduce((sum, s) => sum + (s.capacity || 1), 0);
    return { floor, zoneCount: zones.length, spotCount: spots.length, totalCap, designated, common: spots.length - designated, ev, evZones, idle, occupied, repair };
  }).filter(Boolean) as NonNullable<ReturnType<typeof floorStats[0]>>[];

  // ─── 이벤트 핸들러 ───
  const openAdd = () => {
    if (!selectedZoneId) return;
    setEditingSpotId(null);
    setSpotForm(EMPTY_FORM);
    setBrandSearch('');
    setIsModalOpen(true);
  };

  const openEdit = (spot: ParkingSpot) => {
    setEditingSpotId(spot.id);
    setSpotForm({ ...spot });
    setBrandSearch(spot.vehicleBrand || '');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!spotForm.spotNumber?.trim()) { alert('주차면 번호를 입력하세요.'); return; }
    const now = new Date().toISOString();
    const spot: ParkingSpot = {
      id: editingSpotId || `ps_${Date.now()}`,
      propertyId: selectedPropId,
      buildingId: activeBuildingId,
      floorNumber: activeFloor!,
      zoneId: selectedZoneId!,
      spotNumber: spotForm.spotNumber!,
      isDesignated: spotForm.isDesignated ?? false,
      designatedPlate: spotForm.designatedPlate || undefined,
      designatedPhoto: spotForm.designatedPhoto || undefined,
      vehicleType: spotForm.vehicleType || undefined,
      vehicleBrand: spotForm.vehicleBrand || undefined,
      vehicleModel: spotForm.vehicleModel || undefined,
      capacity: spotForm.capacity ?? 1,
      assigneeId: spotForm.assigneeId || undefined,
      status: spotForm.status ?? 'IDLE',
      assignmentStartDate: spotForm.assignmentStartDate || undefined,
      assignmentEndDate: spotForm.assignmentEndDate || undefined,
      notes: spotForm.notes || undefined,
      createdAt: editingSpotId ? (parkingSpots.find(s => s.id === editingSpotId)?.createdAt ?? now) : now,
      updatedAt: now,
    };
    onSaveParkingSpot(spot);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('이 주차면을 삭제하시겠습니까?')) return;
    onDeleteParkingSpot(id);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSpotForm(prev => ({ ...prev, designatedPhoto: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleBuildingChange = (bid: string) => {
    setSelectedBuildingId(bid);
    setSelectedFloor(null);
    setSelectedZoneId(null);
  };

  const handleFloorChange = (floor: number) => {
    setSelectedFloor(floor);
    setSelectedZoneId(null);
  };

  const handlePropChange = (pid: string) => {
    setSelectedPropId(pid);
    setSelectedBuildingId('');
    setSelectedFloor(null);
    setSelectedZoneId(null);
  };

  // ─── 렌더 ───
  return (
    <div className="flex flex-col lg:flex-row gap-4">

      {/* ── 왼쪽: 물건 목록 ── */}
      <div className="w-full lg:w-64 bg-white rounded-xl border border-[#dadce0] flex-shrink-0 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center gap-2">
          <Layers size={15} className="text-[#1a73e8]"/>
          <h2 className="font-bold text-sm text-[#3c4043]">물건 목록</h2>
        </div>
        <div className="p-2 space-y-1 bg-[#f8f9fa] max-h-[300px] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
          {properties.map(prop => (
            <button key={prop.id} onClick={() => handlePropChange(prop.id)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${selectedPropId === prop.id ? 'bg-white border-[#1a73e8] shadow-sm' : 'bg-white border-transparent hover:bg-[#f1f3f4]'}`}>
              <div className={`font-bold text-xs truncate ${selectedPropId === prop.id ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>{prop.name}</div>
              <div className="flex items-center text-[10px] text-[#5f6368] mt-0.5 gap-0.5">
                <MapPin size={9} className="flex-shrink-0"/>
                <span className="truncate">{prop.roadAddress || (prop.masterAddress ? `${prop.masterAddress.sigungu} ${prop.masterAddress.eupMyeonDong}` : '-')}</span>
              </div>
            </button>
          ))}
          {properties.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-xs">등록된 물건이 없습니다.</div>
          )}
        </div>
      </div>

      {/* ── 오른쪽: 메인 패널 ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {selectedProperty ? (
          <>
            {/* 건물 탭 */}
            {buildings.length > 0 && (
              <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
                <div className="flex border-b border-[#dadce0] bg-[#f8f9fa] px-2 overflow-x-auto">
                  {buildings.map(b => (
                    <button key={b.id} onClick={() => handleBuildingChange(b.id)}
                      className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${activeBuildingId === b.id ? 'border-b-2 border-[#1a73e8] text-[#1a73e8] bg-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>
                      {b.name}
                    </button>
                  ))}
                </div>

                {/* 층 탭 */}
                {floors.length > 0 && (
                  <div className="flex border-b border-[#f1f3f4] px-2 overflow-x-auto bg-white">
                    {floors.map(f => (
                      <button key={f} onClick={() => handleFloorChange(f)}
                        className={`px-3 py-2 text-[11px] font-bold whitespace-nowrap transition-all ${activeFloor === f ? 'border-b-2 border-[#1a73e8] text-[#1a73e8]' : 'text-[#5f6368] hover:text-[#202124]'}`}>
                        {floorLabel(f)}
                      </button>
                    ))}
                  </div>
                )}
                {floors.length === 0 && (
                  <div className="px-4 py-3 text-xs text-[#5f6368]">이 건물에 주차장 조닝이 등록된 층이 없습니다.</div>
                )}
              </div>
            )}

            {/* 도면 + 주차면 패널 */}
            <div className="flex flex-col md:flex-row gap-3">

              {/* 도면 뷰 */}
              <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
                <div className="p-3 border-b border-[#f1f3f4] flex items-center gap-2">
                  <ParkingSquare size={15} className="text-[#1a73e8]"/>
                  <span className="font-bold text-sm text-[#3c4043]">
                    {activeBuilding?.name} {activeFloor !== null && floorLabel(activeFloor)} 평면도
                  </span>
                  {selectedZoneId && (
                    <button onClick={() => setSelectedZoneId(null)} className="ml-auto text-[10px] text-[#5f6368] hover:text-[#202124] flex items-center gap-1">
                      <X size={11}/> 선택 해제
                    </button>
                  )}
                </div>
                <div className="p-3">
                  {currentPlan ? (
                    <>
                      <FloorPlanReadView
                        plan={currentPlan}
                        zones={currentZones}
                        spots={parkingSpots}
                        selectedZoneId={selectedZoneId}
                        onSelectZone={setSelectedZoneId}
                      />
                      {parkingZones.length === 0 && (
                        <p className="mt-2 text-xs text-center text-[#5f6368]">이 층에 주차장 조닝이 없습니다. 자산관리에서 조닝의 용도를 <b>주차장</b>으로 설정하세요.</p>
                      )}
                      {parkingZones.length > 0 && !selectedZoneId && (
                        <p className="mt-2 text-xs text-center text-[#1a73e8] font-bold">파란 구역을 클릭하면 주차면을 관리할 수 있습니다.</p>
                      )}
                    </>
                  ) : (
                    <div className="py-16 text-center text-gray-400">
                      <ParkingSquare size={32} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-sm font-bold">이 층에 등록된 도면이 없습니다.</p>
                      <p className="text-xs mt-1">자산관리에서 평면도를 먼저 등록하세요.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 주차면 목록 패널 */}
              <div className="w-full md:w-72 flex-shrink-0 bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b border-[#f1f3f4] flex items-center gap-2">
                  <Car size={15} className="text-[#1a73e8]"/>
                  <span className="font-bold text-sm text-[#3c4043]">
                    {selectedZoneId ? (currentZones.find(z => z.id === selectedZoneId)?.name || '주차구역') + ' 주차면' : '주차면 목록'}
                  </span>
                  {selectedZoneId && (
                    <button onClick={openAdd} className="ml-auto bg-[#1a73e8] text-white px-2 py-1 rounded text-[10px] font-black flex items-center gap-1 hover:bg-[#1557b0]">
                      <Plus size={11}/> 추가
                    </button>
                  )}
                </div>

                {/* 조닝 세부정보 요약 (싱크) */}
                {selectedZoneId && (() => {
                  const zone = currentZones.find(z => z.id === selectedZoneId);
                  const d = zone?.detail;
                  if (!d) return null;
                  const assigneeName = getPersonName(d.parkingAssigneeId, d.parkingAssignee);
                  return (
                    <div className="mx-2 mb-1 bg-[#e8f0fe] rounded-lg px-3 py-2 text-[10px] border border-[#c5d9f8]">
                      <p className="font-black text-[#1a73e8] mb-1 text-[9px] uppercase tracking-widest">조닝 세부정보 (자산관리 연동)</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[#3c4043]">
                        {d.parkingSpaces != null && <span>총 면수: <b>{d.parkingSpaces}</b></span>}
                        {assigneeName && <span>배정대상: <b>{assigneeName}</b></span>}
                        {(d.assignedVehicles?.length ?? 0) > 0 && <span>지정차량: <b>{d.assignedVehicles!.join(', ')}</b></span>}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[400px] md:max-h-none">
                  {!selectedZoneId ? (
                    <div className="py-12 text-center text-gray-400">
                      <ParkingSquare size={24} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-xs">도면에서 주차 구역을 선택하세요</p>
                    </div>
                  ) : selectedZoneSpots.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <Car size={24} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-xs">등록된 주차면이 없습니다.</p>
                    </div>
                  ) : (
                    selectedZoneSpots
                      .sort((a, b) => a.spotNumber.localeCompare(b.spotNumber))
                      .map(spot => {
                        const st = PARKING_STATUS[spot.status];
                        const StIcon = st.icon;
                        return (
                          <div key={spot.id} className="bg-[#f8f9fa] rounded-lg border border-[#dadce0] p-2 group hover:border-[#1a73e8] transition-all">
                            <div className="flex items-start gap-2">
                              {/* 차량 사진 또는 차량 아이콘 */}
                              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {spot.designatedPhoto
                                  ? <img src={spot.designatedPhoto} alt="차량" className="w-full h-full object-cover"/>
                                  : <Car size={18} className="text-gray-300"/>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-black text-xs text-[#202124]">{spot.spotNumber}</span>
                                  {spot.isDesignated && (
                                    <span className="text-[8px] font-black bg-[#1a73e8] text-white px-1 py-0.5 rounded">지정</span>
                                  )}
                                  {spot.vehicleType === 'EV' && (
                                    <Zap size={10} className="text-green-600"/>
                                  )}
                                </div>
                                {spot.assigneeId && (
                                  <p className="text-[10px] text-[#1a73e8] font-bold mt-0.5">{getPersonName(spot.assigneeId)}</p>
                                )}
                              {spot.designatedPlate && (
                                  <p className="text-[10px] text-[#5f6368] font-bold mt-0.5">{spot.designatedPlate}</p>
                                )}
                                {(spot.vehicleBrand || spot.vehicleModel) && (
                                  <p className="text-[10px] text-[#5f6368] truncate">{[spot.vehicleBrand, spot.vehicleModel].filter(Boolean).join(' ')}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${st.color}`}>
                                  <StIcon size={8}/>{st.label}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEdit(spot)} className="p-1 hover:bg-gray-200 rounded text-[#5f6368]"><Edit2 size={11}/></button>
                                  <button onClick={() => handleDelete(spot.id)} className="p-1 hover:bg-red-100 rounded text-red-400"><Trash2 size={11}/></button>
                                </div>
                              </div>
                            </div>
                            {spot.capacity > 1 && (
                              <p className="text-[9px] text-gray-400 mt-1">주차대수: {spot.capacity}대</p>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* ── 층별 주차 통계 테이블 ── */}
            {floorStats.length > 0 && (
              <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
                <div className="p-3 border-b border-[#f1f3f4] flex items-center gap-2">
                  <ParkingSquare size={15} className="text-[#1a73e8]"/>
                  <span className="font-bold text-sm text-[#3c4043]">{activeBuilding?.name} 층별 주차 현황</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] md:text-xs min-w-[580px]">
                    <thead className="bg-[#f8f9fa]">
                      <tr className="text-[9px] md:text-[10px] text-[#5f6368] uppercase font-bold">
                        <th className="p-2 md:p-3 text-center whitespace-nowrap">층</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap">구역수</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap">총 주차면</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap">총 주차대수</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap">지정주차</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap">공용주차</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap">전기차</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap text-[#137333]">이용가능</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap text-[#1a73e8]">주차중</th>
                        <th className="p-2 md:p-3 text-center whitespace-nowrap text-[#b06000]">수리중</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floorStats.map(row => (
                        <tr key={row.floor}
                          onClick={() => handleFloorChange(row.floor)}
                          className={`border-t border-gray-100 text-center cursor-pointer transition-colors ${activeFloor === row.floor ? 'bg-[#e8f0fe]' : 'hover:bg-[#f8f9fa]'}`}>
                          <td className="p-2 md:p-3 font-black text-[#202124]">{floorLabel(row.floor)}</td>
                          <td className="p-2 md:p-3">{row.zoneCount}</td>
                          <td className="p-2 md:p-3 font-bold">{row.spotCount}</td>
                          <td className="p-2 md:p-3 font-bold">{row.totalCap}</td>
                          <td className="p-2 md:p-3">
                            {row.designated > 0 ? <span className="bg-[#e8f0fe] text-[#1a73e8] px-1.5 py-0.5 rounded text-[9px] font-black">{row.designated}</span> : '-'}
                          </td>
                          <td className="p-2 md:p-3">{row.common}</td>
                          <td className="p-2 md:p-3">
                            {row.ev > 0 ? <span className="flex items-center justify-center gap-0.5 text-green-600 font-bold"><Zap size={10}/>{row.ev}</span> : '-'}
                          </td>
                          <td className="p-2 md:p-3 text-[#137333] font-bold">{row.idle}</td>
                          <td className="p-2 md:p-3 text-[#1a73e8] font-bold">{row.occupied}</td>
                          <td className="p-2 md:p-3 text-[#b06000] font-bold">{row.repair || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#e8f0fe] border-t-2 border-[#1a73e8]">
                      <tr className="text-center font-black text-[#1a73e8] text-[10px] md:text-xs">
                        <td className="p-2 md:p-3">합계</td>
                        <td className="p-2 md:p-3">{floorStats.reduce((s, r) => s + r.zoneCount, 0)}</td>
                        <td className="p-2 md:p-3">{floorStats.reduce((s, r) => s + r.spotCount, 0)}</td>
                        <td className="p-2 md:p-3">{floorStats.reduce((s, r) => s + r.totalCap, 0)}</td>
                        <td className="p-2 md:p-3">{floorStats.reduce((s, r) => s + r.designated, 0)}</td>
                        <td className="p-2 md:p-3">{floorStats.reduce((s, r) => s + r.common, 0)}</td>
                        <td className="p-2 md:p-3">{floorStats.reduce((s, r) => s + r.ev, 0)}</td>
                        <td className="p-2 md:p-3 text-[#137333]">{floorStats.reduce((s, r) => s + r.idle, 0)}</td>
                        <td className="p-2 md:p-3">{floorStats.reduce((s, r) => s + r.occupied, 0)}</td>
                        <td className="p-2 md:p-3 text-[#b06000]">{floorStats.reduce((s, r) => s + r.repair, 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {floorStats.length === 0 && (
              <div className="bg-white rounded-xl border border-[#dadce0] py-12 text-center text-gray-400 shadow-sm">
                <ParkingSquare size={32} className="mx-auto mb-2 opacity-20"/>
                <p className="text-sm font-bold">주차 구역이 없습니다.</p>
                <p className="text-xs mt-1">자산관리 → 평면도 뷰어에서 조닝을 등록하고 용도를 <b>주차장</b>으로 설정하세요.</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-[#dadce0] py-32 text-center text-gray-400 shadow-sm">
            <Layers size={32} className="mx-auto mb-2 opacity-20"/>
            <p className="text-sm font-bold">물건을 선택하세요</p>
          </div>
        )}
      </div>

      {/* ── 주차면 등록/수정 모달 ── */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
              <h3 className="font-black text-base text-[#3c4043] flex items-center gap-2">
                <Car size={18} className="text-[#1a73e8]"/>
                {editingSpotId ? '주차면 수정' : '주차면 등록'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-[#5f6368]"><X size={20}/></button>
            </div>

            <div className="space-y-4">
              {/* 기본 정보 행 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">주차면 번호 <span className="text-red-500">*</span></label>
                  <input className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold" placeholder="예: A-001" value={spotForm.spotNumber || ''} onChange={e => setSpotForm(p => ({ ...p, spotNumber: e.target.value }))}/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">주차대수</label>
                  <input type="number" min={1} className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold" value={spotForm.capacity ?? 1} onChange={e => setSpotForm(p => ({ ...p, capacity: Number(e.target.value) }))}/>
                </div>
              </div>

              {/* 차량유형 + 주차상태 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">차량유형</label>
                  <select className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold bg-white" value={spotForm.vehicleType || ''} onChange={e => setSpotForm(p => ({ ...p, vehicleType: e.target.value as VehicleType || undefined }))}>
                    <option value="">미지정</option>
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">주차상태</label>
                  <select className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold bg-white" value={spotForm.status || 'IDLE'} onChange={e => setSpotForm(p => ({ ...p, status: e.target.value as ParkingStatus }))}>
                    {Object.entries(PARKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              {/* 배정대상 (Stakeholder 연동) */}
              <div>
                <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">배정대상 (인물/업체)</label>
                <select
                  className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold bg-white"
                  value={spotForm.assigneeId || ''}
                  onChange={e => setSpotForm(p => ({ ...p, assigneeId: e.target.value || undefined }))}
                >
                  <option value="">-- 미지정 --</option>
                  {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* 차종 검색 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">차종 브랜드</label>
                  <div className="relative">
                    <input
                      className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold pr-7"
                      placeholder="브랜드 검색..."
                      list="car-brands-list"
                      value={spotForm.vehicleBrand || ''}
                      onChange={e => setSpotForm(p => ({ ...p, vehicleBrand: e.target.value }))}
                    />
                    <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                    <datalist id="car-brands-list">
                      {CAR_BRANDS.map(b => <option key={b} value={b}/>)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">모델명</label>
                  <input className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold" placeholder="예: 아반떼, 팰리세이드" value={spotForm.vehicleModel || ''} onChange={e => setSpotForm(p => ({ ...p, vehicleModel: e.target.value }))}/>
                </div>
              </div>

              {/* 지정주차 토글 */}
              <div className="bg-[#f8f9fa] rounded-lg p-3 border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${spotForm.isDesignated ? 'bg-[#1a73e8]' : 'bg-gray-300'}`}
                    onClick={() => setSpotForm(p => ({ ...p, isDesignated: !p.isDesignated }))}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${spotForm.isDesignated ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                  </div>
                  <span className="text-sm font-black text-[#202124]">지정주차</span>
                </label>

                {spotForm.isDesignated && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">지정 차량번호</label>
                      <input className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold" placeholder="예: 12가 3456" value={spotForm.designatedPlate || ''} onChange={e => setSpotForm(p => ({ ...p, designatedPlate: e.target.value }))}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">차량 사진</label>
                      <div className="flex items-center gap-2">
                        {spotForm.designatedPhoto ? (
                          <div className="relative w-20 h-14 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                            <img src={spotForm.designatedPhoto} alt="차량" className="w-full h-full object-cover"/>
                            <button onClick={() => setSpotForm(p => ({ ...p, designatedPhoto: undefined }))} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"><X size={10}/></button>
                          </div>
                        ) : (
                          <button onClick={() => photoInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-[11px] font-bold text-[#5f6368] hover:border-[#1a73e8] hover:text-[#1a73e8] transition-colors">
                            <Upload size={12}/> 사진 업로드
                          </button>
                        )}
                        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">배정 시작일</label>
                        <input type="date" className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold" value={spotForm.assignmentStartDate || ''} onChange={e => setSpotForm(p => ({ ...p, assignmentStartDate: e.target.value }))}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">배정 유효기간</label>
                        <input type="date" className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold" value={spotForm.assignmentEndDate || ''} onChange={e => setSpotForm(p => ({ ...p, assignmentEndDate: e.target.value }))}/>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 메모 */}
              <div>
                <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest block mb-1.5">메모</label>
                <textarea className="w-full border border-[#dadce0] p-2.5 rounded-lg text-sm font-bold resize-none" rows={2} placeholder="특이사항, 장애물 등" value={spotForm.notes || ''} onChange={e => setSpotForm(p => ({ ...p, notes: e.target.value }))}/>
              </div>

              {/* 저장/취소 */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-[#dadce0] rounded-lg text-sm font-black text-[#5f6368] hover:bg-gray-50">취소</button>
                <button onClick={handleSave} className="flex-1 py-2.5 bg-[#1a73e8] text-white rounded-lg text-sm font-black hover:bg-[#1557b0] shadow transition-all">저장</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
