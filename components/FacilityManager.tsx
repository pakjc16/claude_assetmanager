
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Facility, FacilityLog, Property, Stakeholder, FacilityCategory, FacilityStatus, MaintenanceContract, Unit } from '../types';
import { Wrench, Plus, AlertCircle, CheckCircle, X, History, Edit2, MapPin, ShieldAlert, Calendar, ClipboardCheck, DollarSign } from 'lucide-react';

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl bg-white animate-in zoom-in-95 duration-200">
        {children}
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
}

const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  ELEVATOR: '승강기', ESCALATOR: '에스컬레이터', PARKING_MECHANICAL: '기계식 주차장', PARKING_BARRIER: '주차 차단기', HVAC: '냉난방/공조', BOILER: '보일러/난방', ELECTRICAL: '수변전/전기', PLUMBING: '상하수도/배관', SEPTIC_TANK: '정화조', FIRE_SAFETY: '소방 시설', GAS: '도시가스', EV_CHARGER: '전기차 충전소', HOIST: '호이스트/리프트', OTHER: '기타 설비'
};

const STATUS_LABELS: Record<FacilityStatus, {label: string, color: string, icon: any}> = {
  OPERATIONAL: { label: '정상 가동', color: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]', icon: CheckCircle },
  UNDER_REPAIR: { label: '수리 중', color: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]', icon: Wrench },
  INSPECTION_DUE: { label: '점검 요망', color: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]', icon: AlertCircle },
  MALFUNCTION: { label: '고장/장애', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: ShieldAlert }
};

export const FacilityManager: React.FC<FacilityManagerProps> = ({
  facilities, facilityLogs, properties, units, stakeholders, onAddFacility, onUpdateFacility, onAddLog, formatMoney, formatMoneyInput, parseMoneyInput
}) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogHistoryOpen, setIsLogHistoryOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [selectedPropId] = useState<string>(properties[0]?.id || '');
  
  const [facilityForm, setFacilityForm] = useState<Partial<Facility>>({
    category: 'ELEVATOR', status: 'OPERATIONAL', inspectionCycle: 12, initialCost: 0, buildingId: '', unitId: ''
  });
  
  const [logForm, setLogForm] = useState<Partial<FacilityLog>>({
    type: 'INSPECTION', date: new Date().toISOString().split('T')[0], cost: 0, isLegal: true, title: ''
  });

  const handleOpenAdd = () => {
    setFacilityForm({ propertyId: selectedPropId, category: 'ELEVATOR', status: 'OPERATIONAL', inspectionCycle: 12, initialCost: 0, name: '' });
    setSelectedFacilityId(null); setIsModalOpen(true);
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

  const handleSaveLog = () => {
    if (!logForm.title || !selectedFacilityId) return;
    const log: FacilityLog = { id: `log${Date.now()}`, facilityId: selectedFacilityId, performer: '시설관리팀', description: '', ...logForm } as FacilityLog;
    onAddLog(log);
    setIsAddLogOpen(false);
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-[#dadce0] shadow-sm">
         <div>
            <h2 className="text-base md:text-xl font-black text-[#3c4043] flex items-center gap-2"><Wrench size={20} className="md:w-6 md:h-6 text-[#1a73e8]"/> 시설 관리</h2>
            <p className="text-[10px] md:text-sm text-[#5f6368] mt-1 font-medium hidden md:block">자산별 설비 위치, 노후도, 정기 점검 이력 및 유지보수 계약 실시간 모니터링</p>
         </div>
         <button onClick={handleOpenAdd} className="bg-[#1a73e8] text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-sm font-black flex items-center gap-1 md:gap-2 hover:bg-[#1557b0] shadow-xl transition-all active:scale-95 whitespace-nowrap"><Plus size={14} className="md:w-[18px] md:h-[18px]"/> 설비 등록</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
         {facilities.map(fac => {
            const status = STATUS_LABELS[fac.status];
            const unit = units.find(u => u.id === fac.unitId);
            const property = properties.find(p => p.id === fac.propertyId);
            const vendor = stakeholders.find(s => s.id === fac.vendorId);

            return (
               <div key={fac.id} className="bg-white rounded-xl md:rounded-2xl border border-[#dadce0] p-3 md:p-6 hover:shadow-2xl transition-all relative group flex flex-col border-b-4 border-b-gray-100 hover:border-b-[#1a73e8]">
                  <div className="flex justify-between items-start mb-3 md:mb-5">
                     <div>
                        <span className="text-[8px] md:text-[10px] font-black text-[#5f6368] uppercase tracking-wide md:tracking-widest bg-gray-50 px-1.5 md:px-2 py-0.5 rounded-md border border-gray-100">{CATEGORY_LABELS[fac.category]}</span>
                        <h3 className="text-sm md:text-lg font-black text-[#202124] mt-1.5 md:mt-2 group-hover:text-[#1a73e8] transition-colors truncate">{fac.name}</h3>
                     </div>
                     <span className={`px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-black border flex items-center gap-1 md:gap-1.5 shadow-sm whitespace-nowrap ${status.color}`}>
                        <status.icon size={10} className="md:w-3 md:h-3"/>
                        <span className="hidden md:inline">{status.label}</span>
                     </span>
                  </div>

                  <div className="space-y-2 md:space-y-3 mt-2 md:mt-4 text-[10px] md:text-xs font-bold flex-1">
                     <div className="flex justify-between items-center bg-[#f8f9fa] p-2 md:p-3 rounded-lg md:rounded-xl border border-gray-100">
                        <span className="text-[#5f6368] flex items-center gap-1 md:gap-2"><MapPin size={12} className="md:w-3.5 md:h-3.5 text-[#1a73e8]"/> 위치</span>
                        <span className="text-[#202124] truncate max-w-[80px] md:max-w-none">
                           {unit ? `${unit.unitNumber}호` : fac.floorNumber ? `${fac.floorNumber}층` : property?.name || '공용부'}
                        </span>
                     </div>
                     <div className="flex justify-between items-center px-1 md:px-2">
                        <span className="text-[#5f6368] flex items-center gap-1 md:gap-2"><Calendar size={12} className="md:w-3.5 md:h-3.5 text-gray-400"/> 점검일</span>
                        <span className={`font-black ${fac.status === 'INSPECTION_DUE' ? 'text-red-600 bg-red-50 px-1.5 md:px-2 rounded' : 'text-gray-700'}`}>{fac.nextInspectionDate}</span>
                     </div>
                     <div className="flex justify-between items-center px-1 md:px-2">
                        <span className="text-[#5f6368] flex items-center gap-1 md:gap-2"><ClipboardCheck size={12} className="md:w-3.5 md:h-3.5 text-gray-400"/> 업체</span>
                        <span className="text-gray-900 truncate max-w-[80px] md:max-w-none">{vendor?.name || '내부 관리'}</span>
                     </div>
                  </div>

                  <div className="mt-4 md:mt-6 flex gap-2 md:gap-3 pt-3 md:pt-5 border-t border-[#f1f3f4]">
                     <button onClick={() => { setSelectedFacilityId(fac.id); setIsLogHistoryOpen(true); }} className="flex-1 py-2 md:py-3 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black transition-all flex items-center justify-center gap-1 md:gap-2 active:scale-95 shadow-sm">
                        <History size={14} className="md:w-4 md:h-4"/> 이력
                     </button>
                     <button onClick={() => { setSelectedFacilityId(fac.id); setFacilityForm({...fac}); setIsModalOpen(true); }} className="p-2 md:p-3 border border-[#dadce0] rounded-lg md:rounded-xl text-[#5f6368] hover:bg-[#f1f3f4] transition-all active:scale-95"><Edit2 size={14} className="md:w-4 md:h-4"/></button>
                  </div>
               </div>
            )
         })}
         {facilities.length === 0 && <div className="col-span-full py-16 md:py-32 text-center text-gray-400 font-bold text-xs md:text-sm bg-[#f8f9fa] rounded-xl md:rounded-2xl border-2 border-dashed border-gray-200">등록된 설비가 존재하지 않습니다.</div>}
      </div>

      {isModalOpen && (
         <Modal onClose={() => setIsModalOpen(false)} disableOverlayClick={true}>
            <div className="p-8 space-y-8">
               <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="font-black text-2xl text-[#3c4043] flex items-center gap-3"><Wrench size={24} className="text-[#1a73e8]"/> {selectedFacilityId ? '설비 마스터 정보 수정' : '신규 시설/설비 자산 등록'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="col-span-2">
                     <label className="text-[11px] font-black text-[#5f6368] uppercase block mb-2 tracking-widest">설비 및 장비 명칭 <span className="text-red-500">*</span></label>
                     <input className="w-full border border-[#dadce0] p-4 rounded-xl outline-none focus:ring-4 focus:ring-[#e8f0fe] font-black text-lg bg-white" value={facilityForm.name || ''} onChange={e => setFacilityForm({...facilityForm, name: e.target.value})} placeholder="예: 중앙 공조 시스템 외기 도입 유닛 03"/>
                  </div>
                  <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-gray-100 space-y-6 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                      <div className="md:col-span-2 mb-2 font-black text-xs text-[#1a73e8] uppercase tracking-widest border-b pb-2 flex items-center gap-2"><MapPin size={16}/> 상세 속성 설정</div>
                      <div>
                         <label className="text-[11px] font-bold text-gray-400 uppercase block mb-2">설비 카테고리</label>
                         <select className="w-full border border-[#dadce0] p-4 rounded-xl bg-white font-black outline-none focus:ring-2 focus:ring-[#1a73e8]" value={facilityForm.category} onChange={e => setFacilityForm({...facilityForm, category: e.target.value as any})}>
                            {Object.keys(CATEGORY_LABELS).map(k => <option key={k} value={k}>{CATEGORY_LABELS[k as FacilityCategory]}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="text-[11px] font-bold text-gray-400 uppercase block mb-2">가동 상태</label>
                         <select className="w-full border border-[#dadce0] p-4 rounded-xl bg-white font-black outline-none focus:ring-2 focus:ring-[#1a73e8]" value={facilityForm.status} onChange={e => setFacilityForm({...facilityForm, status: e.target.value as any})}>
                            {Object.keys(STATUS_LABELS).map(k => <option key={k} value={k}>{STATUS_LABELS[k as FacilityStatus].label}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="text-[11px] font-bold text-gray-400 uppercase block mb-2">설치 위치(호실)</label>
                         <select className="w-full border border-[#dadce0] p-4 rounded-xl bg-white font-black outline-none" value={facilityForm.unitId} onChange={e => setFacilityForm({...facilityForm, unitId: e.target.value})}>
                            <option value="">단지 공용</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.unitNumber}호</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="text-[11px] font-bold text-gray-400 uppercase block mb-2">점검 주기 (개월)</label>
                         <input type="number" className="w-full border border-[#dadce0] p-4 rounded-xl bg-white font-black" value={facilityForm.inspectionCycle} onChange={e => setFacilityForm({...facilityForm, inspectionCycle: Number(e.target.value)})}/>
                      </div>
                  </div>
               </div>
               <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
                  <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-sm font-black text-[#5f6368] hover:bg-gray-100 rounded-xl transition-colors">취소</button>
                  <button onClick={handleSaveFacility} className="px-14 py-4 text-sm font-black bg-[#1a73e8] text-white rounded-xl hover:bg-[#1557b0] shadow-xl transition-all active:scale-95">설비 자산 저장</button>
               </div>
            </div>
         </Modal>
      )}

      {isLogHistoryOpen && selectedFacilityId && (
         <Modal onClose={() => setIsLogHistoryOpen(false)} disableOverlayClick={true}>
            <div className="p-10 h-[85vh] flex flex-col">
               <div className="border-b border-gray-100 flex justify-between items-center pb-6 mb-8">
                  <div>
                     <h3 className="font-black text-2xl text-[#3c4043] flex items-center gap-3"><History size={24} className="text-[#1a73e8]"/> {facilities.find(f => f.id === selectedFacilityId)?.name} 점검 이력</h3>
                     <p className="text-sm text-[#5f6368] mt-2 font-medium">유지보수, 수리, 점검 및 교체 기록 히스토리 타임라인</p>
                  </div>
                  <button onClick={() => setIsLogHistoryOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
               </div>
               <div className="flex-1 overflow-y-auto space-y-10 pr-6 custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                     <h4 className="text-[12px] font-black text-[#5f6368] uppercase tracking-widest flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#1a73e8]"></div> 시설 관리 타임라인</h4>
                     <button onClick={() => setIsAddLogOpen(true)} className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:bg-[#1557b0] active:scale-95 shadow-lg">+ 정기/수시 점검 기록 추가</button>
                  </div>
                  <div className="relative border-l-4 border-[#f1f3f4] ml-6 pl-10 space-y-12">
                    {facilityLogs.filter(l => l.facilityId === selectedFacilityId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                       <div key={log.id} className="relative bg-white rounded-2xl border border-[#dadce0] p-6 shadow-sm hover:shadow-xl hover:border-[#1a73e8] transition-all group border-l-8 border-l-[#1a73e8]">
                          <div className="absolute -left-[54px] top-6 w-6 h-6 bg-white border-4 border-[#1a73e8] rounded-full z-10 shadow-sm"></div>
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-[#1a73e8] bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{log.date}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${log.type === 'REPAIR' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{log.type}</span>
                             </div>
                             <div className="text-right">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">소요 비용</span>
                                <span className="font-black text-[#ea4335] text-sm">{formatMoney(log.cost)}</span>
                             </div>
                          </div>
                          <h5 className="font-black text-lg text-[#202124] mb-2">{log.title}</h5>
                          <p className="text-sm text-[#5f6368] leading-relaxed font-medium bg-[#f8f9fa] p-4 rounded-xl border border-gray-50">{log.description || '상세 내용 기술되지 않음'}</p>
                          <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-gray-400">
                             <span>점검자: {log.performer}</span>
                             {log.isLegal && <span className="flex items-center gap-1 text-[#34a853]"><CheckCircle size={12}/> 법정 점검 완료</span>}
                          </div>
                       </div>
                    ))}
                    {facilityLogs.filter(l => l.facilityId === selectedFacilityId).length === 0 && (
                      <div className="text-center py-24 -ml-10">
                        <History size={64} className="mx-auto text-gray-100 mb-6 opacity-50"/>
                        <p className="text-gray-400 font-black">등록된 점검 이력이 존재하지 않습니다.</p>
                      </div>
                    )}
                  </div>
               </div>
               <div className="pt-8 border-t border-gray-100 flex justify-end">
                  <button onClick={() => setIsLogHistoryOpen(false)} className="px-10 py-4 text-sm font-black text-[#5f6368] hover:bg-gray-100 rounded-xl transition-colors">창 닫기</button>
               </div>
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
