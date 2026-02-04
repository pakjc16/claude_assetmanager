
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Property, Unit, Building, JibunAddress, Facility, BuildingSpec, Lot } from '../types';
import { MapPin, Plus, X, Building as BuildingIcon, Edit2, Layers, Home, Info, Trash2, Ruler } from 'lucide-react';

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
}

export const PropertyManager: React.FC<PropertyManagerProps> = ({ 
  properties, units, onAddProperty, onUpdateProperty, onAddUnit, onUpdateUnit, formatArea, formatNumberInput, parseNumberInput
}) => {
  const [selectedPropId, setSelectedPropId] = useState<string>(properties[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LAND' | 'BUILDING' | 'UNIT'>('OVERVIEW');
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);

  const [newProp, setNewProp] = useState<Partial<Property>>({
    type: 'LAND_AND_BUILDING', name: '', masterAddress: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' }
  });

  const [newUnit, setNewUnit] = useState<Partial<Unit>>({ unitNumber: '', floor: 1, area: 0, usage: '업무시설', status: 'VACANT', buildingId: '' });

  const [newBuilding, setNewBuilding] = useState<Partial<Building>>({
      name: '', spec: { buildingArea: 0, grossFloorArea: 0, floorCount: { underground: 0, ground: 1 }, floors: [], completionDate: '', mainUsage: '업무시설', parkingCapacity: 0, elevatorCount: 0 }
  });

  const selectedProperty = properties.find(p => p.id === selectedPropId);
  const propertyUnits = units.filter(u => u.propertyId === selectedPropId);

  const handleSaveProperty = () => {
    if (!newProp.name || !newProp.masterAddress?.sido || !newProp.masterAddress?.bonbun) return;
    if (selectedProperty && selectedPropId === newProp.id) {
        onUpdateProperty({ ...selectedProperty, ...newProp as Property });
    } else {
        onAddProperty({ id: `p${Date.now()}`, lots: [], buildings: [], totalLandArea: 0, ...newProp as Property });
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

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-80 bg-white rounded-xl border border-[#dadce0] flex-shrink-0 flex flex-col h-[calc(100vh-140px)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#dadce0] flex justify-between items-center bg-[#f8f9fa]">
          <h2 className="font-bold text-[#3c4043] flex items-center gap-2"><Layers size={18} className="text-[#1a73e8]"/> 자산 인벤토리</h2>
          <button onClick={() => { setNewProp({ type: 'LAND_AND_BUILDING', name: '', masterAddress: { sido: '', sigungu: '', eupMyeonDong: '', li: '', bonbun: '', bubun: '' } }); setIsPropertyModalOpen(true); }} className="p-2 text-[#1a73e8] hover:bg-[#e8f0fe] rounded-full transition-colors"><Plus size={20}/></button>
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
                 <button onClick={() => { setNewProp({...selectedProperty}); setIsPropertyModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 border border-[#dadce0] rounded-lg text-xs font-bold text-[#5f6368] hover:bg-[#f8f9fa] transition-colors"><Edit2 size={14}/> 마스터 정보 수정</button>
             </div>

             <div className="flex border-b border-[#dadce0] bg-[#f8f9fa] px-4">
               {[
                 { id: 'OVERVIEW', label: '종합 개요', icon: <Home size={14}/> },
                 { id: 'LAND', label: '필지 정보', icon: <MapPin size={14}/> },
                 { id: 'BUILDING', label: '건물 관리', icon: <BuildingIcon size={14}/> },
                 { id: 'UNIT', label: '호실 현황', icon: <Layers size={14}/> }
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
                         <h3 className="font-bold text-[#3c4043] flex items-center gap-2 border-b border-[#dadce0] pb-4 mb-4"><Info size={18} className="text-[#1a73e8]"/> 자산 기본 사양</h3>
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                               <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">전체 대지면적</p>
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
                         <h3 className="font-bold text-[#3c4043] flex items-center gap-2 border-b border-[#dadce0] pb-4 mb-4"><BuildingIcon size={18} className="text-[#1a73e8]"/> 주요 건축물 현황</h3>
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
                            <h3 className="font-black text-[#3c4043] flex items-center gap-2"><MapPin size={18} className="text-[#1a73e8]"/> 소유 필지 상세 내역</h3>
                        </div>
                        <div className="border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#f8f9fa] text-[#5f6368] font-bold border-b border-[#dadce0] text-[11px] uppercase tracking-widest">
                                    <tr>
                                        <th className="p-5">지번 주소 (지번/본번/부번)</th>
                                        <th className="p-5">지목(Jimok)</th>
                                        <th className="p-5 text-right">필지 면적(㎡)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f3f4]">
                                    {selectedProperty.lots.map(lot => (
                                        <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-5 font-bold text-gray-800">{getFullAddress(lot.address)}</td>
                                            <td className="p-5"><span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-black text-gray-600">{lot.jimok}</span></td>
                                            <td className="p-5 text-right font-black text-[#1a73e8]">{formatNumberInput(lot.area)}</td>
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
                            <h3 className="font-black text-[#3c4043] flex items-center gap-2"><BuildingIcon size={18} className="text-[#1a73e8]"/> 건물 정보 및 정밀 스펙</h3>
                            <button onClick={() => setIsBuildingModalOpen(true)} className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-[#1557b0] transition-all"><Plus size={16}/> 신규 건물 등록</button>
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
                      <h3 className="font-black text-[#3c4043] flex items-center gap-2"><Layers size={18} className="text-[#1a73e8]"/> 개별 호실 및 임대 구역</h3>
                      <button onClick={() => { setNewUnit({buildingId: selectedProperty.buildings[0]?.id || '', unitNumber: '', area: 0, status: 'VACANT'}); setIsUnitModalOpen(true); }} className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-[#1557b0] transition-all"><Plus size={16}/> 호실 추가</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                      {propertyUnits.map(unit => (
                        <div key={unit.id} className="p-5 bg-white border border-[#dadce0] rounded-2xl hover:border-[#1a73e8] hover:shadow-xl transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <span className="font-black text-lg text-[#202124] group-hover:text-[#1a73e8] transition-colors">{unit.unitNumber}호</span>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${unit.status === 'OCCUPIED' ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' : unit.status === 'UNDER_REPAIR' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'}`}>
                              {unit.status === 'OCCUPIED' ? '임대중' : unit.status === 'UNDER_REPAIR' ? '보수중' : '공실'}
                            </span>
                          </div>
                          <div className="space-y-2 mt-4 text-[11px] text-[#5f6368] font-bold">
                            <p className="flex justify-between border-b border-gray-50 pb-1">전용 면적 <span className="text-gray-900">{formatArea(unit.area)}</span></p>
                            <p className="flex justify-between border-b border-gray-50 pb-1">주용도 <span className="text-gray-900">{unit.usage}</span></p>
                            <p className="flex justify-between">해당 층수 <span className="text-gray-900 font-mono">{unit.floor}F</span></p>
                          </div>
                        </div>
                      ))}
                      {propertyUnits.length === 0 && <div className="col-span-full py-24 text-center text-gray-400 border-2 border-dashed rounded-2xl font-bold bg-gray-50">등록된 호실 데이터가 없습니다.</div>}
                    </div>
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
                 <h3 className="text-2xl font-black text-[#202124] flex items-center gap-3"><Edit2 size={24} className="text-[#1a73e8]"/> 자산 마스터 정보 설정</h3>
                 <button onClick={() => setIsPropertyModalOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="md:col-span-2">
                    <label className="text-xs font-black text-[#5f6368] mb-2 block uppercase tracking-widest">자산 공식 명칭 <span className="text-[#ea4335]">*</span></label>
                    <input className="w-full border border-[#dadce0] p-4 rounded-xl focus:ring-4 focus:ring-[#e8f0fe] focus:border-[#1a73e8] outline-none font-black text-lg transition-all" value={newProp.name} onChange={e => setNewProp({...newProp, name: e.target.value})} placeholder="예: 삼성동 시그니처 오피스 타워"/>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-2xl md:col-span-2 space-y-6 border border-[#dadce0]">
                    <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2"><MapPin size={16}/> 대표 지번 주소 체계 (Jibun System)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                       <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">시/도</label>
                          <input className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold outline-none" value={newProp.masterAddress?.sido} onChange={e => setNewProp({...newProp, masterAddress: {...newProp.masterAddress!, sido: e.target.value}})} placeholder="서울특별시"/>
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">시/군/구</label>
                          <input className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold outline-none" value={newProp.masterAddress?.sigungu} onChange={e => setNewProp({...newProp, masterAddress: {...newProp.masterAddress!, sigungu: e.target.value}})} placeholder="강남구"/>
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">읍/면/동</label>
                          <input className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold outline-none" value={newProp.masterAddress?.eupMyeonDong} onChange={e => setNewProp({...newProp, masterAddress: {...newProp.masterAddress!, eupMyeonDong: e.target.value}})} placeholder="역삼동"/>
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">리 (선택)</label>
                          <input className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold outline-none" value={newProp.masterAddress?.li} onChange={e => setNewProp({...newProp, masterAddress: {...newProp.masterAddress!, li: e.target.value}})} />
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">본번 <span className="text-red-500">*</span></label>
                          <input className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold outline-none" value={newProp.masterAddress?.bonbun} onChange={e => setNewProp({...newProp, masterAddress: {...newProp.masterAddress!, bonbun: e.target.value}})} placeholder="100"/>
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block">부번 (선택)</label>
                          <input className="w-full border border-[#dadce0] p-3 rounded-lg text-sm bg-white font-bold outline-none" value={newProp.masterAddress?.bubun} onChange={e => setNewProp({...newProp, masterAddress: {...newProp.masterAddress!, bubun: e.target.value}})} placeholder="1"/>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="flex gap-3 border-t border-gray-100 pt-8">
                 <button onClick={() => setIsPropertyModalOpen(false)} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소 및 닫기</button>
                 <button onClick={handleSaveProperty} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">자산 정보 업데이트</button>
              </div>
           </div>
        </Modal>
      )}

      {isUnitModalOpen && (
        <Modal onClose={() => setIsUnitModalOpen(false)} disableOverlayClick={true}>
            <div className="p-8 space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                   <h3 className="text-xl font-black text-[#202124] flex items-center gap-3"><Plus size={24} className="text-[#1a73e8]"/> 신규 호실 및 임대 구역 등록</h3>
                   <button onClick={() => setIsUnitModalOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-black text-[#5f6368] block mb-2 uppercase tracking-widest">호실 번호 <span className="text-red-500">*</span></label>
                        <input className="w-full border border-[#dadce0] p-4 rounded-xl text-lg font-black focus:ring-4 focus:ring-[#e8f0fe] outline-none" value={newUnit.unitNumber} onChange={e => setNewUnit({...newUnit, unitNumber: e.target.value})} placeholder="예: 101"/>
                    </div>
                    <div>
                        <label className="text-xs font-black text-[#5f6368] block mb-2 uppercase tracking-widest">해당 층수</label>
                        <input type="number" className="w-full border border-[#dadce0] p-4 rounded-xl text-lg font-black" value={newUnit.floor} onChange={e => setNewUnit({...newUnit, floor: Number(e.target.value)})}/>
                    </div>
                    <div>
                        <label className="text-xs font-black text-[#5f6368] block mb-2 uppercase tracking-widest">전용 면적 (㎡) <span className="text-red-500">*</span></label>
                        <input type="text" className="w-full border border-[#dadce0] p-4 rounded-xl text-lg font-black text-[#1a73e8]" value={formatNumberInput(newUnit.area)} onChange={e => setNewUnit({...newUnit, area: parseNumberInput(e.target.value)})}/>
                    </div>
                    <div>
                        <label className="text-xs font-black text-[#5f6368] block mb-2 uppercase tracking-widest">공식 용도</label>
                        <input className="w-full border border-[#dadce0] p-4 rounded-xl text-lg font-black" value={newUnit.usage} onChange={e => setNewUnit({...newUnit, usage: e.target.value})} placeholder="예: 업무시설(사무실)"/>
                    </div>
                </div>
                <div className="flex gap-3 border-t border-gray-100 pt-8">
                   <button onClick={() => setIsUnitModalOpen(false)} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소</button>
                   <button onClick={handleSaveUnit} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">호실 데이터 추가</button>
                </div>
            </div>
        </Modal>
      )}

      {isBuildingModalOpen && (
          <Modal onClose={() => setIsBuildingModalOpen(false)} disableOverlayClick={true}>
              <div className="p-8 space-y-8">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3"><BuildingIcon size={24} className="text-[#1a73e8]"/> 건축물 상세 제원 등록</h3>
                      <button onClick={() => setIsBuildingModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dadce0] space-y-6">
                          <div>
                              <label className="text-xs font-black text-[#5f6368] mb-2 block uppercase tracking-widest">건물 명칭 (동)</label>
                              <input className="w-full border border-[#dadce0] p-4 rounded-xl focus:ring-4 focus:ring-[#e8f0fe] outline-none font-black text-lg bg-white" value={newBuilding.name} onChange={e => setNewBuilding({...newBuilding, name: e.target.value})} placeholder="예: 시그니처 A동"/>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 mb-1 block">지상 층수</label>
                                  <input type="number" className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold" value={newBuilding.spec?.floorCount.ground} onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, floorCount: {...newBuilding.spec!.floorCount, ground: Number(e.target.value)}}})}/>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 mb-1 block">지하 층수</label>
                                  <input type="number" className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold" value={newBuilding.spec?.floorCount.underground} onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, floorCount: {...newBuilding.spec!.floorCount, underground: Number(e.target.value)}}})}/>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 mb-1 block">주차 대수</label>
                                  <input type="number" className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold" value={newBuilding.spec?.parkingCapacity} onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, parkingCapacity: Number(e.target.value)}})}/>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 mb-1 block">엘리베이터</label>
                                  <input type="number" className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-bold" value={newBuilding.spec?.elevatorCount} onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, elevatorCount: Number(e.target.value)}})}/>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div>
                                  <label className="text-[10px] font-black text-gray-400 mb-1 block">건축 면적 (㎡)</label>
                                  <input className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-black" value={formatNumberInput(newBuilding.spec?.buildingArea)} onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, buildingArea: parseNumberInput(e.target.value)}})}/>
                             </div>
                             <div>
                                  <label className="text-[10px] font-black text-gray-400 mb-1 block">연면적 합계 (㎡)</label>
                                  <input className="w-full border border-[#dadce0] p-3 rounded-lg bg-white font-black text-[#1a73e8]" value={formatNumberInput(newBuilding.spec?.grossFloorArea)} onChange={e => setNewBuilding({...newBuilding, spec: {...newBuilding.spec!, grossFloorArea: parseNumberInput(e.target.value)}})}/>
                             </div>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-3 border-t border-gray-100 pt-8">
                      <button onClick={() => setIsBuildingModalOpen(false)} className="flex-1 py-4 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-[#f8f9fa] transition-colors">취소</button>
                      <button onClick={handleSaveBuilding} className="flex-1 bg-[#1a73e8] text-white py-4 rounded-xl font-black shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">건물 제원 저장</button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
