
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LeaseContract, MaintenanceContract, UtilityContract, Stakeholder, Property, Unit, Facility, LeaseType, ContractTargetType, ManagementItem } from '../types';
import { X, Plus, Shuffle, Wrench, Zap, FileText, Calendar, User, Home, Building, ReceiptText, MapPin, Coins, CreditCard, Clock, Info } from 'lucide-react';

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-xl shadow-2xl bg-white animate-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>,
    document.body
  );
};

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
  onAddMaintenance: (contract: MaintenanceContract) => void;
  onUpdateMaintenance: (contract: MaintenanceContract) => void;
  onAddUtility: (contract: UtilityContract) => void;
  onUpdateUtility: (contract: UtilityContract) => void;
  formatMoney: (amount: number) => string;
  formatNumberInput: (num: number | undefined | null) => string;
  parseNumberInput: (str: string) => number;
}

export const ContractManager: React.FC<ContractManagerProps> = ({ 
  leaseContracts, maintenanceContracts, utilityContracts, stakeholders, properties, units, facilities, 
  formatMoney, formatNumberInput, parseNumberInput, onAddLease, onAddMaintenance, onAddUtility
}) => {
  const [activeTab, setActiveTab] = useState<'LEASE' | 'MAINTENANCE' | 'UTILITY'>('LEASE');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [leaseForm, setLeaseForm] = useState<Partial<LeaseContract>>({
    type: 'LEASE_OUT', targetType: 'UNIT', targetId: '', tenantId: '', status: 'ACTIVE',
    term: { contractDate: '', startDate: '', endDate: '', extensionType: 'NEW' },
    financialTerms: [{
      id: `ft-${Date.now()}`, startDate: '', endDate: '', deposit: 0, monthlyRent: 0, adminFee: 0, 
      vatIncluded: true, paymentDay: 1, paymentType: 'PREPAID', managementItems: []
    }],
    conditions: []
  });

  const [maintForm, setMaintForm] = useState<Partial<MaintenanceContract>>({
    targetType: 'PROPERTY', targetId: '', vendorId: '', serviceType: 'CLEANING', status: 'ACTIVE',
    isRecurring: true, paymentDay: 1, term: { startDate: '', endDate: '' }, monthlyCost: 0, details: ''
  });

  const [utilForm, setUtilForm] = useState<Partial<UtilityContract>>({
    targetType: 'PROPERTY', targetId: '', category: 'ELECTRICITY', provider: '', customerNumber: '',
    status: 'ACTIVE', startDate: '', billingCycle: 'MONTHLY', paymentDay: 1, paymentMethod: '계좌이체'
  });

  const handleSaveContract = () => {
    if (activeTab === 'LEASE') {
      if (!leaseForm.targetId || !leaseForm.tenantId || !leaseForm.term?.startDate) return alert('필수 항목을 모두 입력해주세요.');
      onAddLease({ id: `lc-${Date.now()}`, ...leaseForm } as LeaseContract);
    } else if (activeTab === 'MAINTENANCE') {
      if (!maintForm.targetId || !maintForm.vendorId) return alert('필수 항목을 모두 입력해주세요.');
      onAddMaintenance({ id: `mc-${Date.now()}`, ...maintForm } as MaintenanceContract);
    } else {
      if (!utilForm.targetId || !utilForm.customerNumber) return alert('필수 항목을 모두 입력해주세요.');
      onAddUtility({ id: `uc-${Date.now()}`, ...utilForm } as UtilityContract);
    }
    setIsModalOpen(false);
  };

  const getTargetName = (type: ContractTargetType, id: string) => {
    if (type === 'UNIT') return units.find(u => u.id === id)?.unitNumber + '호' || '미지정 호실';
    if (type === 'PROPERTY') return properties.find(p => p.id === id)?.name || '미지정 자산';
    return '건물 전체';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#dadce0] shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[#3c4043] flex items-center gap-2"><FileText size={24} className="text-[#1a73e8]"/> 통합 계약 및 운영 자산 관리</h2>
          <p className="text-sm text-[#5f6368] mt-1 font-medium">임대차 현황, 시설 유지보수 용역, 유틸리티 계약의 유기적 연동 및 이력 관리</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#1a73e8] text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-[#1557b0] shadow-xl transition-all active:scale-95"><Plus size={18} /> 신규 {activeTab === 'LEASE' ? '임대차' : activeTab === 'MAINTENANCE' ? '유지보수' : '공과금'} 계약 등록</button>
      </div>

      <div className="flex border-b border-[#dadce0] bg-[#f8f9fa] px-4 rounded-t-2xl">
        {[
          { id: 'LEASE', label: '임대차 계약', icon: <Shuffle size={16}/> },
          { id: 'MAINTENANCE', label: '유지보수/용역', icon: <Wrench size={16}/> },
          { id: 'UTILITY', label: '공과금/유틸리티', icon: <Zap size={16}/> }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === tab.id ? 'border-b-4 border-[#1a73e8] text-[#1a73e8] bg-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl border border-[#dadce0] border-t-0 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
           <thead className="bg-[#f8f9fa] border-b border-[#dadce0] text-[11px] font-black text-[#5f6368] uppercase tracking-widest">
              <tr>
                <th className="p-5">계약 대상 (자산/호실)</th>
                <th className="p-5">계약 당사자</th>
                <th className="p-5">계약 기간 (시작~종료)</th>
                <th className="p-5 text-right">주요 조건 (보증금/비용)</th>
                <th className="p-5 text-center">현재 상태</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-[#f1f3f4]">
              {activeTab === 'LEASE' && leaseContracts.map(c => {
                 const unit = units.find(u => u.id === c.targetId);
                 const property = properties.find(p => p.id === (unit?.propertyId || c.targetId));
                 const tenant = stakeholders.find(s => s.id === c.tenantId);
                 const terms = c.financialTerms[0];
                 return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-5">
                       <div className="flex flex-col">
                          <span className="font-black text-[#202124] flex items-center gap-2">
                             <Home size={14} className="text-[#1a73e8]"/> 
                             {unit ? `${unit.unitNumber}호` : '건물 전체'}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-1 font-bold uppercase">{property?.name}</span>
                       </div>
                    </td>
                    <td className="p-5">
                       <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400"/>
                          <span className="font-bold text-[#5f6368] group-hover:text-[#1a73e8]">{tenant?.name || '미지정'}</span>
                       </div>
                    </td>
                    <td className="p-5 font-bold text-gray-500 text-xs">
                       <div className="flex items-center gap-1.5"><Calendar size={12}/> {c.term.startDate} ~ {c.term.endDate}</div>
                    </td>
                    <td className="p-5 text-right">
                       <div className="flex flex-col">
                          <span className="font-black text-[#1a73e8]">보: {formatMoney(terms?.deposit || 0)}</span>
                          <span className="text-[11px] text-[#34a853] font-bold">월: {formatMoney(terms?.monthlyRent || 0)}</span>
                       </div>
                    </td>
                    <td className="p-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.status === 'ACTIVE' ? 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' : 'bg-gray-100 text-gray-400'}`}>{c.status === 'ACTIVE' ? '정상 임대' : '계약 종료'}</span></td>
                  </tr>
                 );
              })}
              {activeTab === 'MAINTENANCE' && maintenanceContracts.map(c => {
                 const vendor = stakeholders.find(s => s.id === c.vendorId);
                 const facility = facilities.find(f => f.id === c.facilityId);
                 return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-5">
                       <div className="flex flex-col">
                          <span className="font-black text-[#202124] flex items-center gap-2">
                             <Wrench size={14} className="text-[#fbbc05]"/> 
                             {facility?.name || '단지 전체 용역'}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-1 font-bold uppercase">{c.serviceType}</span>
                       </div>
                    </td>
                    <td className="p-5">
                       <div className="flex items-center gap-2">
                          <Building size={14} className="text-gray-400"/>
                          <span className="font-bold text-[#5f6368]">{vendor?.name || '미지정 업체'}</span>
                       </div>
                    </td>
                    <td className="p-5 font-bold text-gray-500 text-xs">
                       <div className="flex items-center gap-1.5"><Calendar size={12}/> {c.term.startDate} ~ {c.term.endDate}</div>
                    </td>
                    <td className="p-5 text-right font-black text-[#ea4335]">{formatMoney(c.monthlyCost)} / 월</td>
                    <td className="p-5 text-center"><span className="px-3 py-1 rounded-full bg-[#fef7e0] text-[#b06000] text-[10px] font-black uppercase border border-[#feefc3]">계약중</span></td>
                  </tr>
                 );
              })}
              {activeTab === 'UTILITY' && utilityContracts.map(c => (
                 <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-5">
                       <div className="flex flex-col">
                          <span className="font-black text-[#202124] flex items-center gap-2">
                             <Zap size={14} className="text-[#34a853]"/> 
                             {c.category}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-1 font-bold">고객번호: {c.customerNumber}</span>
                       </div>
                    </td>
                    <td className="p-5 font-bold text-[#5f6368]">{c.provider}</td>
                    <td className="p-5 text-xs text-gray-500 font-medium">검침주기: {c.billingCycle}</td>
                    <td className="p-5 text-right font-bold text-gray-700">납부일: 매월 {c.paymentDay}일</td>
                    <td className="p-5 text-center"><span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black border border-green-100">활성</span></td>
                 </tr>
              ))}
              {((activeTab === 'LEASE' && leaseContracts.length === 0) || (activeTab === 'MAINTENANCE' && maintenanceContracts.length === 0) || (activeTab === 'UTILITY' && utilityContracts.length === 0)) && (
                 <tr><td colSpan={5} className="p-40 text-center text-gray-300 font-bold italic">조회된 계약 데이터가 없습니다.</td></tr>
              )}
           </tbody>
        </table>
      </div>

      {isModalOpen && (
         <Modal onClose={() => setIsModalOpen(false)} disableOverlayClick={true}>
            <div className="p-10 space-y-10">
               <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="text-2xl font-black text-[#202124] flex items-center gap-3">
                     {activeTab === 'LEASE' ? <Shuffle size={28} className="text-[#1a73e8]"/> : activeTab === 'MAINTENANCE' ? <Wrench size={28} className="text-[#fbbc05]"/> : <Zap size={28} className="text-[#34a853]"/>}
                     신규 {activeTab === 'LEASE' ? '임대차' : activeTab === 'MAINTENANCE' ? '유지보수' : '공과금'} 계약 수동 등록
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Common Fields: Target and Stakeholder */}
                  <div className="space-y-6">
                     <h4 className="text-xs font-black text-[#1a73e8] uppercase tracking-widest border-b pb-2 flex items-center gap-2"><MapPin size={16}/> 계약 대상 및 인물 연동</h4>
                     <div className="space-y-4">
                        <div>
                           <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">관리 자산(호실) 선택</label>
                           <select 
                              className="w-full border border-[#dadce0] p-4 rounded-xl font-black bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
                              value={activeTab === 'LEASE' ? leaseForm.targetId : activeTab === 'MAINTENANCE' ? maintForm.targetId : utilForm.targetId}
                              onChange={e => {
                                 const val = e.target.value;
                                 if(activeTab === 'LEASE') setLeaseForm({...leaseForm, targetId: val});
                                 else if(activeTab === 'MAINTENANCE') setMaintForm({...maintForm, targetId: val});
                                 else setUtilForm({...utilForm, targetId: val});
                              }}
                           >
                              <option value="">대상을 선택해 주세요</option>
                              {activeTab === 'LEASE' ? (
                                 units.map(u => <option key={u.id} value={u.id}>{u.unitNumber}호 ({properties.find(p => p.id === u.propertyId)?.name})</option>)
                              ) : (
                                 properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                              )}
                           </select>
                        </div>
                        <div>
                           <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">{activeTab === 'LEASE' ? '임차인(Tenant) 선택' : '협력 업체(Vendor) 선택'}</label>
                           <select 
                              className="w-full border border-[#dadce0] p-4 rounded-xl font-black bg-white outline-none focus:ring-2 focus:ring-[#1a73e8]"
                              value={activeTab === 'LEASE' ? leaseForm.tenantId : activeTab === 'MAINTENANCE' ? maintForm.vendorId : ''}
                              onChange={e => {
                                 const val = e.target.value;
                                 if(activeTab === 'LEASE') setLeaseForm({...leaseForm, tenantId: val});
                                 else if(activeTab === 'MAINTENANCE') setMaintForm({...maintForm, vendorId: val});
                              }}
                           >
                              <option value="">당사자를 선택해 주세요</option>
                              {stakeholders.filter(s => activeTab === 'LEASE' ? s.roles.includes('TENANT') : s.roles.includes('VENDOR')).map(s => (
                                 <option key={s.id} value={s.id}>{s.name} ({s.representative || '담당자'})</option>
                              ))}
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* Specific Fields: Lease Finance */}
                  {activeTab === 'LEASE' && (
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-[#34a853] uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Coins size={16}/> 재무 조건 설정</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2">
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">보증금(Deposit)</label>
                              <input 
                                 className="w-full border border-[#dadce0] p-4 rounded-xl font-black text-xl text-[#1a73e8] bg-white"
                                 value={formatNumberInput(leaseForm.financialTerms?.[0]?.deposit)}
                                 onChange={e => {
                                    const val = parseNumberInput(e.target.value);
                                    const newTerms = [...leaseForm.financialTerms!];
                                    newTerms[0].deposit = val;
                                    setLeaseForm({...leaseForm, financialTerms: newTerms});
                                 }}
                              />
                           </div>
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">월 임대료</label>
                              <input 
                                 className="w-full border border-[#dadce0] p-4 rounded-xl font-black text-lg text-[#34a853] bg-white"
                                 value={formatNumberInput(leaseForm.financialTerms?.[0]?.monthlyRent)}
                                 onChange={e => {
                                    const val = parseNumberInput(e.target.value);
                                    const newTerms = [...leaseForm.financialTerms!];
                                    newTerms[0].monthlyRent = val;
                                    setLeaseForm({...leaseForm, financialTerms: newTerms});
                                 }}
                              />
                           </div>
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">월 관리비</label>
                              <input 
                                 className="w-full border border-[#dadce0] p-4 rounded-xl font-black text-lg bg-white"
                                 value={formatNumberInput(leaseForm.financialTerms?.[0]?.adminFee)}
                                 onChange={e => {
                                    const val = parseNumberInput(e.target.value);
                                    const newTerms = [...leaseForm.financialTerms!];
                                    newTerms[0].adminFee = val;
                                    setLeaseForm({...leaseForm, financialTerms: newTerms});
                                 }}
                              />
                           </div>
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">매월 납입일</label>
                              <input type="number" min="1" max="31" className="w-full border border-[#dadce0] p-4 rounded-xl font-black bg-white" value={leaseForm.financialTerms?.[0]?.paymentDay} onChange={e => {
                                 const val = Number(e.target.value);
                                 const newTerms = [...leaseForm.financialTerms!];
                                 newTerms[0].paymentDay = val;
                                 setLeaseForm({...leaseForm, financialTerms: newTerms});
                              }}/>
                           </div>
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">부가가치세</label>
                              <select className="w-full border border-[#dadce0] p-4 rounded-xl font-black bg-white" value={leaseForm.financialTerms?.[0]?.vatIncluded ? 'TRUE' : 'FALSE'} onChange={e => {
                                 const val = e.target.value === 'TRUE';
                                 const newTerms = [...leaseForm.financialTerms!];
                                 newTerms[0].vatIncluded = val;
                                 setLeaseForm({...leaseForm, financialTerms: newTerms});
                              }}>
                                 <option value="TRUE">VAT 포함</option>
                                 <option value="FALSE">VAT 별도</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Specific Fields: Maintenance */}
                  {activeTab === 'MAINTENANCE' && (
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-[#fbbc05] uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Clock size={16}/> 용역 기간 및 비용</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">용역 시작일</label>
                              <input type="date" className="w-full border border-[#dadce0] p-4 rounded-xl font-black" value={maintForm.term?.startDate} onChange={e => setMaintForm({...maintForm, term: {...maintForm.term!, startDate: e.target.value}})}/>
                           </div>
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">용역 종료일</label>
                              <input type="date" className="w-full border border-[#dadce0] p-4 rounded-xl font-black" value={maintForm.term?.endDate} onChange={e => setMaintForm({...maintForm, term: {...maintForm.term!, endDate: e.target.value}})}/>
                           </div>
                           <div className="col-span-2">
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">월 용역비(비용)</label>
                              <input 
                                 className="w-full border border-[#dadce0] p-4 rounded-xl font-black text-lg text-[#ea4335]"
                                 value={formatNumberInput(maintForm.monthlyCost)}
                                 onChange={e => setMaintForm({...maintForm, monthlyCost: parseNumberInput(e.target.value)})}
                              />
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Specific Fields: Utility */}
                  {activeTab === 'UTILITY' && (
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-[#34a853] uppercase tracking-widest border-b pb-2 flex items-center gap-2"><CreditCard size={16}/> 납부 및 고객 정보</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2">
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">공급사/기관명</label>
                              <input className="w-full border border-[#dadce0] p-4 rounded-xl font-black" value={utilForm.provider} onChange={e => setUtilForm({...utilForm, provider: e.target.value})} placeholder="예: 한국전력공사, 삼천리도시가스"/>
                           </div>
                           <div className="col-span-2">
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">고객번호/납부번호</label>
                              <input className="w-full border border-[#dadce0] p-4 rounded-xl font-black" value={utilForm.customerNumber} onChange={e => setUtilForm({...utilForm, customerNumber: e.target.value})} placeholder="납입 고지서상의 번호 입력"/>
                           </div>
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">정기 납부일</label>
                              <input type="number" className="w-full border border-[#dadce0] p-4 rounded-xl font-black" value={utilForm.paymentDay} onChange={e => setUtilForm({...utilForm, paymentDay: Number(e.target.value)})}/>
                           </div>
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">납부 방법</label>
                              <input className="w-full border border-[#dadce0] p-4 rounded-xl font-black" value={utilForm.paymentMethod} onChange={e => setUtilForm({...utilForm, paymentMethod: e.target.value})} placeholder="예: 법인카드, 자동이체"/>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Shared Date Section for Lease */}
                  {activeTab === 'LEASE' && (
                     <div className="col-span-1 md:col-span-2 bg-[#f8f9fa] p-8 rounded-2xl border border-[#dadce0] grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Calendar size={16} className="text-[#1a73e8]"/> 계약 라이프사이클 (Term)</div>
                        <div>
                           <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">계약 체결일</label>
                           <input type="date" className="w-full border border-[#dadce0] p-4 rounded-xl font-black bg-white" value={leaseForm.term?.contractDate} onChange={e => setLeaseForm({...leaseForm, term: {...leaseForm.term!, contractDate: e.target.value}})}/>
                        </div>
                        <div>
                           <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">임대 개시일</label>
                           <input type="date" className="w-full border border-[#dadce0] p-4 rounded-xl font-black bg-white" value={leaseForm.term?.startDate} onChange={e => setLeaseForm({...leaseForm, term: {...leaseForm.term!, startDate: e.target.value}})}/>
                        </div>
                        <div>
                           <label className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">임대 종료일</label>
                           <input type="date" className="w-full border border-[#dadce0] p-4 rounded-xl font-black bg-white" value={leaseForm.term?.endDate} onChange={e => setLeaseForm({...leaseForm, term: {...leaseForm.term!, endDate: e.target.value}})}/>
                        </div>
                     </div>
                  )}
               </div>

               <div className="flex gap-4 border-t border-gray-100 pt-10">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-2xl hover:bg-gray-50 transition-colors">취소 및 나가기</button>
                  <button onClick={handleSaveContract} className="flex-1 bg-[#1a73e8] text-white py-5 rounded-2xl font-black shadow-2xl hover:bg-[#1557b0] transition-all active:scale-95">신규 계약 확정 저장</button>
               </div>
            </div>
         </Modal>
      )}
    </div>
  );
};
