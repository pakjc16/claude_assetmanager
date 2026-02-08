
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Stakeholder, StakeholderRole, StakeholderType, LeaseContract, MaintenanceContract, Property, Unit, RelatedPerson, Department } from '../types';
import { User, Phone, Mail, Building, Briefcase, Plus, Search, X, FileText, AlertCircle, Upload, Paperclip, Lock, Key, Users, Edit2, Trash2, GitBranch, Download } from 'lucide-react';

interface StakeholderManagerProps {
  stakeholders: Stakeholder[];
  onAddStakeholder: (sh: Stakeholder) => void;
  onUpdateStakeholder: (sh: Stakeholder) => void;
  leaseContracts: LeaseContract[];
  maintenanceContracts: MaintenanceContract[];
  properties: Property[];
  units: Unit[];
  onUpdateProperty: (prop: Property) => void;
  onUpdateUnit: (unit: Unit) => void;
  formatMoney: (amount: number) => string;
  moneyLabel?: string;
}

export const StakeholderManager: React.FC<StakeholderManagerProps> = ({
  stakeholders, onAddStakeholder, onUpdateStakeholder, leaseContracts, maintenanceContracts, properties, units, onUpdateProperty, onUpdateUnit, formatMoney
}) => {
  const [filterRole, setFilterRole] = useState<StakeholderRole | 'ALL'>('ALL');
  const [filterPropertyId, setFilterPropertyId] = useState<string>('ALL'); // 자산 필터
  const [showIndividuals, setShowIndividuals] = useState(false); // 개인 표시 여부
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Stakeholder>>({
    name: '', type: 'INDIVIDUAL', roles: ['TENANT'], registrationNumber: '', businessRegistrationNumber: '', businessLicenseFile: '', contact: { phone: '', email: '', address: '' }, representative: ''
  });

  // Stage 3: 연관인물 및 조직도 편집 상태
  const [editingRelatedPerson, setEditingRelatedPerson] = useState<{personId: string; relationship: string} | null>(null);
  const [editingRelatedPersonIndex, setEditingRelatedPersonIndex] = useState<number | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Partial<Department> | null>(null);
  const [editingDepartmentIndex, setEditingDepartmentIndex] = useState<number | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const filtered = stakeholders.filter(s => {
    // 역할 필터
    const matchesRole = filterRole === 'ALL' || s.roles.includes(filterRole);

    // 검색어 필터
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.contact.phone.includes(searchTerm);

    // 개인 타입 필터 (체크박스 미선택 시 개인 제외)
    const matchesIndividualFilter = showIndividuals || s.type !== 'INDIVIDUAL';

    // 자산 필터
    let matchesProperty = true;
    if (filterPropertyId !== 'ALL') {
      const ownsProperty = properties.some(p => p.ownerId === s.id && p.id === filterPropertyId);
      const ownsLot = properties.some(p => p.lots.some(l => l.ownerId === s.id) && p.id === filterPropertyId);
      const ownsBuilding = properties.some(p => p.buildings.some(b => b.ownerId === s.id) && p.id === filterPropertyId);
      const ownsUnit = units.some(u => u.ownerId === s.id && u.propertyId === filterPropertyId);
      matchesProperty = ownsProperty || ownsLot || ownsBuilding || ownsUnit;
    }

    return matchesRole && matchesSearch && matchesIndividualFilter && matchesProperty;
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
    if ((formData.type === 'CORPORATE' || formData.type === 'SOLE_PROPRIETOR') && !formData.businessRegistrationNumber) return alert('법인/사업자의 경우 사업자등록번호는 필수입니다.');

    const person: Stakeholder = {
      id: selectedStakeholderId || `sh${Date.now()}`,
      name: formData.name!,
      type: formData.type as StakeholderType,
      roles: formData.roles as StakeholderRole[],
      registrationNumber: formData.registrationNumber || '',
      businessRegistrationNumber: formData.businessRegistrationNumber,
      businessLicenseFile: formData.businessLicenseFile,
      contact: formData.contact as any,
      representative: formData.representative,
      // Stage 2 fields
      companyId: formData.companyId,
      departmentId: formData.departmentId,
      isLeader: formData.isLeader,
      position: formData.position,
      jobTitle: formData.jobTitle,
      jobFunction: formData.jobFunction,
      bankAccounts: formData.bankAccounts,
      taxInvoiceAddress: formData.taxInvoiceAddress,
      memberIds: formData.memberIds,
      groupName: formData.groupName,
      // Stage 3 fields
      relatedPersons: formData.relatedPersons,
      departments: formData.departments
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

  // Stage 3: 연관인물 관리
  const handleAddRelatedPerson = () => {
    if (!editingRelatedPerson?.personId || !editingRelatedPerson?.relationship) {
      return alert('인물과 관계를 모두 입력하세요.');
    }
    const relatedPersons = formData.relatedPersons || [];
    if (editingRelatedPersonIndex !== null) {
      // 수정
      relatedPersons[editingRelatedPersonIndex] = editingRelatedPerson;
    } else {
      // 추가
      relatedPersons.push(editingRelatedPerson);
    }
    setFormData({...formData, relatedPersons});
    setEditingRelatedPerson(null);
    setEditingRelatedPersonIndex(null);
  };

  const handleDeleteRelatedPerson = (index: number) => {
    const relatedPersons = (formData.relatedPersons || []).filter((_, i) => i !== index);
    setFormData({...formData, relatedPersons});
  };

  // Stage 3: 조직도 관리
  const handleAddDepartment = () => {
    if (!editingDepartment?.name) {
      return alert('부서명을 입력하세요.');
    }
    const departments = formData.departments || [];
    const newDept: Department = {
      id: editingDepartmentIndex !== null ? departments[editingDepartmentIndex].id : `dept${Date.now()}`,
      name: editingDepartment.name,
      parentId: editingDepartment.parentId,
      employeeIds: editingDepartment.employeeIds || []
    };

    if (editingDepartmentIndex !== null) {
      // 수정
      departments[editingDepartmentIndex] = newDept;
    } else {
      // 추가
      departments.push(newDept);
    }
    setFormData({...formData, departments});
    setEditingDepartment(null);
    setEditingDepartmentIndex(null);
  };

  const handleDeleteDepartment = (index: number) => {
    const departments = (formData.departments || []).filter((_, i) => i !== index);
    setFormData({...formData, departments});
  };

  // Stage 3: CSV 대량 등록
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        return alert('CSV 파일이 비어있거나 형식이 올바르지 않습니다.');
      }

      // 헤더 검증 (선택사항)
      const headers = lines[0].split(',').map(h => h.trim());

      // 데이터 파싱
      const newStakeholders: Stakeholder[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 3) continue; // 최소 이름, 연락처, 역할 필요

        const [name, phone, roleStr, email = '', address = '', regNum = ''] = values;

        newStakeholders.push({
          id: `sh${Date.now()}_${i}`,
          name,
          type: formData.type as StakeholderType,
          roles: [roleStr as StakeholderRole || 'TENANT'],
          registrationNumber: regNum,
          contact: { phone, email, address }
        });
      }

      if (newStakeholders.length === 0) {
        return alert('유효한 데이터가 없습니다.');
      }

      if (confirm(`${newStakeholders.length}명의 인물/업체를 일괄 등록하시겠습니까?`)) {
        newStakeholders.forEach(sh => onAddStakeholder(sh));
        alert(`${newStakeholders.length}명이 등록되었습니다.`);
        setIsFormOpen(false);
      }
    };
    reader.readAsText(file);

    // 파일 입력 리셋
    if (csvInputRef.current) csvInputRef.current.value = '';
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
          <button
            onClick={() => csvInputRef.current?.click()}
            className="bg-white border-2 border-indigo-600 text-indigo-600 px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 hover:bg-indigo-50 shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            <Download size={14} className="md:w-4 md:h-4"/> CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />
        </div>
      </div>

      {/* 필터 컨트롤 */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-xs md:text-sm font-bold text-gray-600 whitespace-nowrap">자산 필터:</label>
          <select
            value={filterPropertyId}
            onChange={(e) => setFilterPropertyId(e.target.value)}
            className="flex-1 md:w-64 px-3 py-1.5 md:py-2 border border-gray-300 bg-white rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">전체 자산</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showIndividuals}
            onChange={(e) => setShowIndividuals(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs md:text-sm font-medium text-gray-700">조직구성 개인 표시</span>
        </label>
      </div>

      {isFormOpen && typeof document !== 'undefined' && createPortal(
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
             <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
             <h3 className="font-black text-xl mb-8 text-gray-900 border-b pb-4 flex items-center gap-3">
               <div className="p-2 bg-indigo-600 text-white rounded-lg">
                 {formData.type === 'CORPORATE' ? <Building size={20}/> : <User size={20}/>}
               </div>
               {selectedStakeholderId ? '정보 수정' : '인물/업체 등록'}
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:col-span-2">
                 <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-3">유형 선택</label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <button
                      onClick={() => setFormData({...formData, type: 'INDIVIDUAL'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'INDIVIDUAL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      개인
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'SOLE_PROPRIETOR'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'SOLE_PROPRIETOR' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      개인사업자
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'CORPORATE'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'CORPORATE' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      법인사업자
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'INTERNAL_ORG'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'INTERNAL_ORG' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      내부조직
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'CUSTOM_GROUP'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'CUSTOM_GROUP' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      임의그룹
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

               <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">
                    {formData.type === 'INDIVIDUAL' ? '성명' :
                     formData.type === 'SOLE_PROPRIETOR' ? '상호명' :
                     formData.type === 'CORPORATE' ? '법인명' :
                     formData.type === 'INTERNAL_ORG' ? '조직명' :
                     '그룹명'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder={
                      formData.type === 'INDIVIDUAL' ? '홍길동' :
                      formData.type === 'SOLE_PROPRIETOR' ? '길동상사' :
                      formData.type === 'CORPORATE' ? '(주)대한홀딩스' :
                      formData.type === 'INTERNAL_ORG' ? '영업부' :
                      '임의그룹 이름'
                    }
                  />
               </div>

               {/* 대표자명 (개인사업자, 법인사업자) */}
               {(formData.type === 'SOLE_PROPRIETOR' || formData.type === 'CORPORATE') && (
                 <div>
                   <label className="text-xs font-bold text-gray-400 block mb-1.5">대표자명</label>
                   <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.representative} onChange={e => setFormData({...formData, representative: e.target.value})} placeholder="홍길동" />
                 </div>
               )}

               {/* 주민등록번호 (개인만) */}
               {formData.type === 'INDIVIDUAL' && (
                 <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1.5 flex items-center gap-1.5"><Lock size={12}/> 주민등록번호 (민감정보)</label>
                    <input className="w-full border border-gray-200 bg-gray-50 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono" type="password" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="000000-0000000" />
                 </div>
               )}

               {/* 사업자등록번호, 법인등록번호 (개인사업자, 법인사업자) */}
               {(formData.type === 'SOLE_PROPRIETOR' || formData.type === 'CORPORATE') && (
                 <>
                   <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">사업자등록번호 <span className="text-red-500">*</span></label>
                      <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.businessRegistrationNumber} onChange={e => setFormData({...formData, businessRegistrationNumber: e.target.value})} placeholder="000-00-00000" />
                   </div>
                   {formData.type === 'CORPORATE' && (
                     <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1.5">법인등록번호</label>
                        <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="000000-0000000" />
                     </div>
                   )}
                 </>
               )}

               {/* 조직도 관리 (개인사업자, 법인사업자, 내부조직) */}
               {(formData.type === 'SOLE_PROPRIETOR' || formData.type === 'CORPORATE' || formData.type === 'INTERNAL_ORG') && (
                 <>
                   {/* 조직도 관리 */}
                   <div className="md:col-span-2 mt-4">
                     <div className="border-t border-gray-100 pt-4">
                       <label className="text-xs md:text-sm font-bold text-indigo-600 block mb-3 uppercase tracking-widest flex items-center gap-2">
                         <GitBranch size={14} /> 조직도 (부서 관리)
                       </label>

                       {/* 부서 추가 폼 */}
                       <div className="bg-indigo-50 p-3 rounded-lg mb-3 border border-indigo-100">
                         <div className="grid grid-cols-2 gap-2">
                           <input
                             className="border border-gray-200 bg-white p-2 rounded text-sm"
                             placeholder="부서명 (예: 영업부, 관리팀)"
                             value={editingDepartment?.name || ''}
                             onChange={e => setEditingDepartment({...editingDepartment, name: e.target.value})}
                           />
                           <select
                             className="border border-gray-200 bg-white p-2 rounded text-sm"
                             value={editingDepartment?.parentId || ''}
                             onChange={e => setEditingDepartment({...editingDepartment, parentId: e.target.value || undefined})}
                           >
                             <option value="">상위 부서 없음 (최상위)</option>
                             {(formData.departments || []).map(dept => (
                               <option key={dept.id} value={dept.id}>{dept.name}</option>
                             ))}
                           </select>
                         </div>
                         <button
                           type="button"
                           onClick={handleAddDepartment}
                           className="mt-2 text-[10px] md:text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-bold flex items-center gap-1"
                         >
                           <Plus size={12} />
                           {editingDepartmentIndex !== null ? '저장' : '추가'}
                         </button>
                       </div>

                       {/* 조직도 다이어그램 */}
                       {(formData.departments || []).length > 0 && (
                         <div className="border border-gray-200 rounded-lg p-2 md:p-4 bg-white">
                           <div className="w-full">
                             {(() => {
                               // 재귀적으로 부서 렌더링하는 함수
                               const renderDepartment = (dept: any, level: number = 0): JSX.Element => {
                                 const employees = stakeholders.filter(s =>
                                   s.type === 'INDIVIDUAL' &&
                                   s.companyId === selectedStakeholderId &&
                                   s.departmentId === dept.id
                                 );

                                 // 조직장과 구성원 분리
                                 const leaders = employees.filter(e => e.isLeader);
                                 const members = employees.filter(e => !e.isLeader);

                                 const deptIndex = (formData.departments || []).findIndex(d => d.id === dept.id);
                                 const childDepts = (formData.departments || []).filter(d => d.parentId === dept.id);

                                 // 레벨에 따른 색상 결정
                                 const bgColor = level === 0
                                   ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                                   : level === 1
                                   ? 'bg-blue-500'
                                   : 'bg-blue-400';
                                 const textSize = level === 0 ? 'text-xs md:text-sm' : 'text-[10px] md:text-xs';

                                 return (
                                   <div key={dept.id} className="flex flex-col items-center">
                                     {/* 부서 박스 */}
                                     <div className={`relative ${bgColor} text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm mb-1 group`}>
                                       <div className={`font-medium ${textSize} text-center whitespace-nowrap`}>{dept.name}</div>

                                       {/* 조직장 표시 (서브타이틀 형식) */}
                                       {leaders.length > 0 && (
                                         <div className="text-[9px] md:text-[10px] text-white/90 mt-0.5 text-center">
                                           {leaders.map((leader, idx) => (
                                             <button
                                               key={leader.id}
                                               type="button"
                                               onClick={() => handleOpenEdit(leader)}
                                               className="hover:underline cursor-pointer"
                                             >
                                               {leader.jobTitle && `${leader.jobTitle} `}
                                               {leader.name}
                                               {idx < leaders.length - 1 && ', '}
                                             </button>
                                           ))}
                                         </div>
                                       )}

                                       <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                         <button
                                           type="button"
                                           onClick={() => {
                                             setEditingDepartment(dept);
                                             setEditingDepartmentIndex(deptIndex);
                                           }}
                                           className="p-0.5 bg-white rounded text-blue-600 hover:bg-gray-100"
                                         >
                                           <Edit2 size={8} />
                                         </button>
                                         <button
                                           type="button"
                                           onClick={() => handleDeleteDepartment(deptIndex)}
                                           className="p-0.5 bg-white rounded text-red-600 hover:bg-red-50"
                                         >
                                           <Trash2 size={8} />
                                         </button>
                                       </div>
                                       {/* 하단 연결선 */}
                                       {(childDepts.length > 0 || members.length > 0) && (
                                         <div className="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-1 md:h-1.5 bg-gray-300"></div>
                                       )}
                                     </div>

                                     {/* 하위 부서들 또는 직원들 */}
                                     {(childDepts.length > 0 || employees.length > 0) && (
                                       <div className="flex flex-col items-center">
                                         {/* 수평 연결선 */}
                                         {childDepts.length > 1 && (
                                           <div className="relative w-full h-2 md:h-3 mb-1">
                                             <div
                                               className="absolute top-0 bg-gray-300"
                                               style={{
                                                 left: `${(100 / childDepts.length / 2)}%`,
                                                 right: `${(100 / childDepts.length / 2)}%`,
                                                 height: '2px'
                                               }}
                                             ></div>
                                             {childDepts.map((_, idx) => (
                                               <div
                                                 key={idx}
                                                 className="absolute top-0 w-0.5 h-2 md:h-3 bg-gray-300"
                                                 style={{
                                                   left: `${((idx + 0.5) * 100 / childDepts.length)}%`,
                                                   transform: 'translateX(-50%)'
                                                 }}
                                               ></div>
                                             ))}
                                           </div>
                                         )}
                                         {childDepts.length === 1 && (
                                           <div className="w-0.5 h-2 md:h-3 bg-gray-300 mb-1"></div>
                                         )}

                                         {/* 하위 부서들 재귀 렌더링 */}
                                         {childDepts.length > 0 && (
                                           <div className="flex gap-1 md:gap-2 flex-wrap justify-center">
                                             {childDepts.map(child => renderDepartment(child, level + 1))}
                                           </div>
                                         )}

                                         {/* 구성원들 (하위 부서가 없을 때만) */}
                                         {childDepts.length === 0 && members.length > 0 && (
                                           <div className="flex flex-col gap-0.5 mt-1">
                                             {members.map((member) => (
                                               <button
                                                 key={member.id}
                                                 type="button"
                                                 onClick={() => handleOpenEdit(member)}
                                                 className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300 text-[9px] md:text-[10px] transition-colors cursor-pointer text-left"
                                               >
                                                 <div className="font-medium text-gray-800">
                                                   {member.position && `${member.position} `}
                                                   {member.name}
                                                 </div>
                                               </button>
                                             ))}
                                           </div>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 );
                               };

                               // 최상위 부서 찾기
                               const topDepts = (formData.departments || []).filter(d => !d.parentId);

                               return (
                                 <div className="flex flex-col items-center gap-2 md:gap-3">
                                   {/* 최상위 레벨부터 재귀적으로 렌더링 */}
                                   {topDepts.length > 0 && (
                                     <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
                                       {topDepts.map(dept => renderDepartment(dept, 0))}
                                     </div>
                                   )}
                                 </div>
                               );
                             })()}
                           </div>
                         </div>
                       )}
                       <p className="text-xs text-gray-500 mt-2">
                         💡 부서별 직원 배치는 <strong>개인</strong> 타입 인물 등록 시 "소속부서" 필드에서 설정할 수 있습니다.
                       </p>
                     </div>
                   </div>
                 </>
               )}

               <div className="md:col-span-2 border-t border-gray-100 my-2"></div>
               
               <div><label className="text-xs font-bold text-gray-400 block mb-1.5">연락처 (대표 번호)</label><input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.contact?.phone} onChange={e => setFormData({...formData, contact: {...formData.contact!, phone: e.target.value}})} placeholder="010-0000-0000" /></div>
               <div><label className="text-xs font-bold text-gray-400 block mb-1.5">대표 이메일</label><input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.contact?.email} onChange={e => setFormData({...formData, contact: {...formData.contact!, email: e.target.value}})} placeholder="info@company.com" /></div>

               {/* 등록 주소지 (다음 주소검색) */}
               <div className="md:col-span-2">
                 <label className="text-xs font-bold text-gray-400 block mb-1.5">등록 주소지</label>
                 <div className="flex gap-2">
                   <input
                     className="flex-1 border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                     value={formData.contact?.address}
                     onChange={e => setFormData({...formData, contact: {...formData.contact!, phone: formData.contact?.phone || '', email: formData.contact?.email || '', address: e.target.value}})}
                     placeholder="주소 입력 또는 검색"
                   />
                   <button
                     type="button"
                     onClick={() => {
                       // 다음 주소검색 API 호출
                       const script = document.createElement('script');
                       script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
                       script.onload = () => {
                         new (window as any).daum.Postcode({
                           oncomplete: (data: any) => {
                             const fullAddr = data.roadAddress || data.jibunAddress;
                             setFormData({...formData, contact: {...formData.contact!, phone: formData.contact?.phone || '', email: formData.contact?.email || '', address: fullAddr}});
                           }
                         }).open();
                       };
                       if (!(window as any).daum?.Postcode) {
                         document.head.appendChild(script);
                       } else {
                         new (window as any).daum.Postcode({
                           oncomplete: (data: any) => {
                             const fullAddr = data.roadAddress || data.jibunAddress;
                             setFormData({...formData, contact: {...formData.contact!, phone: formData.contact?.phone || '', email: formData.contact?.email || '', address: fullAddr}});
                           }
                         }).open();
                       }
                     }}
                     className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm whitespace-nowrap"
                   >
                     <Search size={16} />
                   </button>
                 </div>
               </div>

               {/* 개인용 추가 필드 */}
               {formData.type === 'INDIVIDUAL' && (
                 <>
                   <div className="md:col-span-2 border-t border-gray-100 my-2"></div>

                   {/* 소속회사 */}
                   <div>
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">소속회사</label>
                     <select
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.companyId || ''}
                       onChange={e => setFormData({...formData, companyId: e.target.value || undefined, departmentId: undefined})}
                     >
                       <option value="">선택 안함</option>
                       {stakeholders
                         .filter(s => s.type === 'SOLE_PROPRIETOR' || s.type === 'CORPORATE')
                         .map(s => (
                           <option key={s.id} value={s.id}>{s.name}</option>
                         ))
                       }
                     </select>
                   </div>

                   {/* 소속부서 */}
                   <div>
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">소속부서</label>
                     <select
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.departmentId || ''}
                       onChange={e => setFormData({...formData, departmentId: e.target.value || undefined})}
                       disabled={!formData.companyId}
                     >
                       <option value="">선택 안함</option>
                       {formData.companyId && (() => {
                         const company = stakeholders.find(s => s.id === formData.companyId);
                         return (company?.departments || []).map(dept => (
                           <option key={dept.id} value={dept.id}>{dept.name}</option>
                         ));
                       })()}
                     </select>
                   </div>

                   {/* 조직장 여부 */}
                   {formData.departmentId && (
                     <div className="md:col-span-2">
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input
                           type="checkbox"
                           checked={formData.isLeader || false}
                           onChange={e => setFormData({...formData, isLeader: e.target.checked})}
                           className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                         />
                         <span className="text-sm font-medium text-gray-700">이 부서의 조직장입니다</span>
                       </label>
                     </div>
                   )}

                   {/* 직급 */}
                   <div>
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">직급</label>
                     <input
                       list="position-options"
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.position || ''}
                       onChange={e => setFormData({...formData, position: e.target.value})}
                       placeholder="직급 선택 또는 입력"
                     />
                     <datalist id="position-options">
                       <option value="대표이사" />
                       <option value="부사장" />
                       <option value="전무이사" />
                       <option value="전무" />
                       <option value="상무이사" />
                       <option value="상무" />
                       <option value="상무보" />
                       <option value="이사" />
                       <option value="부장" />
                       <option value="차장" />
                       <option value="과장" />
                       <option value="대리" />
                       <option value="주임" />
                       <option value="사원" />
                     </datalist>
                   </div>

                   {/* 직책 */}
                   <div>
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">직책</label>
                     <input
                       list="jobtitle-options"
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.jobTitle || ''}
                       onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                       placeholder="직책 선택 또는 입력"
                     />
                     <datalist id="jobtitle-options">
                       <option value="CEO" />
                       <option value="CFO" />
                       <option value="COO" />
                       <option value="CTO" />
                       <option value="대외이사" />
                       <option value="본부장" />
                       <option value="실장" />
                       <option value="임원" />
                       <option value="팀장" />
                       <option value="파트장" />
                     </datalist>
                   </div>

                   {/* 직무 */}
                   <div>
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">직무</label>
                     <input
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.jobFunction || ''}
                       onChange={e => setFormData({...formData, jobFunction: e.target.value})}
                       placeholder="예: 회계, 영업, 마케팅, 개발"
                     />
                   </div>

                   {/* 연관인물 테이블 */}
                   <div className="md:col-span-2 mt-4">
                     <div className="border-t border-gray-100 pt-4">
                       <label className="text-xs md:text-sm font-bold text-indigo-600 block mb-3 uppercase tracking-widest flex items-center gap-2">
                         <Users size={14} /> 연관인물 관리
                       </label>

                       {/* 연관인물 추가 폼 */}
                       <div className="bg-indigo-50 p-3 rounded-lg mb-3 border border-indigo-100">
                         <div className="grid grid-cols-2 gap-2">
                           <select
                             className="border border-gray-200 bg-white p-2 rounded text-xs md:text-sm"
                             value={editingRelatedPerson?.personId || ''}
                             onChange={e => setEditingRelatedPerson({...editingRelatedPerson, personId: e.target.value, relationship: editingRelatedPerson?.relationship || ''})}
                           >
                             <option value="">인물 선택</option>
                             {stakeholders
                               .filter(s => s.type === 'INDIVIDUAL' && s.id !== selectedStakeholderId)
                               .map(s => (
                                 <option key={s.id} value={s.id}>{s.name}</option>
                               ))
                             }
                           </select>
                           <input
                             className="border border-gray-200 bg-white p-2 rounded text-xs md:text-sm"
                             placeholder="관계 (예: 배우자, 가족, 동업자)"
                             value={editingRelatedPerson?.relationship || ''}
                             onChange={e => setEditingRelatedPerson({...editingRelatedPerson, personId: editingRelatedPerson?.personId || '', relationship: e.target.value})}
                           />
                         </div>
                         <button
                           type="button"
                           onClick={handleAddRelatedPerson}
                           className="mt-2 text-[10px] md:text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-bold flex items-center gap-1"
                         >
                           <Plus size={12} />
                           {editingRelatedPersonIndex !== null ? '저장' : '추가'}
                         </button>
                       </div>

                       {/* 연관인물 목록 */}
                       {(formData.relatedPersons || []).length > 0 && (
                         <div className="border border-gray-200 rounded-lg overflow-hidden">
                           <table className="w-full text-sm">
                             <thead className="bg-gray-50">
                               <tr>
                                 <th className="p-2 text-left font-bold text-gray-600 text-xs">이름</th>
                                 <th className="p-2 text-left font-bold text-gray-600 text-xs">관계</th>
                                 <th className="p-2 text-center font-bold text-gray-600 text-xs w-20">작업</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                               {(formData.relatedPersons || []).map((rp, idx) => {
                                 const person = stakeholders.find(s => s.id === rp.personId);
                                 return (
                                   <tr key={idx} className="hover:bg-gray-50">
                                     <td className="p-2 font-medium text-gray-800">{person?.name || '알 수 없음'}</td>
                                     <td className="p-2 text-gray-600">{rp.relationship}</td>
                                     <td className="p-2 text-center">
                                       <div className="flex gap-1 justify-center">
                                         <button
                                           type="button"
                                           onClick={() => {
                                             setEditingRelatedPerson(rp);
                                             setEditingRelatedPersonIndex(idx);
                                           }}
                                           className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                         >
                                           <Edit2 size={12} />
                                         </button>
                                         <button
                                           type="button"
                                           onClick={() => handleDeleteRelatedPerson(idx)}
                                           className="p-1 text-red-600 hover:bg-red-50 rounded"
                                         >
                                           <Trash2 size={12} />
                                         </button>
                                       </div>
                                     </td>
                                   </tr>
                                 );
                               })}
                             </tbody>
                           </table>
                         </div>
                       )}
                     </div>
                   </div>
                 </>
               )}

               {/* 내부조직용 필드 */}
               {formData.type === 'INTERNAL_ORG' && (
                 <>
                   <div className="md:col-span-2 border-t border-gray-100 my-2"></div>

                   {/* 소속회사 */}
                   <div>
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">소속회사</label>
                     <select
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.companyId || ''}
                       onChange={e => setFormData({...formData, companyId: e.target.value || undefined})}
                     >
                       <option value="">선택 안함</option>
                       {stakeholders
                         .filter(s => s.type === 'SOLE_PROPRIETOR' || s.type === 'CORPORATE')
                         .map(s => (
                           <option key={s.id} value={s.id}>{s.name}</option>
                         ))
                       }
                     </select>
                   </div>
                 </>
               )}

               {/* 임의그룹용 필드 */}
               {formData.type === 'CUSTOM_GROUP' && (
                 <>
                   <div className="md:col-span-2 border-t border-gray-100 my-2"></div>

                   <div className="md:col-span-2">
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">그룹 구성원 (복수 선택 가능)</label>
                     <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
                       {stakeholders.filter(s => s.type !== 'CUSTOM_GROUP').map(s => (
                         <label key={s.id} className="flex items-center gap-2 py-1 hover:bg-white px-2 rounded cursor-pointer">
                           <input
                             type="checkbox"
                             checked={formData.memberIds?.includes(s.id) || false}
                             onChange={e => {
                               const memberIds = formData.memberIds || [];
                               if (e.target.checked) {
                                 setFormData({...formData, memberIds: [...memberIds, s.id]});
                               } else {
                                 setFormData({...formData, memberIds: memberIds.filter(id => id !== s.id)});
                               }
                             }}
                             className="rounded"
                           />
                           <span className="text-sm">{s.name} ({s.type === 'INDIVIDUAL' ? '개인' : s.type === 'SOLE_PROPRIETOR' ? '개인사업자' : s.type === 'CORPORATE' ? '법인사업자' : '내부조직'})</span>
                         </label>
                       ))}
                     </div>
                   </div>
                 </>
               )}

               {/* 계좌정보 (개인사업자, 법인사업자만) */}
               {(formData.type === 'SOLE_PROPRIETOR' || formData.type === 'CORPORATE') && (
                 <>
                   <div className="md:col-span-2 border-t border-gray-100 my-4"></div>

                   <div className="md:col-span-2">
                     <label className="text-xs font-bold text-gray-400 block mb-2">계좌정보</label>
                     <div className="space-y-2">
                       {(formData.bankAccounts || []).map((account, idx) => (
                         <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                           <input
                             className="flex-1 border border-gray-200 bg-white p-2 rounded text-sm"
                             placeholder="은행명"
                             value={account.bankName}
                             onChange={e => {
                               const updated = [...(formData.bankAccounts || [])];
                               updated[idx] = {...account, bankName: e.target.value};
                               setFormData({...formData, bankAccounts: updated});
                             }}
                           />
                           <input
                             className="flex-1 border border-gray-200 bg-white p-2 rounded text-sm"
                             placeholder="계좌번호"
                             value={account.accountNumber}
                             onChange={e => {
                               const updated = [...(formData.bankAccounts || [])];
                               updated[idx] = {...account, accountNumber: e.target.value};
                               setFormData({...formData, bankAccounts: updated});
                             }}
                           />
                           <input
                             className="flex-1 border border-gray-200 bg-white p-2 rounded text-sm"
                             placeholder="예금주"
                             value={account.accountHolder}
                             onChange={e => {
                               const updated = [...(formData.bankAccounts || [])];
                               updated[idx] = {...account, accountHolder: e.target.value};
                               setFormData({...formData, bankAccounts: updated});
                             }}
                           />
                           <button
                             type="button"
                             onClick={() => {
                               const updated = (formData.bankAccounts || []).filter((_, i) => i !== idx);
                               setFormData({...formData, bankAccounts: updated});
                             }}
                             className="p-2 text-red-500 hover:bg-red-50 rounded"
                           >
                             <X size={16} />
                           </button>
                         </div>
                       ))}
                       <button
                         type="button"
                         onClick={() => {
                           setFormData({...formData, bankAccounts: [...(formData.bankAccounts || []), {bankName: '', accountNumber: '', accountHolder: ''}]});
                         }}
                         className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                       >
                         <Plus size={14} /> 계좌 추가
                       </button>
                     </div>
                   </div>

                   {/* 세금계산서 발행주소 */}
                   <div className="md:col-span-2">
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">세금계산서 발행주소</label>
                     <input
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.taxInvoiceAddress || ''}
                       onChange={e => setFormData({...formData, taxInvoiceAddress: e.target.value})}
                       placeholder="세금계산서 수신 이메일 또는 주소"
                     />
                   </div>
                 </>
               )}
             </div>

             {/* 소유 자산 섹션 (임대인만 표시) */}
             {formData.roles?.includes('LANDLORD') && selectedStakeholderId && (() => {
               const ownedProperties = properties.filter(p => p.ownerId === selectedStakeholderId);
               const ownedLots = properties.flatMap(p => p.lots.filter(l => l.ownerId === selectedStakeholderId));
               const ownedBuildings = properties.flatMap(p => p.buildings.filter(b => b.ownerId === selectedStakeholderId));
               const ownedUnits = units.filter(u => u.ownerId === selectedStakeholderId);
               const hasAssets = ownedProperties.length > 0 || ownedLots.length > 0 || ownedBuildings.length > 0 || ownedUnits.length > 0;

               return (
                 <div className="mt-6 border-t border-gray-100 pt-6">
                   <h4 className="text-sm font-black text-indigo-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                     <Key size={16} /> 소유 자산
                   </h4>
                   {hasAssets ? (
                     <div className="space-y-3">
                       {ownedProperties.length > 0 && (
                         <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                           <p className="text-xs font-bold text-blue-700 mb-2">물건 ({ownedProperties.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedProperties.map(p => (
                               <span key={p.id} className="px-2 py-1 bg-white text-blue-700 text-xs font-medium rounded border border-blue-200">
                                 {p.name}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                       {ownedLots.length > 0 && (
                         <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                           <p className="text-xs font-bold text-green-700 mb-2">토지 ({ownedLots.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedLots.map(l => (
                               <span key={l.id} className="px-2 py-1 bg-white text-green-700 text-xs font-medium rounded border border-green-200">
                                 {l.address.bonbun}{l.address.bubun ? `-${l.address.bubun}` : ''}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                       {ownedBuildings.length > 0 && (
                         <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                           <p className="text-xs font-bold text-purple-700 mb-2">건물 ({ownedBuildings.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedBuildings.map(b => (
                               <span key={b.id} className="px-2 py-1 bg-white text-purple-700 text-xs font-medium rounded border border-purple-200">
                                 {b.name}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                       {ownedUnits.length > 0 && (
                         <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                           <p className="text-xs font-bold text-orange-700 mb-2">호실 ({ownedUnits.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedUnits.slice(0, 10).map(u => (
                               <span key={u.id} className="px-2 py-1 bg-white text-orange-700 text-xs font-medium rounded border border-orange-200">
                                 {u.unitNumber}호
                               </span>
                             ))}
                             {ownedUnits.length > 10 && (
                               <span className="px-2 py-1 bg-white text-orange-700 text-xs font-bold rounded border border-orange-200">
                                 +{ownedUnits.length - 10}
                               </span>
                             )}
                           </div>
                         </div>
                       )}
                       <p className="text-xs text-gray-500 mt-2">
                         💡 자산 소유자는 <strong>자산 관리</strong> 메뉴에서 물건/토지/건물/호실 등록 시 설정할 수 있습니다.
                       </p>
                     </div>
                   ) : (
                     <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-200 text-center">
                       <p className="text-sm text-gray-400">소유한 자산이 없습니다</p>
                       <p className="text-xs text-gray-400 mt-1">자산 관리 메뉴에서 소유자를 지정하세요</p>
                     </div>
                   )}
                 </div>
               );
             })()}

             <div className="mt-10 flex justify-end gap-3">
               <button onClick={() => setIsFormOpen(false)} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-bold transition-all">취소</button>
               <button onClick={handleSave} className="bg-indigo-600 text-white px-12 py-3 rounded-xl hover:bg-indigo-700 font-bold shadow-lg transition-all active:scale-95">
                 저장
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
