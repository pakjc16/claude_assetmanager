
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Stakeholder, StakeholderRole, StakeholderType, LeaseContract, MaintenanceContract } from '../types';
import { User, Phone, Mail, Building, Briefcase, Plus, Search, X, FileText, AlertCircle, Upload, Paperclip, Lock } from 'lucide-react';

interface StakeholderManagerProps {
  stakeholders: Stakeholder[];
  onAddStakeholder: (sh: Stakeholder) => void;
  onUpdateStakeholder: (sh: Stakeholder) => void;
  leaseContracts: LeaseContract[];
  maintenanceContracts: MaintenanceContract[];
  formatMoney: (amount: number) => string;
  moneyLabel?: string;
}

export const StakeholderManager: React.FC<StakeholderManagerProps> = ({ 
  stakeholders, onAddStakeholder, onUpdateStakeholder, leaseContracts, maintenanceContracts, formatMoney 
}) => {
  const [filterRole, setFilterRole] = useState<StakeholderRole | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Stakeholder>>({
    name: '', type: 'INDIVIDUAL', roles: ['TENANT'], registrationNumber: '', businessRegistrationNumber: '', businessLicenseFile: '', contact: { phone: '', email: '', address: '' }, representative: ''
  });

  const filtered = stakeholders.filter(s => {
    const matchesRole = filterRole === 'ALL' || s.roles.includes(filterRole);
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.contact.phone.includes(searchTerm);
    return matchesRole && matchesSearch;
  });

  const handleOpenAdd = () => {
    setSelectedStakeholderId(null);
    setFormData({ name: '', type: 'INDIVIDUAL', roles: ['TENANT'], registrationNumber: '', businessRegistrationNumber: '', businessLicenseFile: '', contact: { phone: '', email: '', address: '' }, representative: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sh: Stakeholder) => {
    setSelectedStakeholderId(sh.id);
    setFormData({ ...sh });
    setIsFormOpen(true);
  };

  const handleOpenHistory = (id: string) => {
    setSelectedStakeholderId(id);
    setIsHistoryOpen(true);
  };
  
  const handleSave = () => {
    if (!formData.name || !formData.contact?.phone) return alert('이름과 연락처는 필수입니다.');
    if (formData.type === 'CORPORATE' && !formData.businessRegistrationNumber) return alert('법인/사업자의 경우 사업자등록번호는 필수입니다.');
    
    const person: Stakeholder = {
      id: selectedStakeholderId || `sh${Date.now()}`,
      name: formData.name!,
      type: formData.type as StakeholderType,
      roles: formData.roles as StakeholderRole[],
      registrationNumber: formData.registrationNumber || '',
      businessRegistrationNumber: formData.businessRegistrationNumber,
      businessLicenseFile: formData.businessLicenseFile,
      contact: formData.contact as any,
      representative: formData.representative
    };

    if (selectedStakeholderId) {
      onUpdateStakeholder(person);
    } else {
      onAddStakeholder(person);
    }
    setIsFormOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, businessLicenseFile: e.target.files[0].name });
    }
  };

  const getStakeholderContracts = (shId: string) => {
    const leases = leaseContracts.filter(c => c.tenantId === shId);
    const maintenances = maintenanceContracts.filter(c => c.vendorId === shId);
    return { leases, maintenances };
  };

  const getRoleBadge = (role: StakeholderRole) => {
    switch (role) {
      case 'TENANT': return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] rounded-full font-black uppercase">임차인</span>;
      case 'LANDLORD': return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 text-[10px] rounded-full font-black uppercase">임대인</span>;
      case 'MANAGER': return <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 text-[10px] rounded-full font-black uppercase">관리인</span>;
      case 'VENDOR': return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 text-[10px] rounded-full font-black uppercase">용역업체</span>;
      case 'SAFETY_OFFICER': return <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 text-[10px] rounded-full font-black uppercase">안전관리</span>;
      default: return null;
    }
  };

  const selectedStakeholderForHistory = stakeholders.find(s => s.id === selectedStakeholderId);
  const historyData = selectedStakeholderId ? getStakeholderContracts(selectedStakeholderId) : { leases: [], maintenances: [] };

  const getActiveTerm = (c: LeaseContract) => {
      const today = new Date(); today.setHours(0,0,0,0);
      const activeTerm = c.financialTerms.find(t => { const start = new Date(t.startDate); const end = new Date(t.endDate); return today >= start && today <= end; });
      if(activeTerm) return activeTerm;
      const terms = [...c.financialTerms].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      return terms[0] || { deposit: 0, monthlyRent: 0 };
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <h2 className="text-base md:text-xl font-bold text-gray-800">인물/업체 관리</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 md:left-3 top-2 md:top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="이름, 연락처 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-[11px] md:text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-medium"
            />
          </div>
          <button onClick={handleOpenAdd} className="bg-indigo-600 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 hover:bg-indigo-700 shadow-md transition-all active:scale-95 whitespace-nowrap">
            <Plus size={14} className="md:w-4 md:h-4"/> 등록
          </button>
        </div>
      </div>

      {isFormOpen && typeof document !== 'undefined' && createPortal(
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
             <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
             <h3 className="font-black text-xl mb-8 text-gray-900 border-b pb-4 flex items-center gap-3">
               <div className="p-2 bg-indigo-600 text-white rounded-lg">
                 {formData.type === 'CORPORATE' ? <Building size={20}/> : <User size={20}/>}
               </div>
               {selectedStakeholderId ? '정보 수정' : '신규 이해관계자 등록'}
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">당사자 구분</label>
                   <div className="flex gap-2">
                      <button onClick={() => setFormData({...formData, type: 'INDIVIDUAL'})} className={`flex-1 py-2.5 text-sm rounded-lg border transition-all font-black flex items-center justify-center gap-2 ${formData.type === 'INDIVIDUAL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-gray-400 border-gray-200'}`}>
                         개인
                      </button>
                      <button onClick={() => setFormData({...formData, type: 'CORPORATE'})} className={`flex-1 py-2.5 text-sm rounded-lg border transition-all font-black flex items-center justify-center gap-2 ${formData.type === 'CORPORATE' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-gray-400 border-gray-200'}`}>
                         법인/사업자
                      </button>
                   </div>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">주요 역할</label>
                   <select className="w-full border border-gray-200 bg-white text-gray-900 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.roles?.[0]} onChange={e => setFormData({...formData, roles: [e.target.value as StakeholderRole]})}>
                     <option value="TENANT">임차인</option>
                     <option value="LANDLORD">임대인</option>
                     <option value="MANAGER">관리인/PM</option>
                     <option value="VENDOR">용역/유지보수업체</option>
                     <option value="SAFETY_OFFICER">안전관리책임자</option>
                   </select>
                 </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">{formData.type === 'CORPORATE' ? '법인명(상호)' : '성명'}</label>
                  <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={formData.type === 'CORPORATE' ? '(주)대한홀딩스' : '이름 입력'} />
               </div>
               
               {formData.type === 'CORPORATE' && (
                 <div><label className="text-xs font-bold text-gray-400 block mb-1.5">대표자명</label><input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.representative} onChange={e => setFormData({...formData, representative: e.target.value})} /></div>
               )}

               {formData.type === 'INDIVIDUAL' ? (
                 <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1.5 flex items-center gap-1.5"><Lock size={12}/> 주민등록번호 (민감정보)</label>
                    <input className="w-full border border-gray-200 bg-gray-50 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono" type="password" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="000000-0000000" />
                 </div>
               ) : (
                 <>
                   <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">사업자등록번호 <span className="text-red-500">*</span></label>
                      <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.businessRegistrationNumber} onChange={e => setFormData({...formData, businessRegistrationNumber: e.target.value})} placeholder="000-00-00000" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">법인등록번호</label>
                      <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="000000-0000000" />
                   </div>
                 </>
               )}

               <div className="md:col-span-2 border-t border-gray-100 my-2"></div>
               
               <div><label className="text-xs font-bold text-gray-400 block mb-1.5">연락처 (대표 번호)</label><input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.contact?.phone} onChange={e => setFormData({...formData, contact: {...formData.contact!, phone: e.target.value}})} placeholder="010-0000-0000" /></div>
               <div><label className="text-xs font-bold text-gray-400 block mb-1.5">대표 이메일</label><input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.contact?.email} onChange={e => setFormData({...formData, contact: {...formData.contact!, email: e.target.value}})} placeholder="info@company.com" /></div>
               <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 block mb-1.5">등록 주소지</label><input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.contact?.address} onChange={e => setFormData({...formData, contact: {...formData.contact!, address: e.target.value}})} /></div>
             </div>

             <div className="mt-10 flex justify-end gap-3">
               <button onClick={() => setIsFormOpen(false)} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-bold transition-all">취소</button>
               <button onClick={handleSave} className="bg-indigo-600 text-white px-12 py-3 rounded-xl hover:bg-indigo-700 font-bold shadow-lg transition-all active:scale-95">
                 {selectedStakeholderId ? '수정 내용 저장' : '이해관계자 등록'}
               </button>
             </div>
           </div>
         </div>,
         document.body
      )}

      {/* History Modal remains similar */}
      {isHistoryOpen && selectedStakeholderForHistory && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl relative max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="font-black text-xl text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><FileText size={20}/></div>
                  통합 계약 거래 이력
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  당사자: <span className="font-bold text-gray-900 underline">{selectedStakeholderForHistory.name}</span>
                </p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-white border border-gray-200 rounded-full text-gray-400 hover:bg-gray-100 transition-colors shadow-sm"><X size={20}/></button>
            </div>
            <div className="p-8 overflow-y-auto bg-white rounded-b-2xl flex-1">
              {historyData.leases.length === 0 && historyData.maintenances.length === 0 ? (
                <div className="text-center py-20 text-gray-300 italic">연결된 계약 정보가 존재하지 않습니다.</div>
              ) : (
                <div className="space-y-10">
                  {historyData.leases.length > 0 && (
                    <div>
                      <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div> 임대차 계약 리스트</h4>
                      <div className="overflow-hidden border border-gray-100 rounded-xl shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 text-[11px] uppercase">
                            <tr><th className="p-4">계약기간</th><th className="p-4">유형</th><th className="p-4 text-right">보증금/월세</th><th className="p-4 text-center">상태</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {historyData.leases.map(lease => {
                              const activeTerm = getActiveTerm(lease);
                              return (
                              <tr key={lease.id} className="hover:bg-gray-50/50">
                                <td className="p-4 font-bold text-gray-800">{lease.term.startDate} ~ {lease.term.endDate}</td>
                                <td className="p-4"><span className="px-2 py-1 bg-gray-100 text-[10px] font-bold rounded-md uppercase">{lease.type.split('_').join(' ')}</span></td>
                                <td className="p-4 font-black text-right text-indigo-700">{formatMoney(activeTerm.deposit)} / {formatMoney(activeTerm.monthlyRent)}</td>
                                <td className="p-4 text-center">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${lease.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {lease.status === 'ACTIVE' ? '정상' : '종료'}
                                  </span>
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {historyData.maintenances.length > 0 && (
                    <div>
                      <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div> 유지보수 및 용역 내역</h4>
                      <div className="overflow-hidden border border-gray-100 rounded-xl shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 text-[11px] uppercase">
                            <tr><th className="p-4">용역 기간</th><th className="p-4">서비스 유형</th><th className="p-4 text-right">월 비용</th><th className="p-4 text-center">상태</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {historyData.maintenances.map(mc => (
                              <tr key={mc.id} className="hover:bg-gray-50/50">
                                <td className="p-4 font-bold text-gray-800">{mc.term.startDate} ~ {mc.term.endDate}</td>
                                <td className="p-4 font-bold text-gray-600">{mc.serviceType}</td>
                                <td className="p-4 font-black text-right text-orange-700">{formatMoney(mc.monthlyCost)}</td>
                                <td className="p-4 text-center"><span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">진행중</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Tabs */}
      <div className="flex bg-white rounded-lg md:rounded-xl border border-gray-200 p-0.5 md:p-1 w-fit shadow-sm overflow-x-auto">
        {[
          { id: 'ALL', label: '전체' }, { id: 'TENANT', label: '임차인' }, { id: 'LANDLORD', label: '임대인' }, { id: 'MANAGER', label: '관리자' }, { id: 'VENDOR', label: '업체' },
        ].map(tab => (
           <button key={tab.id} onClick={() => setFilterRole(tab.id as any)} className={`px-3 md:px-6 py-1.5 md:py-2 text-[10px] md:text-xs font-black rounded-md md:rounded-lg transition-all whitespace-nowrap ${filterRole === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{tab.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
        {filtered.map(person => (
          <div key={person.id} className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-3 md:mb-5">
              <div className="flex items-center gap-2 md:gap-4">
                 <div className={`w-10 md:w-12 h-10 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg font-black border-2 ${
                   person.type === 'CORPORATE' ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-inner'
                 }`}>
                   {person.type === 'CORPORATE' ? <Building size={18} className="md:w-[22px] md:h-[22px]"/> : <User size={18} className="md:w-[22px] md:h-[22px]"/>}
                 </div>
                 <div>
                   <h3 className="font-black text-gray-900 text-sm md:text-lg leading-tight truncate max-w-[120px] md:max-w-none">{person.name}</h3>
                   <div className="flex flex-wrap gap-1 md:gap-1.5 mt-1 md:mt-1.5">{person.roles.map(r => <span key={r}>{getRoleBadge(r)}</span>)}</div>
                 </div>
              </div>
              {person.businessLicenseFile && (
                <div className="p-1.5 md:p-2 bg-gray-50 rounded-lg text-gray-400" title="사업자등록증 보유">
                   <Paperclip size={14} className="md:w-4 md:h-4"/>
                </div>
              )}
            </div>

            <div className="space-y-2 md:space-y-3 mt-auto text-[10px] md:text-xs text-gray-600 bg-gray-50/70 p-2.5 md:p-4 rounded-lg md:rounded-xl border border-gray-100">
              {person.type === 'CORPORATE' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Briefcase size={12} className="md:w-3.5 md:h-3.5 text-gray-400"/>
                    <span className="font-bold text-gray-700" title="사업자등록번호">{person.businessRegistrationNumber || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building size={12} className="md:w-3.5 md:h-3.5 text-gray-400"/>
                    <span className="font-medium text-gray-500 text-[9px] md:text-[10px] font-mono" title="법인등록번호">{person.registrationNumber}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 bg-white py-1 md:py-1.5 px-2 md:px-2.5 rounded-lg border border-indigo-100/50 shadow-sm">
                   <Lock size={10} className="md:w-3 md:h-3 text-indigo-400"/>
                   <span className="font-black text-indigo-400 uppercase tracking-tighter text-[8px] md:text-[10px]">개인정보 보호됨</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-0.5 md:pt-1">
                <Phone size={12} className="md:w-3.5 md:h-3.5 text-gray-400"/>
                <a href={`tel:${person.contact.phone}`} className="font-bold text-indigo-600 hover:underline">{person.contact.phone}</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} className="md:w-3.5 md:h-3.5 text-gray-400"/>
                <a href={`mailto:${person.contact.email}`} className="truncate hover:text-indigo-600 hover:underline font-medium text-[9px] md:text-xs">{person.contact.email}</a>
              </div>
            </div>

            <div className="mt-3 md:mt-6 pt-0 flex gap-1.5 md:gap-2">
              <button onClick={() => handleOpenEdit(person)} className="flex-1 py-2 md:py-2.5 text-[9px] md:text-[11px] font-black border border-gray-200 rounded-lg md:rounded-xl text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition-all active:scale-95">수정</button>
              <button onClick={() => handleOpenHistory(person.id)} className="flex-1 py-2 md:py-2.5 text-[9px] md:text-[11px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg md:rounded-xl hover:bg-indigo-100 shadow-sm transition-all active:scale-95">이력</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full py-12 md:py-20 text-center text-gray-400 italic text-xs md:text-sm">검색 결과가 없습니다.</div>}
      </div>
    </div>
  );
};
