
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Property, Unit, Building, JibunAddress, Facility, BuildingSpec, Lot } from '../types';
import { MapPin, Plus, X, Building as BuildingIcon, Edit2, Layers, Home, Info, Trash2, Ruler, Search } from 'lucide-react';
import { AddressSearch } from './AddressSearch';
import { AppSettings } from '../App';

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl shadow-2xl bg-white animate-in zoom-in-95 duration-200">
        {children}
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
}

export const PropertyManager: React.FC<PropertyManagerProps> = ({
  properties, units, onAddProperty, onUpdateProperty, onAddUnit, onUpdateUnit, formatArea, formatNumberInput, parseNumberInput, formatMoneyInput, parseMoneyInput, moneyLabel, appSettings
}) => {
  const [selectedPropId, setSelectedPropId] = useState<string>(properties[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LAND' | 'BUILDING' | 'UNIT'>('OVERVIEW');
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);

  const [newProp, setNewProp] = useState<Partial<Property>>({
    type: 'LAND_AND_BUILDING', name: '', masterAddress: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' }, roadAddress: ''
  });
  const [displayAddress, setDisplayAddress] = useState('');

  const [newUnit, setNewUnit] = useState<Partial<Unit>>({ unitNumber: '', floor: 1, area: 0, usage: '업무시설', status: 'VACANT', buildingId: '', rentType: '월세', deposit: 0, monthlyRent: 0 });

  const [newBuilding, setNewBuilding] = useState<Partial<Building>>({
      name: '', spec: { buildingArea: 0, grossFloorArea: 0, floorCount: { underground: 0, ground: 1 }, floors: [], completionDate: '', mainUsage: '업무시설', parkingCapacity: 0, elevatorCount: 0 }
  });

  // 토지(필지) 추가 관련 상태
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [newLot, setNewLot] = useState<Partial<Lot>>({
    address: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' },
    jimok: '대',
    area: 0
  });

  const selectedProperty = properties.find(p => p.id === selectedPropId);
  const propertyUnits = units.filter(u => u.propertyId === selectedPropId);

  const handleSaveProperty = () => {
    if (!newProp.name || !newProp.masterAddress?.sido || !newProp.masterAddress?.bonbun) return;

    if (selectedProperty && selectedPropId === newProp.id) {
        // 기존 물건 수정
        onUpdateProperty({ ...selectedProperty, ...newProp as Property });
    } else {
        // 신규 물건 생성 시 대표지번을 첫 번째 토지로 자동 추가
        const firstLot: Lot = {
          id: `lot${Date.now()}`,
          address: { ...newProp.masterAddress! },
          jimok: '대', // 기본값: 대지
          area: 0 // 면적은 나중에 입력
        };
        onAddProperty({
          id: `p${Date.now()}`,
          lots: [firstLot],
          buildings: [],
          totalLandArea: 0,
          ...newProp as Property
        });
    }
    setIsPropertyModalOpen(false);
  };

  const handleSaveUnit = () => {
    if (!newUnit.unitNumber || !selectedProperty || !newUnit.buildingId) return;
    onAddUnit({ id: `u${Date.now()}`, propertyId: selectedProperty.id, ...newUnit as Unit });
    setIsUnitModalOpen(false);
  };

  const handleSaveBuilding = () => {
    if (!newBuilding.name || !selectedProperty) return;
    const bldg: Building = {
      id: `b${Date.now()}`,
      propertyId: selectedProperty.id,
      name: newBuilding.name,
      spec: newBuilding.spec as BuildingSpec
    };
    onUpdateProperty({ ...selectedProperty, buildings: [...selectedProperty.buildings, bldg] });
    setIsBuildingModalOpen(false);
  };

  // 토지(필지) 저장
  const handleSaveLot = () => {
    if (!selectedProperty) return;
    // 필수 필드 검증: 시/도, 시/군/구, 읍/면/동, 본번
    if (!newLot.address?.sido || !newLot.address?.sigungu || !newLot.address?.eupMyeonDong || !newLot.address?.bonbun) {
      alert('시/도, 시/군/구, 읍/면/동, 본번은 필수 입력 항목입니다.');
      return;
    }
    const lot: Lot = {
      id: `lot${Date.now()}`,
      address: newLot.address as JibunAddress,
      jimok: newLot.jimok || '대',
      area: newLot.area || 0
    };
    const updatedLots = [...selectedProperty.lots, lot];
    const totalArea = updatedLots.reduce((sum, l) => sum + (l.area || 0), 0);
    onUpdateProperty({ ...selectedProperty, lots: updatedLots, totalLandArea: totalArea });
    setIsLotModalOpen(false);
  };

  // 토지 추가 모달 열기 (대표지번 주소체계에 맞춤)
  const openLotModal = () => {
    if (!selectedProperty) return;
    const masterAddr = selectedProperty.masterAddress;
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
      area: 0
    });
    setIsLotModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-80 bg-white rounded-xl border border-[#dadce0] flex-shrink-0 flex flex-col h-[calc(100vh-140px)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#dadce0] flex justify-between items-center bg-[#f8f9fa]">
          <h2 className="font-bold text-[#3c4043] flex items-center gap-2"><Layers size={18} className="text-[#1a73e8]"/> 물건 목록</h2>
          <button onClick={() => { setNewProp({ type: 'LAND_AND_BUILDING', name: '', masterAddress: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' }, roadAddress: '' }); setDisplayAddress(''); setIsPropertyModalOpen(true); }} className="p-2 text-[#1a73e8] hover:bg-[#e8f0fe] rounded-full transition-colors"><Plus size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f8f9fa]">
          {properties.map(prop => (
            <button key={prop.id} onClick={() => { setSelectedPropId(prop.id); setActiveTab('OVERVIEW'); }} className={`w-full text-left p-4 rounded-xl transition-all border ${selectedPropId === prop.id ? 'bg-white border-[#1a73e8] shadow-md ring-2 ring-[#e8f0fe]' : 'bg-white hover:bg-[#f1f3f4] border-[#dadce0]'}`}>
              <h3 className={`font-bold text-sm truncate ${selectedPropId === prop.id ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>{prop.name}</h3>
              <div className="flex items-center text-[10px] text-[#5f6368] mt-1.5"><MapPin size={10} className="mr-1" />{getFullAddress(prop.masterAddress)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {selectedProperty ? (
          <div className="flex flex-col h-full bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
             <div className="p-8 border-b border-[#f1f3f4] bg-white flex justify-between items-start">
                 <div>
                    <h1 className="text-2xl font-bold text-[#202124] mb-2">{selectedProperty.name}</h1>
                    <p className="text-[#5f6368] flex items-center text-sm font-medium"><MapPin size={16} className="mr-1 text-[#1a73e8]" />{getFullAddress(selectedProperty.masterAddress)}</p>
                 </div>
                 <button onClick={() => { setNewProp({...selectedProperty}); setDisplayAddress(getFullAddress(selectedProperty.masterAddress)); setIsPropertyModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 border border-[#dadce0] rounded-lg text-xs font-bold text-[#5f6368] hover:bg-[#f8f9fa] transition-colors"><Edit2 size={14}/> 기본정보 수정</button>
             </div>

             <div className="flex border-b border-[#dadce0] bg-[#f8f9fa] px-4">
               {[
                 { id: 'OVERVIEW', label: '개요', icon: <Home size={14}/> },
                 { id: 'LAND', label: '토지', icon: <MapPin size={14}/> },
                 { id: 'BUILDING', label: '건물', icon: <BuildingIcon size={14}/> },
                 { id: 'UNIT', label: '호실', icon: <Layers size={14}/> }
               ].map((tab) => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === tab.id ? 'border-b-2 border-[#1a73e8] text-[#1a73e8] bg-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>
                   {tab.icon} {tab.label}
                 </button>
               ))}
             </div>

             <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                {activeTab === 'OVERVIEW' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                         <h3 className="font-bold text-[#3c4043] flex items-center gap-2 border-b border-[#dadce0] pb-4 mb-4"><Info size={18} className="text-[#1a73e8]"/> 물건 개요</h3>
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                               <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">대지면적</p>
                               <p className="font-bold text-[#202124] text-lg">{formatArea(selectedProperty.totalLandArea)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">자산 유형</p>
                               <p className="font-bold text-[#202124] text-lg">{selectedProperty.type === 'LAND_AND_BUILDING' ? '토지 및 건물' : selectedProperty.type === 'AGGREGATE' ? '집합건물' : '토지 전용'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">총 필지 수</p>
                               <p className="font-bold text-[#202124] text-lg">{selectedProperty.lots.length} 필지</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">등록 호실 수</p>
                               <p className="font-bold text-[#202124] text-lg">{propertyUnits.length} 세대</p>
                            </div>
                         </div>
                      </div>
                      <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                         <h3 className="font-bold text-[#3c4043] flex items-center gap-2 border-b border-[#dadce0] pb-4 mb-4"><BuildingIcon size={18} className="text-[#1a73e8]"/> 건물 현황</h3>
                         <div className="space-y-3">
                            {selectedProperty.buildings.map(b => (
                               <div key={b.id} className="flex justify-between items-center text-sm p-3 bg-white border border-[#dadce0] rounded-xl hover:shadow-sm transition-shadow">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 bg-indigo-50 text-[#1a73e8] rounded flex items-center justify-center font-bold text-xs">A</div>
                                     <span className="font-bold text-gray-700">{b.name}</span>
                                  </div>
                                  <span className="text-gray-500 text-xs font-medium">연면적 {formatArea(b.spec.grossFloorArea)}</span>
                               </div>
                            ))}
                            {selectedProperty.buildings.length === 0 && <p className="text-gray-400 text-xs text-center py-10 italic">등록된 건물 데이터가 없습니다.</p>}
                         </div>
                      </div>
                   </div>
                )}
                {activeTab === 'LAND' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-[#3c4043] flex items-center gap-2"><MapPin size={18} className="text-[#1a73e8]"/> 토지 목록</h3>
                            <button onClick={openLotModal} className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-[#1557b0] transition-all"><Plus size={16}/> 토지 추가</button>
                        </div>
                        <div className="border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#f8f9fa] text-[#5f6368] font-bold border-b border-[#dadce0] text-[11px] uppercase tracking-widest">
                                    <tr>
                                        <th className="p-5">지번 주소 (지번/본번/부번)</th>
                                        <th className="p-5">지목(Jimok)</th>
                                        <th className="p-5 text-right">필지 면적</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f3f4]">
                                    {selectedProperty.lots.map(lot => (
                                        <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-5 font-bold text-gray-800">{getFullAddress(lot.address)}</td>
                                            <td className="p-5"><span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-black text-gray-600">{lot.jimok}</span></td>
                                            <td className="p-5 text-right font-black text-[#1a73e8]">{formatArea(lot.area)}</td>
                                        </tr>
                                    ))}
                                    {selectedProperty.lots.length === 0 && <tr><td colSpan={3} className="p-20 text-center text-gray-400 italic">등록된 필지 데이터가 존재하지 않습니다.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'BUILDING' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-[#3c4043] flex items-center gap-2"><BuildingIcon size={18} className="text-[#1a73e8]"/> 건물 목록</h3>
                            <button onClick={() => setIsBuildingModalOpen(true)} className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-[#1557b0] transition-all"><Plus size={16}/> 건물 추가</button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {selectedProperty.buildings.map(b => (
                                <div key={b.id} className="p-8 bg-white border border-[#dadce0] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-indigo-50 text-[#1a73e8] rounded-2xl border border-indigo-100"><BuildingIcon size={32}/></div>
                                        <div>
                                            <h4 className="font-black text-xl text-gray-900">{b.name}</h4>
                                            <p className="text-sm text-[#5f6368] mt-1 font-medium">{b.spec.mainUsage} | 지상 {b.spec.floorCount.ground}층 · 지하 {b.spec.floorCount.underground}층</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-6 md:mt-0 text-right">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">건축 면적</p>
                                            <p className="font-black text-gray-800 text-lg">{formatArea(b.spec.buildingArea)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">연면적 합계</p>
                                            <p className="font-black text-[#1a73e8] text-lg">{formatArea(b.spec.grossFloorArea)}</p>
                                        </div>
                                        <div className="hidden lg:block">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">주차/E.V</p>
                                            <p className="font-black text-gray-800 text-lg">{b.spec.parkingCapacity}대 / {b.spec.elevatorCount}대</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {selectedProperty.buildings.length === 0 && <div className="p-24 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold">건물 데이터가 비어있습니다. 건물을 추가해 주세요.</div>}
                        </div>
                    </div>
                )}
                {activeTab === 'UNIT' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-[#3c4043] flex items-center gap-2"><Layers size={18} className="text-[#1a73e8]"/> 호실 목록</h3>
                      <button
                        onClick={() => {
                          if (selectedProperty.buildings.length === 0) {
                            alert('호실을 추가하려면 먼저 건물을 등록해야 합니다.');
                            return;
                          }
                          setNewUnit({buildingId: selectedProperty.buildings[0]?.id || '', unitNumber: '', floor: 1, area: 0, usage: '업무시설', status: 'VACANT', rentType: '월세', deposit: 0, monthlyRent: 0});
                          setIsUnitModalOpen(true);
                        }}
                        className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-[#1557b0] transition-all"
                      >
                        <Plus size={16}/> 호실 추가
                      </button>
                    </div>

                    {/* 건물이 없는 경우 안내 */}
                    {selectedProperty.buildings.length === 0 && (
                      <div className="bg-[#fef7e0] border border-[#feefc3] p-4 rounded-xl text-sm text-[#b06000] font-medium">
                        호실을 추가하려면 먼저 <strong>건물 탭</strong>에서 건물을 등록해야 합니다.
                      </div>
                    )}

                    {/* 건물별 호실 그룹화 */}
                    {selectedProperty.buildings.map(building => {
                      const buildingUnits = propertyUnits.filter(u => u.buildingId === building.id);
                      return (
                        <div key={building.id} className="space-y-4">
                          <div className="flex items-center gap-3 border-b border-[#dadce0] pb-3">
                            <div className="p-2 bg-indigo-50 text-[#1a73e8] rounded-lg"><BuildingIcon size={18}/></div>
                            <div>
                              <h4 className="font-black text-[#202124]">{building.name}</h4>
                              <p className="text-[10px] text-[#5f6368]">{building.spec.mainUsage} · 등록 호실 {buildingUnits.length}개</p>
                            </div>
                            <button
                              onClick={() => {
                                setNewUnit({buildingId: building.id, unitNumber: '', floor: 1, area: 0, usage: building.spec.mainUsage || '업무시설', status: 'VACANT', rentType: '월세', deposit: 0, monthlyRent: 0});
                                setIsUnitModalOpen(true);
                              }}
                              className="ml-auto text-xs font-bold text-[#1a73e8] hover:bg-[#e8f0fe] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Plus size={14}/> 이 건물에 호실 추가
                            </button>
                          </div>

                          {buildingUnits.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                              {buildingUnits.map(unit => (
                                <div key={unit.id} className="p-4 bg-white border border-[#dadce0] rounded-xl hover:border-[#1a73e8] hover:shadow-lg transition-all group">
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="font-black text-lg text-[#202124] group-hover:text-[#1a73e8] transition-colors">{unit.unitNumber}호</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${unit.status === 'OCCUPIED' ? 'bg-[#e6f4ea] text-[#137333]' : unit.status === 'UNDER_REPAIR' ? 'bg-orange-50 text-orange-600' : 'bg-[#fef7e0] text-[#b06000]'}`}>
                                      {unit.status === 'OCCUPIED' ? '임대중' : unit.status === 'UNDER_REPAIR' ? '보수중' : '공실'}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 text-[10px] text-[#5f6368] font-medium">
                                    <p className="flex justify-between"><span>층수</span><span className="text-gray-800 font-bold">{unit.floor > 0 ? `${unit.floor}F` : `B${Math.abs(unit.floor)}F`}</span></p>
                                    <p className="flex justify-between"><span>면적</span><span className="text-gray-800 font-bold">{formatArea(unit.area)}</span></p>
                                    <p className="flex justify-between"><span>용도</span><span className="text-gray-800">{unit.usage}</span></p>
                                    {unit.status === 'OCCUPIED' && unit.monthlyRent !== undefined && unit.monthlyRent > 0 && (
                                      <>
                                        <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                                          <p className="flex justify-between"><span>보증금</span><span className="text-[#1a73e8] font-bold">{formatMoneyInput(unit.deposit)}</span></p>
                                          <p className="flex justify-between"><span>월세</span><span className="text-[#1a73e8] font-bold">{formatMoneyInput(unit.monthlyRent)}</span></p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-sm">
                              이 건물에 등록된 호실이 없습니다.
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* 건물 미지정 호실 (orphaned) */}
                    {propertyUnits.filter(u => !selectedProperty.buildings.find(b => b.id === u.buildingId)).length > 0 && (
                      <div className="space-y-4 mt-8">
                        <div className="flex items-center gap-3 border-b border-red-200 pb-3">
                          <div className="p-2 bg-red-50 text-red-500 rounded-lg"><Layers size={18}/></div>
                          <div>
                            <h4 className="font-black text-red-600">건물 미지정 호실</h4>
                            <p className="text-[10px] text-red-400">건물이 삭제되었거나 연결이 끊어진 호실입니다.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {propertyUnits.filter(u => !selectedProperty.buildings.find(b => b.id === u.buildingId)).map(unit => (
                            <div key={unit.id} className="p-4 bg-red-50 border border-red-200 rounded-xl">
                              <span className="font-black text-lg text-red-600">{unit.unitNumber}호</span>
                              <p className="text-[10px] text-red-400 mt-1">건물 연결 필요</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {propertyUnits.length === 0 && selectedProperty.buildings.length > 0 && (
                      <div className="py-16 text-center text-gray-400 border-2 border-dashed rounded-2xl font-bold bg-gray-50">
                        등록된 호실이 없습니다. 위 건물에서 "호실 추가" 버튼을 클릭하세요.
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-[#f8f9fa] rounded-2xl border-2 border-dashed border-gray-200">
             <Layers size={64} className="mb-4 opacity-20"/>
             <p className="font-bold">조회할 자산을 리스트에서 선택해 주세요.</p>
          </div>
        )}
      </div>

      {isPropertyModalOpen && (
        <Modal onClose={() => setIsPropertyModalOpen(false)} disableOverlayClick={true}>
           <div className="p-8 space-y-8">
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
                         onAddressSelect={(result) => {
                           setNewProp({
                             ...newProp,
                             masterAddress: result.jibunAddress,
                             roadAddress: result.roadAddress
                           });
                           setDisplayAddress(result.fullJibunAddress);
                         }}
                       />
                    </div>

                    {(displayAddress || newProp.masterAddress?.sido) && (
                      <div className="bg-white p-4 rounded-xl border border-[#dadce0] space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">지번주소</label>
                          <p className="font-bold text-[#202124]">
                            {displayAddress || getFullAddress(newProp.masterAddress!)}
                          </p>
                        </div>
                        {newProp.roadAddress && (
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">도로명주소</label>
                            <p className="font-bold text-[#202124]">{newProp.roadAddress}</p>
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
            <div className="p-8 space-y-6">
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
                            <label className="text-[10px] font-black text-gray-400 mb-1 block">해당 층수</label>
                            <input
                                type="number"
                                className="w-full border border-[#dadce0] p-3 rounded-lg font-bold bg-white focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                value={newUnit.floor}
                                onChange={e => setNewUnit({...newUnit, floor: Number(e.target.value)})}
                                placeholder="음수는 지하층"
                            />
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
          <Modal onClose={() => setIsBuildingModalOpen(false)} disableOverlayClick={true}>
              <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3"><BuildingIcon size={24} className="text-[#1a73e8]"/> 건물 추가</h3>
                      <button onClick={() => setIsBuildingModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>

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
                              <label className="text-[10px] font-black text-gray-400 mb-1 block">연면적 (㎡)</label>
                              <input
                                  className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-black text-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none"
                                  value={formatNumberInput(newBuilding.spec?.grossFloorArea)}
                                  onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, grossFloorArea: parseNumberInput(e.target.value)}})}
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

                  <div className="flex gap-3 border-t border-gray-100 pt-6">
                      <button onClick={() => setIsBuildingModalOpen(false)} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소</button>
                      <button onClick={handleSaveBuilding} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">저장</button>
                  </div>
              </div>
          </Modal>
      )}

      {/* 토지(필지) 추가 모달 */}
      {isLotModalOpen && selectedProperty && (
          <Modal onClose={() => setIsLotModalOpen(false)} disableOverlayClick={true}>
              <div className="p-8 space-y-8">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3"><MapPin size={24} className="text-[#1a73e8]"/> 토지 추가</h3>
                      <button onClick={() => setIsLotModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  {/* 대표지번 주소체계 안내 */}
                  <div className="bg-[#e8f0fe] p-4 rounded-xl border border-[#c2d7f8]">
                      <p className="text-sm text-[#1a73e8] font-medium">
                        <span className="font-black">대표지번:</span> {selectedProperty.masterAddress.sido} {selectedProperty.masterAddress.sigungu} {selectedProperty.masterAddress.eupMyeonDong}{selectedProperty.masterAddress.li ? ` ${selectedProperty.masterAddress.li}` : ''} {selectedProperty.masterAddress.bonbun}{selectedProperty.masterAddress.bubun ? `-${selectedProperty.masterAddress.bubun}` : ''}
                      </p>
                      <p className="text-xs text-[#5f6368] mt-1">기본값으로 대표지번 주소가 입력되어 있습니다. 다른 행정구역의 토지도 추가 가능합니다.</p>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-4">
                          <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><MapPin size={16}/> 지번 주소</p>

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
    </div>
  );
};
