
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Stakeholder, StakeholderRole, StakeholderType, LeaseContract, MaintenanceContract, Property, Unit, RelatedPerson, Department } from '../types';
import { User, Phone, Mail, Building, Briefcase, Plus, Search, X, FileText, AlertCircle, Upload, Paperclip, Lock, Key, Users, Edit2, Trash2, GitBranch, Download, DollarSign, ZoomIn, ZoomOut, Maximize2, Printer } from 'lucide-react';

interface StakeholderManagerProps {
  stakeholders: Stakeholder[];
  onAddStakeholder: (sh: Stakeholder) => void;
  onUpdateStakeholder: (sh: Stakeholder) => void;
  onDeleteStakeholder?: (id: string) => void;
  leaseContracts: LeaseContract[];
  maintenanceContracts: MaintenanceContract[];
  properties: Property[];
  units: Unit[];
  onUpdateProperty: (prop: Property) => void;
  onUpdateUnit: (unit: Unit) => void;
  formatMoney: (amount: number) => string;
  moneyLabel?: string;
  referenceDate?: string;
}

export const StakeholderManager: React.FC<StakeholderManagerProps> = ({
  stakeholders, onAddStakeholder, onUpdateStakeholder, onDeleteStakeholder, leaseContracts, maintenanceContracts, properties, units, onUpdateProperty, onUpdateUnit, formatMoney, referenceDate
}) => {
  const [filterRole, setFilterRole] = useState<StakeholderRole | 'ALL'>('ALL');
  const [filterPropertyId, setFilterPropertyId] = useState<string>('ALL'); // 자산 필터
  const [showIndividuals, setShowIndividuals] = useState(false); // 개인 표시 여부
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isOrgChartModalOpen, setIsOrgChartModalOpen] = useState(false);
  const [viewStakeholderId, setViewStakeholderId] = useState<string | null>(null);
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string | null>(null);
  const [orgChartStakeholderId, setOrgChartStakeholderId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
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

  // 조직도 줌/팬 상태
  const [orgChartZoom, setOrgChartZoom] = useState(1);
  const [orgChartPan, setOrgChartPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const orgChartContainerRef = useRef<HTMLDivElement>(null);

  // 우편라벨 인쇄 함수
  const handlePrintPostalLabels = () => {
    const targets = stakeholders.filter(s => checkedIds.has(s.id) && s.contact?.address);
    if (targets.length === 0) {
      alert('주소가 등록된 항목을 선택하세요.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert('팝업이 차단되었습니다.'); return; }

    // 우편번호 5자리를 개별 박스로 렌더링
    const postalBoxes = (code: string) => {
      const digits = (code || '     ').padEnd(5, ' ').split('');
      return `<div class="postal-row">
        ${digits.map(d => `<div class="postal-box">${d.trim()}</div>`).join('')}
      </div>`;
    };

    // 라벨 1개 HTML (105mm × 48mm, A4 2열 5행 = 10개)
    // 한국 우편 표준: 이름 먼저, 주소, 우편번호 박스 맨 아래
    const labelHtml = (s: typeof targets[0]) => `
      <div class="label">
        <div class="label-inner">
          <div class="to-tag">받　는　분</div>
          <div class="name">${s.name} <span class="kijoong">귀 중</span></div>
          <div class="addr">${s.contact.address || ''}${s.contact.addressDetail ? ' ' + s.contact.addressDetail : ''}</div>
          ${s.contact.phone ? `<div class="phone">☎ ${s.contact.phone}</div>` : ''}
          <div class="postal-area">
            ${postalBoxes(s.contact.postalCode || '')}
            <div class="postal-label">우편번호</div>
          </div>
        </div>
      </div>`;

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>우편 라벨</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; background: #fff; }
      .page { width: 210mm; margin: 0 auto; padding: 8mm; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
      .label { width: 100%; height: 48mm; border: 1px solid #555; page-break-inside: avoid; }
      .label-inner { padding: 3mm 5mm; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
      .to-tag { font-size: 7pt; color: #888; border-bottom: 1px dotted #ccc; padding-bottom: 1mm; margin-bottom: 1.5mm; }
      .name { font-size: 15pt; font-weight: 900; letter-spacing: 1px; line-height: 1.2; }
      .kijoong { font-size: 10pt; font-weight: normal; margin-left: 3mm; }
      .addr { font-size: 9pt; line-height: 1.6; color: #222; word-break: keep-all; margin-top: 1mm; flex: 1; }
      .phone { font-size: 8pt; color: #555; margin-top: 1mm; }
      .postal-area { display: flex; align-items: center; gap: 3mm; margin-top: 2mm; border-top: 1px dotted #ccc; padding-top: 1.5mm; }
      .postal-row { display: flex; gap: 1mm; }
      .postal-box { width: 6mm; height: 6mm; border: 1.5px solid #c00; display: flex; align-items: center; justify-content: center; font-size: 10pt; font-weight: bold; font-family: monospace; color: #c00; }
      .postal-label { font-size: 7pt; color: #888; }
      @media print {
        body { margin: 0; }
        .page { padding: 6mm; }
        .label { border: 1px solid #333; }
        .postal-box { border-color: #c00; }
      }
    </style></head><body>
    <div class="page"><div class="grid">
    ${targets.map(s => labelHtml(s)).join('')}
    </div></div>
    <script>window.onload=function(){ window.print(); window.onafterprint=function(){ window.close(); }; };<\/script>
    </body></html>`);
    printWindow.document.close();
  };

  // 조직도 인쇄 함수
  const handlePrintOrgChart = () => {
    if (!formData.departments || formData.departments.length === 0) {
      alert('인쇄할 조직도가 없습니다.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      return;
    }

    // 재귀적으로 부서 HTML 생성
    const renderDeptHTML = (dept: any, level: number = 0): string => {
      const employees = stakeholders.filter(s =>
        s.type === 'INDIVIDUAL' &&
        s.companyId === selectedStakeholderId &&
        s.departmentId === dept.id
      );
      const leaders = employees.filter(e => e.isLeader);
      const members = employees.filter(e => !e.isLeader);
      const childDepts = (formData.departments || []).filter((d: any) => d.parentId === dept.id);
      const bgColor = level === 0 ? '#1a73e8' : level === 1 ? '#4a90d9' : '#7baaf0';

      let html = `<div style="display: flex; flex-direction: column; align-items: center; min-width: 110px;">`;
      html += `<div style="background: ${bgColor}; color: white; padding: 10px 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; min-width: 90px;">`;
      html += `<div style="font-weight: 600; font-size: 13px; white-space: nowrap; text-align: center;">${dept.name}</div>`;
      if (leaders.length > 0) {
        html += `<div style="font-size: 11px; opacity: 0.9; margin-top: 4px; text-align: center;">`;
        html += leaders.map(l => `${l.jobTitle || ''} ${l.name}`.trim()).join(', ');
        html += `</div>`;
      }
      html += `</div>`;

      if (childDepts.length > 0 || members.length > 0) {
        html += `<div style="width: 2px; height: 16px; background: #ccc; margin: 0;"></div>`;
        html += `<div style="display: flex; flex-direction: column; align-items: center; width: 100%;">`;

        if (childDepts.length > 1) {
          html += `<div style="position: relative; width: ${childDepts.length * 110}px; height: 16px; margin-bottom: 4px;">`;
          html += `<div style="position: absolute; top: 0; left: 55px; right: 55px; height: 2px; background: #ccc;"></div>`;
          childDepts.forEach((_: any, idx: number) => {
            html += `<div style="position: absolute; top: 0; left: ${55 + idx * 110}px; width: 2px; height: 16px; background: #ccc;"></div>`;
          });
          html += `</div>`;
        } else if (childDepts.length === 1) {
          html += `<div style="width: 2px; height: 16px; background: #ccc; margin-bottom: 4px;"></div>`;
        }

        if (childDepts.length > 0) {
          html += `<div style="display: grid; grid-template-columns: repeat(${childDepts.length}, 110px); gap: 8px;">`;
          childDepts.forEach((child: any) => {
            html += renderDeptHTML(child, level + 1);
          });
          html += `</div>`;
        }

        if (childDepts.length === 0 && members.length > 0) {
          html += `<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">`;
          members.forEach(m => {
            html += `<div style="background: #f5f5f5; border: 1px solid #ddd; padding: 6px 12px; border-radius: 6px; font-size: 11px; white-space: nowrap;">`;
            html += `${m.position || ''} ${m.name}`.trim();
            html += `</div>`;
          });
          html += `</div>`;
        }

        html += `</div>`;
      }

      html += `</div>`;
      return html;
    };

    const topDepts = (formData.departments || []).filter((d: any) => !d.parentId);
    let orgChartHTML = `<div style="display: flex; gap: 16px; justify-content: center;">`;
    topDepts.forEach((dept: any) => {
      orgChartHTML += renderDeptHTML(dept, 0);
    });
    orgChartHTML += `</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>조직도 - ${formData.name || '조직도'}</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 30px;
            color: #202124;
            text-align: center;
          }
          .org-chart {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            width: 100%;
          }
          @media print {
            body { padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <h1>${formData.name || '조직도'}</h1>
        <div class="org-chart">
          ${orgChartHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
          window.onafterprint = function() {
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 한국 전화번호 자동 포맷팅
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/[^0-9]/g, '');
    // 휴대폰: 010-0000-0000
    if (digits.startsWith('010') || digits.startsWith('011') || digits.startsWith('016') || digits.startsWith('017') || digits.startsWith('018') || digits.startsWith('019')) {
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }
    // 서울: 02-000-0000 또는 02-0000-0000
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(digits.length - 4)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    }
    // 지역번호 3자리: 031-000-0000 ~ 064-000-0000
    if (digits.length >= 3 && /^0[3-6][0-9]/.test(digits)) {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(digits.length - 4)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }
    // 대표번호: 1588-0000, 1544-0000 등
    if (/^1[0-9]{3}/.test(digits)) {
      if (digits.length <= 4) return digits;
      return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
    }
    // 그 외: 그냥 반환
    return value;
  };

  // 전화번호 유형 판별
  const getPhoneType = (phone: string): string => {
    const digits = phone.replace(/[^0-9]/g, '');
    if (/^01[016789]/.test(digits)) return '휴대폰';
    if (digits.startsWith('02')) return '서울';
    if (/^0[3-6][0-9]/.test(digits)) return '지역';
    if (/^1[0-9]{3}/.test(digits)) return '대표';
    if (/^070/.test(digits)) return '인터넷';
    if (/^050/.test(digits)) return '안심';
    return '기타';
  };

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

  const handleOpenView = (sh: Stakeholder) => {
    setViewStakeholderId(sh.id);
    setIsViewModalOpen(true);
  };

  const handleToggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (checkedIds.size === filtered.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map(s => s.id)));
    }
  };

  const handleBulkDelete = () => {
    if (checkedIds.size === 0) return;
    if (!confirm(`선택한 ${checkedIds.size}건을 삭제하시겠습니까?`)) return;
    if (onDeleteStakeholder) {
      checkedIds.forEach(id => onDeleteStakeholder(id));
    }
    setCheckedIds(new Set());
  };

  const handleOpenHistory = (id: string) => {
    setSelectedStakeholderId(id);
    setIsHistoryOpen(true);
  };
  
  const handleSave = () => {
    if (!formData.name || !formData.contact?.phone || !formData.contact?.email) return alert('이름, 연락처, 대표 이메일은 필수입니다.');
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
      departments: formData.departments,
      additionalContacts: formData.additionalContacts
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
    const leases = leaseContracts.filter(c => c.tenantIds.includes(shId) || c.landlordIds.includes(shId));
    const maintenances = maintenanceContracts.filter(c => c.vendorId === shId);
    return { leases, maintenances };
  };

  const badgeBase = "inline-flex items-center justify-center px-2 text-[10px] rounded font-bold border h-5 align-middle";
  const getRoleBadge = (role: StakeholderRole, key?: string) => {
    switch (role) {
      case 'TENANT': return <span key={key} className={`${badgeBase} bg-[#e8f0fe] text-[#1a73e8] border-[#c5d9f7]`}>임차인</span>;
      case 'LANDLORD': return <span key={key} className={`${badgeBase} bg-[#e8f0fe] text-[#1a73e8] border-[#c5d9f7]`}>임대인</span>;
      case 'MANAGER': return <span key={key} className={`${badgeBase} bg-[#e8f0fe] text-[#1a73e8] border-[#c5d9f7]`}>관리인</span>;
      case 'VENDOR': return <span key={key} className={`${badgeBase} bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]`}>용역업체</span>;
      case 'SAFETY_OFFICER': return <span key={key} className={`${badgeBase} bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]`}>안전관리</span>;
      default: return null;
    }
  };

  const selectedStakeholderForHistory = stakeholders.find(s => s.id === selectedStakeholderId);
  const historyData = selectedStakeholderId ? getStakeholderContracts(selectedStakeholderId) : { leases: [], maintenances: [] };

  const getActiveTerm = (c: LeaseContract) => {
      const refDate = referenceDate ? new Date(referenceDate + 'T00:00:00') : new Date(); refDate.setHours(0,0,0,0);
      const activeTerm = c.terms.find(t => { const start = new Date(t.startDate); const end = new Date(t.endDate); return refDate >= start && refDate <= end; });
      if(activeTerm) return activeTerm;
      const sorted = [...c.terms].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      return sorted[0] || { deposit: 0, monthlyRent: 0 };
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
              className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-[11px] md:text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none shadow-sm font-medium"
            />
          </div>
          <button onClick={handleOpenAdd} className="bg-[#1a73e8] text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 hover:bg-[#1557b0] shadow-md transition-all active:scale-95 whitespace-nowrap">
            <Plus size={14} className="md:w-4 md:h-4"/> 등록
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            className="bg-white border-2 border-[#1a73e8] text-[#1a73e8] px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 hover:bg-[#f1f3f4] shadow-md transition-all active:scale-95 whitespace-nowrap"
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
            className="flex-1 md:w-64 px-3 py-1.5 md:py-2 border border-gray-300 bg-white rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
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
            className="w-4 h-4 text-[#1a73e8] rounded focus:ring-2 focus:ring-[#1a73e8]"
          />
          <span className="text-xs md:text-sm font-medium text-gray-700">조직구성 개인 표시</span>
        </label>
      </div>

      {isFormOpen && typeof document !== 'undefined' && createPortal(
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl relative overflow-hidden animate-in zoom-in-95">
           <div className="max-h-[90vh] overflow-y-auto p-8">
             <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
             <h3 className="font-black text-xl mb-8 text-gray-900 border-b pb-4 flex items-center gap-3">
               <div className="p-2 bg-[#1a73e8] text-white rounded-lg">
                 {formData.type === 'CORPORATE' ? <Building size={20}/> : <User size={20}/>}
               </div>
               {selectedStakeholderId ? '정보 수정' : '인물/업체 등록'}
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:col-span-2">
                 <label className="text-[10px] font-black text-[#1a73e8] uppercase tracking-widest block mb-3">유형 선택</label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <button
                      onClick={() => setFormData({...formData, type: 'INDIVIDUAL'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'INDIVIDUAL' ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-[#dadce0]'}`}
                    >
                      개인
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'SOLE_PROPRIETOR'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'SOLE_PROPRIETOR' ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-[#dadce0]'}`}
                    >
                      개인사업자
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'CORPORATE'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'CORPORATE' ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-[#dadce0]'}`}
                    >
                      법인사업자
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'INTERNAL_ORG'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'INTERNAL_ORG' ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-[#dadce0]'}`}
                    >
                      내부조직
                    </button>
                    <button
                      onClick={() => setFormData({...formData, type: 'CUSTOM_GROUP'})}
                      className={`py-2.5 px-2 text-xs rounded-lg border transition-all font-black ${formData.type === 'CUSTOM_GROUP' ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-[#dadce0]'}`}
                    >
                      임의그룹
                    </button>
                 </div>
              </div>

              <div>
                 <label className="text-[10px] font-black text-[#1a73e8] uppercase tracking-widest block mb-2">관계</label>
                 <select className="w-full border border-gray-200 bg-white text-gray-900 p-2.5 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none font-bold" value={formData.roles?.[0]} onChange={e => setFormData({...formData, roles: [e.target.value as StakeholderRole]})}>
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
                    className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none font-bold"
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
                   <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none font-bold" value={formData.representative} onChange={e => setFormData({...formData, representative: e.target.value})} placeholder="홍길동" />
                 </div>
               )}

               {/* 주민등록번호 (개인만) */}
               {formData.type === 'INDIVIDUAL' && (
                 <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1.5 flex items-center gap-1.5"><Lock size={12}/> 주민등록번호 (민감정보)</label>
                    <input className="w-full border border-gray-200 bg-gray-50 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none font-mono" type="password" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="000000-0000000" />
                 </div>
               )}

               {/* 사업자등록번호, 법인등록번호 (개인사업자, 법인사업자) */}
               {(formData.type === 'SOLE_PROPRIETOR' || formData.type === 'CORPORATE') && (
                 <>
                   <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">사업자등록번호 <span className="text-red-500">*</span></label>
                      <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none font-bold" value={formData.businessRegistrationNumber} onChange={e => setFormData({...formData, businessRegistrationNumber: e.target.value})} placeholder="000-00-00000" />
                   </div>
                   {formData.type === 'CORPORATE' && (
                     <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1.5">법인등록번호</label>
                        <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none font-bold" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="000000-0000000" />
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
                       <label className="text-xs md:text-sm font-bold text-[#1a73e8] block mb-3 uppercase tracking-widest flex items-center gap-2">
                         <GitBranch size={14} /> 조직도 (부서 관리)
                       </label>

                       {/* 부서 추가 폼 */}
                       <div className="bg-[#e8f0fe] p-3 rounded-lg mb-3 border border-[#dadce0]">
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
                           className="mt-2 text-[10px] md:text-xs bg-[#1a73e8] text-white px-3 py-1.5 rounded hover:bg-[#1557b0] font-bold flex items-center gap-1"
                         >
                           <Plus size={12} />
                           {editingDepartmentIndex !== null ? '저장' : '추가'}
                         </button>
                       </div>

                       {/* 조직도 다이어그램 */}
                       {(formData.departments || []).length > 0 && (
                         <div className="border border-gray-200 rounded-lg bg-white">
                           {/* 줌/팬 컨트롤 버튼 */}
                           <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
                             <div className="text-xs font-bold text-gray-600">조직도</div>
                             <div className="flex items-center gap-2">
                               <button
                                 type="button"
                                 onClick={handlePrintOrgChart}
                                 className="px-2 py-1.5 bg-[#1a73e8] text-white rounded hover:bg-[#1557b0] text-xs font-bold flex items-center gap-1"
                                 title="조직도 인쇄"
                               >
                                 <FileText size={14} />
                                 <span className="hidden md:inline">인쇄</span>
                               </button>
                               <div className="border-l border-gray-300 h-6"></div>
                               <button
                                 type="button"
                                 onClick={() => setOrgChartZoom(prev => Math.min(prev + 0.1, 2))}
                                 className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                                 title="확대"
                               >
                                 <ZoomIn size={14} />
                               </button>
                               <button
                                 type="button"
                                 onClick={() => setOrgChartZoom(prev => Math.max(prev - 0.1, 0.3))}
                                 className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                                 title="축소"
                               >
                                 <ZoomOut size={14} />
                               </button>
                               <button
                                 type="button"
                                 onClick={() => {
                                   setOrgChartZoom(1);
                                   setOrgChartPan({ x: 0, y: 0 });
                                 }}
                                 className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                                 title="리셋"
                               >
                                 <Maximize2 size={14} />
                               </button>
                               <div className="text-xs text-gray-500 ml-2 bg-white px-2 py-1 rounded border border-gray-300 font-mono">
                                 {Math.round(orgChartZoom * 100)}%
                               </div>
                             </div>
                           </div>

                           {/* 조직도 컨테이너 (줌/팬 가능) */}
                           <div
                             ref={orgChartContainerRef}
                             className="w-full h-[400px] overflow-hidden relative bg-white cursor-grab active:cursor-grabbing"
                             onMouseDown={(e) => {
                               setIsDragging(true);
                               setDragStart({ x: e.clientX - orgChartPan.x, y: e.clientY - orgChartPan.y });
                             }}
                             onMouseMove={(e) => {
                               if (isDragging) {
                                 setOrgChartPan({
                                   x: e.clientX - dragStart.x,
                                   y: e.clientY - dragStart.y
                                 });
                               }
                             }}
                             onMouseUp={() => setIsDragging(false)}
                             onMouseLeave={() => setIsDragging(false)}
                             onWheel={(e) => {
                               e.preventDefault();
                               const delta = e.deltaY > 0 ? -0.05 : 0.05;
                               setOrgChartZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
                             }}
                           >
                             <div
                               style={{
                                 transform: `translate(${orgChartPan.x}px, ${orgChartPan.y}px) scale(${orgChartZoom})`,
                                 transformOrigin: 'center center',
                                 transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                 width: '100%',
                                 minHeight: '100%',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 padding: '20px'
                               }}
                             >
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
                                   ? 'bg-[#1a73e8]'
                                   : level === 1
                                   ? 'bg-[#4a90d9]'
                                   : 'bg-[#7baaf0]';
                                 const textSize = level === 0 ? 'text-xs md:text-sm' : 'text-[10px] md:text-xs';

                                 return (
                                   <div key={dept.id} className="flex flex-col items-center" style={{ minWidth: '100px' }}>
                                     {/* 부서 박스 */}
                                     <div className={`relative ${bgColor} text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm mb-1 group min-w-[80px]`}>
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
                                           className="p-0.5 bg-white rounded text-[#1a73e8] hover:bg-gray-100"
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
                                       <div className="flex flex-col items-center" style={{ width: '100%' }}>
                                         {/* 수평 연결선 */}
                                         {childDepts.length > 1 && (
                                           <div className="relative mb-1" style={{ width: `${childDepts.length * 110}px`, height: '12px' }}>
                                             <div
                                               className="absolute bg-gray-300"
                                               style={{
                                                 top: '0',
                                                 left: '55px',
                                                 right: '55px',
                                                 height: '2px'
                                               }}
                                             ></div>
                                             {childDepts.map((_, idx) => (
                                               <div
                                                 key={idx}
                                                 className="absolute bg-gray-300"
                                                 style={{
                                                   top: '0',
                                                   left: `${55 + idx * 110}px`,
                                                   width: '2px',
                                                   height: '12px'
                                                 }}
                                               ></div>
                                             ))}
                                           </div>
                                         )}
                                         {childDepts.length === 1 && (
                                           <div className="w-0.5 h-2 md:h-3 bg-gray-300 mb-1"></div>
                                         )}

                                         {/* 하위 부서들 재귀 렌더링 - Grid 레이아웃 */}
                                         {childDepts.length > 0 && (
                                           <div
                                             style={{
                                               display: 'grid',
                                               gridTemplateColumns: `repeat(${childDepts.length}, 110px)`,
                                               gap: '8px'
                                             }}
                                           >
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
                                     <div className="flex justify-center gap-2 md:gap-3">
                                       {topDepts.map(dept => renderDepartment(dept, 0))}
                                     </div>
                                   )}
                                 </div>
                               );
                             })()}
                             </div>
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
               
               <div>
                 <label className="text-xs font-bold text-gray-400 block mb-1.5">연락처 (대표 번호) <span className="text-red-500">*</span></label>
                 <div className="relative">
                   <input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none font-bold" value={formData.contact?.phone} onChange={e => setFormData({...formData, contact: {...formData.contact!, phone: formatPhoneNumber(e.target.value)}})} placeholder="010-0000-0000" maxLength={15} />
                   {formData.contact?.phone && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#5f6368] bg-[#e8f0fe] px-1.5 py-0.5 rounded">{getPhoneType(formData.contact.phone)}</span>}
                 </div>
               </div>
               <div><label className="text-xs font-bold text-gray-400 block mb-1.5">대표 이메일 <span className="text-red-500">*</span></label><input className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none" type="email" value={formData.contact?.email} onChange={e => setFormData({...formData, contact: {...formData.contact!, email: e.target.value}})} placeholder="info@company.com" /></div>

               {/* 추가 연락처 */}
               <div className="md:col-span-2">
                 <label className="text-xs font-bold text-gray-400 block mb-2">추가 연락처</label>
                 <div className="space-y-2">
                   {(formData.additionalContacts || []).map((ac, idx) => (
                     <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
                       <input
                         className="w-24 border border-gray-200 bg-white p-2 rounded text-sm font-bold"
                         placeholder="구분"
                         value={ac.label}
                         onChange={e => {
                           const updated = [...(formData.additionalContacts || [])];
                           updated[idx] = {...ac, label: e.target.value};
                           setFormData({...formData, additionalContacts: updated});
                         }}
                         list="contact-label-options"
                       />
                       <div className="relative flex-1">
                         <input
                           className="w-full border border-gray-200 bg-white p-2 rounded text-sm font-bold"
                           placeholder="010-0000-0000"
                           value={ac.phone}
                           onChange={e => {
                             const updated = [...(formData.additionalContacts || [])];
                             updated[idx] = {...ac, phone: formatPhoneNumber(e.target.value)};
                             setFormData({...formData, additionalContacts: updated});
                           }}
                           maxLength={15}
                         />
                         {ac.phone && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-[#5f6368] bg-[#e8f0fe] px-1 py-0.5 rounded">{getPhoneType(ac.phone)}</span>}
                       </div>
                       <button type="button" onClick={() => { const updated = (formData.additionalContacts || []).filter((_, i) => i !== idx); setFormData({...formData, additionalContacts: updated}); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
                     </div>
                   ))}
                   <button type="button" onClick={() => setFormData({...formData, additionalContacts: [...(formData.additionalContacts || []), {label: '', phone: ''}]})} className="text-sm text-[#1a73e8] hover:text-[#1a73e8] font-medium flex items-center gap-1">
                     <Plus size={14} /> 연락처 추가
                   </button>
                 </div>
                 <datalist id="contact-label-options">
                   <option value="사무실" />
                   <option value="팩스" />
                   <option value="자택" />
                   <option value="비상연락처" />
                   <option value="담당자" />
                 </datalist>
               </div>

               {/* 등록 주소지 (다음 주소검색) */}
               <div className="md:col-span-2">
                 <label className="text-xs font-bold text-gray-400 block mb-1.5">등록 주소지</label>
                 <div className="flex gap-2">
                   <input
                     className="flex-1 border border-gray-200 bg-gray-50 text-gray-900 p-3 rounded-lg outline-none"
                     value={formData.contact?.address || ''}
                     readOnly
                     placeholder="주소 검색 버튼을 눌러주세요"
                   />
                   <button
                     type="button"
                     onClick={() => {
                       const openPostcode = () => {
                         new (window as any).daum.Postcode({
                           oncomplete: (data: any) => {
                             const fullAddr = data.roadAddress || data.jibunAddress;
                             setFormData(prev => ({...prev, contact: {...prev.contact!, phone: prev.contact?.phone || '', email: prev.contact?.email || '', address: fullAddr, addressDetail: '', postalCode: data.zonecode || ''}}));
                           }
                         }).open();
                       };
                       if (!(window as any).daum?.Postcode) {
                         const script = document.createElement('script');
                         script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
                         script.onload = () => openPostcode();
                         document.head.appendChild(script);
                       } else {
                         openPostcode();
                       }
                     }}
                     className="px-4 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] font-bold text-sm whitespace-nowrap"
                   >
                     <Search size={16} />
                   </button>
                 </div>
                 {formData.contact?.address && (
                   <div className="mt-2 space-y-2">
                     {formData.contact?.postalCode && (
                       <div className="flex items-center gap-2">
                         <span className="text-xs text-gray-400 font-bold whitespace-nowrap">우편번호</span>
                         <span className="text-sm font-bold text-[#1a73e8] tracking-widest">{formData.contact.postalCode}</span>
                       </div>
                     )}
                     <input
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
                       value={formData.contact?.addressDetail || ''}
                       onChange={e => setFormData({...formData, contact: {...formData.contact!, addressDetail: e.target.value}})}
                       placeholder="상세주소 입력 (동/호수 등)"
                       autoFocus
                     />
                   </div>
                 )}
               </div>

               {/* 개인용 추가 필드 */}
               {formData.type === 'INDIVIDUAL' && (
                 <>
                   <div className="md:col-span-2 border-t border-gray-100 my-2"></div>

                   {/* 소속회사 */}
                   <div>
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">소속회사</label>
                     <select
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
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
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
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
                           className="w-4 h-4 text-[#1a73e8] rounded focus:ring-2 focus:ring-[#1a73e8]"
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
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
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
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
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
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
                       value={formData.jobFunction || ''}
                       onChange={e => setFormData({...formData, jobFunction: e.target.value})}
                       placeholder="예: 회계, 영업, 마케팅, 개발"
                     />
                   </div>

                   {/* 연관인물 테이블 */}
                   <div className="md:col-span-2 mt-4">
                     <div className="border-t border-gray-100 pt-4">
                       <label className="text-xs md:text-sm font-bold text-[#1a73e8] block mb-3 uppercase tracking-widest flex items-center gap-2">
                         <Users size={14} /> 연관인물 관리
                       </label>

                       {/* 연관인물 추가 폼 */}
                       <div className="bg-[#e8f0fe] p-3 rounded-lg mb-3 border border-[#dadce0]">
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
                           className="mt-2 text-[10px] md:text-xs bg-[#1a73e8] text-white px-3 py-1.5 rounded hover:bg-[#1557b0] font-bold flex items-center gap-1"
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
                                           className="p-1 text-[#1a73e8] hover:bg-[#f1f3f4] rounded"
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
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
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
                         className="text-sm text-[#1a73e8] hover:text-[#1a73e8] font-medium flex items-center gap-1"
                       >
                         <Plus size={14} /> 계좌 추가
                       </button>
                     </div>
                   </div>

                   {/* 세금계산서 발행주소 */}
                   <div className="md:col-span-2">
                     <label className="text-xs font-bold text-gray-400 block mb-1.5">세금계산서 발행주소</label>
                     <input
                       className="w-full border border-gray-200 bg-white text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-[#1a73e8] outline-none"
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
                   <h4 className="text-sm font-black text-[#1a73e8] mb-4 uppercase tracking-widest flex items-center gap-2">
                     <Key size={16} /> 소유 자산
                   </h4>
                   {hasAssets ? (
                     <div className="space-y-3">
                       {ownedProperties.length > 0 && (
                         <div className="bg-[#e8f0fe] p-3 rounded-lg border border-[#c5d9f7]">
                           <p className="text-xs font-bold text-[#1a73e8] mb-2">물건 ({ownedProperties.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedProperties.map(p => (
                               <span key={p.id} className="px-2 py-1 bg-white text-[#1a73e8] text-xs font-medium rounded border border-blue-200">
                                 {p.name}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                       {ownedLots.length > 0 && (
                         <div className="bg-[#f1f3f4] p-3 rounded-lg border border-[#dadce0]">
                           <p className="text-xs font-bold text-[#1a73e8] mb-2">토지 ({ownedLots.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedLots.map(l => (
                               <span key={l.id} className="px-2 py-1 bg-white text-[#1a73e8] text-xs font-medium rounded border border-green-200">
                                 {l.address.bonbun}{l.address.bubun ? `-${l.address.bubun}` : ''}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                       {ownedBuildings.length > 0 && (
                         <div className="bg-[#f1f3f4] p-3 rounded-lg border border-[#dadce0]">
                           <p className="text-xs font-bold text-[#3c4043] mb-2">건물 ({ownedBuildings.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedBuildings.map(b => (
                               <span key={b.id} className="px-2 py-1 bg-white text-[#3c4043] text-xs font-medium rounded border border-[#dadce0]">
                                 {b.name}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                       {ownedUnits.length > 0 && (
                         <div className="bg-[#f1f3f4] p-3 rounded-lg border border-[#dadce0]">
                           <p className="text-xs font-bold text-[#3c4043] mb-2">호실 ({ownedUnits.length})</p>
                           <div className="flex flex-wrap gap-2">
                             {ownedUnits.slice(0, 10).map(u => (
                               <span key={u.id} className="px-2 py-1 bg-white text-[#3c4043] text-xs font-medium rounded border border-[#dadce0]">
                                 {u.unitNumber}호
                               </span>
                             ))}
                             {ownedUnits.length > 10 && (
                               <span className="px-2 py-1 bg-white text-[#3c4043] text-xs font-bold rounded border border-[#dadce0]">
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
               <button onClick={handleSave} className="bg-[#1a73e8] text-white px-12 py-3 rounded-xl hover:bg-[#1557b0] font-bold shadow-lg transition-all active:scale-95">
                 저장
               </button>
             </div>
           </div>
           <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent z-10" />
           <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent z-10" />
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
                  <div className="p-2 bg-[#e8f0fe] text-[#1a73e8] rounded-lg"><FileText size={20}/></div>
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
                      <h4 className="text-xs font-black text-[#1a73e8] uppercase tracking-widest mb-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]"></div> 임대차 계약 리스트</h4>
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
                                <td className="p-4 font-bold text-gray-800">{(lease.terms[lease.terms.length-1]?.startDate || '')} ~ {(lease.terms[lease.terms.length-1]?.endDate || '')}</td>
                                <td className="p-4"><span className="px-2 py-1 bg-gray-100 text-[10px] font-bold rounded-md uppercase">{lease.type.split('_').join(' ')}</span></td>
                                <td className="p-4 font-black text-right text-[#1a73e8]">{formatMoney(activeTerm.deposit)} / {formatMoney(activeTerm.monthlyRent)}</td>
                                <td className="p-4 text-center">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${lease.status === 'ACTIVE' ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#c5d9f7]' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
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
                                <td className="p-4 font-black text-right text-[#3c4043]">{formatMoney(mc.monthlyCost)}</td>
                                <td className="p-4 text-center"><span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#c5d9f7]">진행중</span></td>
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

      {/* 상세보기 모달 (읽기전용) */}
      {isViewModalOpen && viewStakeholderId && typeof document !== 'undefined' && createPortal(
        (() => {
          const vp = stakeholders.find(s => s.id === viewStakeholderId);
          if (!vp) return null;
          const vpContracts = getStakeholderContracts(vp.id);
          const vpCompany = vp.companyId ? stakeholders.find(s => s.id === vp.companyId) : null;
          const vpDept = vp.departmentId && vpCompany?.departments ? vpCompany.departments.find(d => d.id === vp.departmentId) : null;
          const vpRelatedProps = properties.filter(p => p.ownerId === vp.id || p.lots.some(l => l.ownerId === vp.id) || p.buildings.some(b => b.ownerId === vp.id));
          const vpOwnedUnits = units.filter(u => u.ownerId === vp.id);

          const typeLabel = vp.type === 'INDIVIDUAL' ? '개인' : vp.type === 'SOLE_PROPRIETOR' ? '개인사업자' : vp.type === 'CORPORATE' ? '법인사업자' : vp.type === 'INTERNAL_ORG' ? '내부조직' : '임의그룹';

          return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="max-h-[90vh] overflow-y-auto">
              {/* 헤더 */}
              <div className="p-5 md:p-6 border-b border-gray-100 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${
                    vp.type === 'CORPORATE' ? 'bg-gray-50 text-gray-400 border-gray-100' :
                    vp.type === 'SOLE_PROPRIETOR' ? 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' :
                    'bg-[#e8f0fe] text-[#1a73e8] border-[#dadce0]'
                  }`}>
                    {vp.type === 'CORPORATE' || vp.type === 'SOLE_PROPRIETOR' ? <Building size={22}/> : <User size={22}/>}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900">{vp.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold">{typeLabel}</span>
                      {vp.roles.map(r => <span key={r}>{getRoleBadge(r)}</span>)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setIsViewModalOpen(false); handleOpenEdit(vp); }} className="p-2 text-gray-400 hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-lg" title="수정"><Edit2 size={16}/></button>
                  <button onClick={() => setIsViewModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
                </div>
              </div>

              {/* 본문 */}
              <div className="p-5 md:p-6 space-y-4">
                {/* 연락처 */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">연락처</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-gray-300"/>
                      <a href={`tel:${vp.contact.phone}`} className="font-bold text-gray-800 hover:text-[#1a73e8]">{vp.contact.phone}</a>
                      <span className="text-[9px] font-bold text-[#5f6368] bg-[#e8f0fe] px-1.5 py-0.5 rounded">{getPhoneType(vp.contact.phone)}</span>
                    </div>
                    {vp.additionalContacts && vp.additionalContacts.map((ac, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm pl-5">
                        <a href={`tel:${ac.phone}`} className="text-gray-600 hover:text-[#1a73e8]">{ac.label ? `${ac.label}: ` : ''}{ac.phone}</a>
                        <span className="text-[8px] font-bold text-[#5f6368] bg-[#e8f0fe] px-1 py-0.5 rounded">{getPhoneType(ac.phone)}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-gray-300"/>
                      <a href={`mailto:${vp.contact.email}`} className="text-gray-700 hover:text-[#1a73e8]">{vp.contact.email}</a>
                    </div>
                    {vp.contact.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <Building size={14} className="text-gray-300 flex-shrink-0 mt-0.5"/>
                        <div>
                          {vp.contact.postalCode && <span className="text-[10px] font-bold text-[#1a73e8] mr-1">({vp.contact.postalCode})</span>}
                          <span className="text-gray-600">{vp.contact.address}{vp.contact.addressDetail ? ` ${vp.contact.addressDetail}` : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 소속 */}
                {vpCompany && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">소속</h4>
                    <p className="text-sm text-gray-700">{vpCompany.name}{vpDept ? ` · ${vpDept.name}` : ''}{vp.position ? ` · ${vp.position}` : ''}{vp.jobTitle ? ` · ${vp.jobTitle}` : ''}</p>
                  </div>
                )}

                {/* 사업자 정보 */}
                {(vp.type === 'CORPORATE' || vp.type === 'SOLE_PROPRIETOR') && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">사업자 정보</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      {vp.representative && <p>대표자: <span className="font-bold">{vp.representative}</span></p>}
                      {vp.businessRegistrationNumber && <p>사업자등록번호: <span className="font-mono">{vp.businessRegistrationNumber}</span></p>}
                      {vp.registrationNumber && vp.type === 'CORPORATE' && <p>법인등록번호: <span className="font-mono">{vp.registrationNumber}</span></p>}
                    </div>
                  </div>
                )}

                {/* 계약 현황 */}
                {(vpContracts.leases.length > 0 || vpContracts.maintenances.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">계약 현황</h4>
                    {vpContracts.leases.map(lease => {
                      const term = getActiveTerm(lease);
                      return (
                        <div key={lease.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-800">{(lease.terms[lease.terms.length-1]?.startDate || '')} ~ {(lease.terms[lease.terms.length-1]?.endDate || '')}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${lease.status === 'ACTIVE' ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#c5d9f7]' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {lease.status === 'ACTIVE' ? '유효' : '만료'}
                            </span>
                          </div>
                          <p className="text-gray-500 mt-1">보증금 <span className="font-bold text-gray-700">{formatMoney(term.deposit)}</span> · 월세 <span className="font-bold text-gray-700">{formatMoney(term.monthlyRent)}</span></p>
                        </div>
                      );
                    })}
                    {vpContracts.maintenances.map(mc => (
                      <div key={mc.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800">{mc.serviceType} · {mc.term.startDate} ~ {mc.term.endDate}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#c5d9f7]">진행중</span>
                        </div>
                        <p className="text-gray-500 mt-1">월 <span className="font-bold text-gray-700">{formatMoney(mc.monthlyCost)}</span></p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 소유 자산 */}
                {(vpRelatedProps.length > 0 || vpOwnedUnits.length > 0) && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">소유 자산</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {vpRelatedProps.map(p => <span key={p.id} className="px-2 py-1 bg-[#e8f0fe] text-[#1a73e8] text-xs font-bold rounded border border-[#c5d9f7]">{p.name}</span>)}
                      {vpOwnedUnits.slice(0, 5).map(u => <span key={u.id} className="px-2 py-1 bg-[#f1f3f4] text-[#3c4043] text-xs font-bold rounded border border-[#dadce0]">{u.unitNumber}호</span>)}
                      {vpOwnedUnits.length > 5 && <span className="px-2 py-1 bg-[#f1f3f4] text-[#3c4043] text-xs font-bold rounded border border-[#dadce0]">+{vpOwnedUnits.length - 5}</span>}
                    </div>
                  </div>
                )}

                {/* 연관인물 */}
                {vp.relatedPersons && vp.relatedPersons.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">연관인물</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {vp.relatedPersons.map((rp, idx) => {
                        const rpPerson = stakeholders.find(s => s.id === rp.personId);
                        return <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded border border-gray-200">{rpPerson?.name || '알 수 없음'} ({rp.relationship})</span>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 하단 액션 */}
              <div className="p-4 md:p-5 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => { setIsViewModalOpen(false); handleOpenHistory(vp.id); }} className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">이력 보기</button>
                <button onClick={() => { setIsViewModalOpen(false); handleOpenEdit(vp); }} className="px-4 py-2 text-xs font-bold bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0]">수정</button>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent z-10" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent z-10" />
            </div>
          </div>
          );
        })(),
        document.body
      )}

      {/* Filter Tabs */}
      <div className="flex bg-white rounded-lg md:rounded-xl border border-gray-200 p-0.5 md:p-1 w-fit shadow-sm overflow-x-auto">
        {[
          { id: 'ALL', label: '전체' }, { id: 'TENANT', label: '임차인' }, { id: 'LANDLORD', label: '임대인' }, { id: 'MANAGER', label: '관리자' }, { id: 'VENDOR', label: '업체' },
        ].map(tab => (
           <button key={tab.id} onClick={() => setFilterRole(tab.id as any)} className={`px-3 md:px-6 py-1.5 md:py-2 text-[10px] md:text-xs font-black rounded-md md:rounded-lg transition-all whitespace-nowrap ${filterRole === tab.id ? 'bg-[#1a73e8] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{tab.label}</button>
        ))}
      </div>

      {/* 일괄 선택 액션 바 */}
      {checkedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[#e8f0fe] border border-[#dadce0] rounded-lg p-2 md:p-3">
          <input type="checkbox" checked={checkedIds.size === filtered.length} onChange={handleSelectAll} className="w-4 h-4 text-[#1a73e8] rounded" />
          <span className="text-xs md:text-sm font-bold text-[#1a73e8]">{checkedIds.size}건 선택됨</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={handlePrintPostalLabels} className="px-3 py-1.5 text-[10px] md:text-xs font-bold bg-white border border-[#1a73e8] text-[#1a73e8] rounded-lg hover:bg-[#e8f0fe] transition-all flex items-center gap-1">
              <Printer size={12}/> 우편라벨
            </button>
            <button onClick={() => { const first = stakeholders.find(s => checkedIds.has(s.id)); if (first) handleOpenEdit(first); }} className="px-3 py-1.5 text-[10px] md:text-xs font-bold bg-white border border-[#dadce0] text-[#1a73e8] rounded-lg hover:bg-[#f1f3f4] transition-all flex items-center gap-1">
              <Edit2 size={12}/> 수정
            </button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-[10px] md:text-xs font-bold bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1">
              <Trash2 size={12}/> 삭제
            </button>
            <button onClick={() => setCheckedIds(new Set())} className="px-3 py-1.5 text-[10px] md:text-xs font-bold text-gray-500 hover:text-gray-700 transition-all">
              선택 해제
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {filtered.map(person => {
          const personContracts = getStakeholderContracts(person.id);
          const refDate = referenceDate ? new Date(referenceDate + 'T00:00:00') : new Date(); refDate.setHours(0,0,0,0);
          const thirtyDaysLater = new Date(refDate); thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

          // 계약 상태 분류 (기준일자 기준)
          const activeLeases = personContracts.leases.filter(c => { const lt = c.terms[c.terms.length-1]; if(!lt) return false; const start = new Date(lt.startDate); const end = new Date(lt.endDate); return start <= refDate && end >= refDate; });
          const expiredLeases = personContracts.leases.filter(c => { const lt = c.terms[c.terms.length-1]; if(!lt) return false; const end = new Date(lt.endDate); return end < refDate; });
          const expiringLeases = activeLeases.filter(c => { const lt = c.terms[c.terms.length-1]; if(!lt) return false; const end = new Date(lt.endDate); return end <= thirtyDaysLater && end >= refDate; });

          // 채권/채무 계산 (보증금 기준)
          const totalDeposit = activeLeases.reduce((sum, c) => { const t = getActiveTerm(c); return sum + t.deposit; }, 0);
          const totalMonthlyRent = activeLeases.reduce((sum, c) => { const t = getActiveTerm(c); return sum + t.monthlyRent; }, 0);
          const totalMaintenanceCost = personContracts.maintenances.filter(m => m.status === 'ACTIVE').reduce((sum, m) => sum + m.monthlyCost, 0);

          // 임차인: 보증금=채권(돌려받을돈), 월세=채무(내야할돈)
          // 임대인: 보증금=채무(돌려줄돈), 월세=채권(받을돈)
          const isTenant = person.roles.includes('TENANT');
          const isLandlord = person.roles.includes('LANDLORD');
          const isVendor = person.roles.includes('VENDOR');
          const creditAmount = isTenant ? totalDeposit : isLandlord ? totalMonthlyRent : 0;
          const debtAmount = isTenant ? totalMonthlyRent : isLandlord ? totalDeposit : isVendor ? totalMaintenanceCost : 0;

          // 관련 물건
          const relatedPropertyIds = new Set<string>();
          personContracts.leases.forEach(c => { c.targetIds.forEach(tid => { const prop = properties.find(p => p.id === tid || p.buildings.some(b => b.id === tid) || p.lots.some(l => l.id === tid)); if (prop) relatedPropertyIds.add(prop.id); else { const propByUnit = properties.find(p => units.some(u => u.id === tid && u.propertyId === p.id)); if (propByUnit) relatedPropertyIds.add(propByUnit.id); } }); });
          personContracts.maintenances.forEach(c => { if (c.targetId) { const prop = properties.find(p => p.id === c.targetId || p.buildings.some(b => b.id === c.targetId)); if (prop) relatedPropertyIds.add(prop.id); } });
          // 소유 자산도 포함
          properties.forEach(p => { if (p.ownerId === person.id || p.lots.some(l => l.ownerId === person.id) || p.buildings.some(b => b.ownerId === person.id)) relatedPropertyIds.add(p.id); });
          units.forEach(u => { if (u.ownerId === person.id) relatedPropertyIds.add(u.propertyId); });
          const relatedProps = properties.filter(p => relatedPropertyIds.has(p.id));

          // 소속 정보
          const company = person.companyId ? stakeholders.find(s => s.id === person.companyId) : null;
          const dept = person.departmentId && company?.departments ? company.departments.find(d => d.id === person.departmentId) : null;

          const totalContracts = personContracts.leases.length + personContracts.maintenances.length;

          return (
          <div key={person.id} onClick={() => handleOpenView(person)} className={`bg-white rounded-xl md:rounded-2xl border shadow-sm hover:shadow-lg transition-all group flex flex-col h-full overflow-hidden cursor-pointer ${checkedIds.has(person.id) ? 'border-[#1a73e8] ring-2 ring-[#e8f0fe]' : 'border-gray-200'}`}>
            {/* 헤더: 체크박스 + 이름 + 역할 + 액션 버튼 */}
            <div className="flex justify-between items-start p-3 md:p-4 pb-0">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                 <input
                   type="checkbox"
                   checked={checkedIds.has(person.id)}
                   onClick={e => handleToggleCheck(person.id, e)}
                   onChange={() => {}}
                   className="w-4 h-4 text-[#1a73e8] rounded border-gray-300 focus:ring-[#1a73e8] flex-shrink-0 cursor-pointer"
                 />
                 <div className={`w-9 md:w-10 h-9 md:h-10 rounded-lg flex-shrink-0 flex items-center justify-center font-black border-2 ${
                   person.type === 'CORPORATE' ? 'bg-gray-50 text-gray-400 border-gray-100' :
                   person.type === 'SOLE_PROPRIETOR' ? 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' :
                   'bg-[#e8f0fe] text-[#1a73e8] border-[#dadce0]'
                 }`}>
                   {person.type === 'CORPORATE' || person.type === 'SOLE_PROPRIETOR' ? <Building size={16} className="md:w-[18px] md:h-[18px]"/> : <User size={16} className="md:w-[18px] md:h-[18px]"/>}
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-black text-gray-900 text-xs md:text-sm leading-tight truncate">{person.name}</h3>
                   <div className="flex flex-wrap items-center gap-1 mt-0.5">
                     {relatedProps.map(p => (
                       <span key={p.id} className={`${badgeBase} bg-[#f1f3f4] text-[#3c4043] border-[#dadce0]`}>{p.name}</span>
                     ))}
                     {person.roles.map(r => getRoleBadge(r, r))}
                   </div>
                 </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); handleOpenEdit(person); }} className="p-1.5 text-gray-400 hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-lg transition-colors" title="수정"><Edit2 size={14}/></button>
                <button onClick={e => { e.stopPropagation(); handleOpenHistory(person.id); }} className="p-1.5 text-gray-400 hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-lg transition-colors" title="이력"><FileText size={14}/></button>
                {person.departments && person.departments.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); setOrgChartStakeholderId(person.id); setIsOrgChartModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-lg transition-colors" title="조직도"><GitBranch size={14}/></button>
                )}
              </div>
            </div>

            {/* 본문 */}
            <div className="p-3 md:p-4 pt-2 md:pt-3 flex-1 flex flex-col gap-2 md:gap-2.5 text-[10px] md:text-xs">

              {/* 연락처 + 이메일 */}
              <div className="flex items-center gap-1.5">
                <Phone size={12} className="md:w-3.5 md:h-3.5 text-gray-300 flex-shrink-0"/>
                <a href={`tel:${person.contact.phone}`} className="font-bold text-gray-700 hover:text-[#1a73e8]">{person.contact.phone}</a>
                <span className="text-[8px] font-bold text-[#5f6368] bg-[#e8f0fe] px-1 py-0.5 rounded">{getPhoneType(person.contact.phone)}</span>
                {person.additionalContacts && person.additionalContacts.length > 0 && (
                  <span className="text-[8px] text-gray-400">+{person.additionalContacts.length}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Mail size={12} className="md:w-3.5 md:h-3.5 text-gray-300 flex-shrink-0"/>
                <a href={`mailto:${person.contact.email}`} className="truncate text-gray-600 hover:text-[#1a73e8] font-medium">{person.contact.email}</a>
              </div>

              {/* 소속 */}
              {company && (
                <div className="flex items-center gap-1.5">
                  <Building size={12} className="md:w-3.5 md:h-3.5 text-gray-300 flex-shrink-0"/>
                  <span className="text-gray-600 font-medium truncate">{company.name}{dept ? ` · ${dept.name}` : ''}{person.jobTitle ? ` · ${person.jobTitle}` : ''}</span>
                </div>
              )}
              {!company && person.representative && (person.type === 'CORPORATE' || person.type === 'SOLE_PROPRIETOR') && (
                <div className="flex items-center gap-1.5">
                  <Building size={12} className="md:w-3.5 md:h-3.5 text-gray-300 flex-shrink-0"/>
                  <span className="text-gray-600 font-medium truncate">대표: {person.representative}</span>
                </div>
              )}

              {/* 계약 현황 */}
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="md:w-3.5 md:h-3.5 text-gray-300 flex-shrink-0"/>
                {totalContracts > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-600">계약 {totalContracts}건</span>
                    {activeLeases.length > 0 && <span className="px-1.5 py-0.5 bg-[#e8f0fe] text-[#1a73e8] text-[9px] font-bold rounded border border-[#c5d9f7]">유효 {activeLeases.length}</span>}
                    {expiringLeases.length > 0 && <span className="px-1.5 py-0.5 bg-[#f1f3f4] text-[#5f6368] text-[9px] font-bold rounded border border-[#dadce0]">만료임박 {expiringLeases.length}</span>}
                    {expiredLeases.length > 0 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold rounded border border-gray-200">만료 {expiredLeases.length}</span>}
                  </div>
                ) : (
                  <span className="text-gray-300 italic">계약 없음</span>
                )}
              </div>

              {/* 채권/채무 요약 */}
              {(creditAmount > 0 || debtAmount > 0) && (
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-1.5 md:p-2 border border-gray-100">
                  <DollarSign size={12} className="md:w-3.5 md:h-3.5 text-gray-300 flex-shrink-0"/>
                  <div className="flex gap-2 flex-wrap">
                    {creditAmount > 0 && (
                      <span className="text-[9px] md:text-[10px]">
                        <span className="text-[#1a73e8] font-black">채권</span>
                        <span className="text-[#1a73e8] font-bold ml-1">{formatMoney(creditAmount)}</span>
                      </span>
                    )}
                    {debtAmount > 0 && (
                      <span className="text-[9px] md:text-[10px]">
                        <span className="text-red-500 font-black">채무</span>
                        <span className="text-red-600 font-bold ml-1">{formatMoney(debtAmount)}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 이슈 (만료임박 경고) */}
              {expiringLeases.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[#f1f3f4] rounded-lg p-1.5 md:p-2 border border-[#dadce0]">
                  <AlertCircle size={12} className="text-[#5f6368] flex-shrink-0"/>
                  <span className="text-[9px] md:text-[10px] text-[#5f6368] font-bold">30일 내 만료 계약 {expiringLeases.length}건</span>
                </div>
              )}
            </div>
          </div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full py-12 md:py-20 text-center text-gray-400 italic text-xs md:text-sm">검색 결과가 없습니다.</div>}
      </div>

      {/* 조직도 모달 */}
      {isOrgChartModalOpen && orgChartStakeholderId && (() => {
        const orgStakeholder = stakeholders.find(s => s.id === orgChartStakeholderId);
        if (!orgStakeholder || !orgStakeholder.departments || orgStakeholder.departments.length === 0) return null;

        return createPortal(
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setIsOrgChartModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#1a73e8] to-[#4285f4] rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <GitBranch size={20} className="text-white"/>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">조직도</h2>
                    <p className="text-xs text-white/80 mt-0.5">{orgStakeholder.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsOrgChartModalOpen(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors backdrop-blur-sm">
                  <X size={20}/>
                </button>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="border border-gray-200 rounded-lg bg-white">
                  {/* 줌/팬 컨트롤 버튼 */}
                  <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
                    <div className="text-xs font-bold text-gray-600">조직도</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // 조직도 인쇄 - 임시로 formData 설정
                          const tempFormData = formData;
                          setFormData(orgStakeholder);
                          setTimeout(() => {
                            handlePrintOrgChart();
                            setFormData(tempFormData);
                          }, 100);
                        }}
                        className="px-2 py-1.5 bg-[#1a73e8] text-white rounded hover:bg-[#1557b0] text-xs font-bold flex items-center gap-1"
                        title="조직도 인쇄"
                      >
                        <FileText size={14} />
                        <span className="hidden md:inline">인쇄</span>
                      </button>
                      <div className="border-l border-gray-300 h-6"></div>
                      <button
                        type="button"
                        onClick={() => setOrgChartZoom(prev => Math.min(prev + 0.1, 2))}
                        className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                        title="확대"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrgChartZoom(prev => Math.max(prev - 0.1, 0.3))}
                        className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                        title="축소"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOrgChartZoom(1);
                          setOrgChartPan({ x: 0, y: 0 });
                        }}
                        className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                        title="리셋"
                      >
                        <Maximize2 size={14} />
                      </button>
                      <div className="text-xs text-gray-500 ml-2 bg-white px-2 py-1 rounded border border-gray-300 font-mono">
                        {Math.round(orgChartZoom * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* 조직도 컨테이너 (줌/팬 가능) */}
                  <div
                    ref={orgChartContainerRef}
                    className="w-full h-[500px] overflow-hidden relative bg-white cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      setDragStart({ x: e.clientX - orgChartPan.x, y: e.clientY - orgChartPan.y });
                    }}
                    onMouseMove={(e) => {
                      if (isDragging) {
                        setOrgChartPan({
                          x: e.clientX - dragStart.x,
                          y: e.clientY - dragStart.y
                        });
                      }
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.05 : 0.05;
                      setOrgChartZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
                    }}
                  >
                    <div
                      style={{
                        transform: `translate(${orgChartPan.x}px, ${orgChartPan.y}px) scale(${orgChartZoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        width: '100%',
                        minHeight: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                      }}
                    >
                      {(() => {
                        // 재귀적으로 부서 렌더링하는 함수
                        const renderDepartment = (dept: any, level: number = 0): JSX.Element => {
                          const employees = stakeholders.filter(s =>
                            s.type === 'INDIVIDUAL' &&
                            s.companyId === orgChartStakeholderId &&
                            s.departmentId === dept.id
                          );

                          // 조직장과 구성원 분리
                          const leaders = employees.filter(e => e.isLeader);
                          const members = employees.filter(e => !e.isLeader);

                          const childDepts = (orgStakeholder.departments || []).filter(d => d.parentId === dept.id);

                          // 레벨에 따른 색상 결정
                          const bgColor = level === 0
                            ? 'bg-[#1a73e8]'
                            : level === 1
                            ? 'bg-[#4a90d9]'
                            : 'bg-[#7baaf0]';
                          const textSize = level === 0 ? 'text-xs md:text-sm' : 'text-[10px] md:text-xs';

                          return (
                            <div key={dept.id} className="flex flex-col items-center" style={{ minWidth: '100px' }}>
                              {/* 부서 박스 */}
                              <div className={`relative ${bgColor} text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm mb-1 group min-w-[80px]`}>
                                <div className={`font-medium ${textSize} text-center whitespace-nowrap`}>{dept.name}</div>

                                {/* 조직장 표시 (서브타이틀 형식) */}
                                {leaders.length > 0 && (
                                  <div className="text-[9px] md:text-[10px] text-white/90 mt-0.5 text-center">
                                    {leaders.map((leader, idx) => (
                                      <span key={leader.id}>
                                        {leader.jobTitle && `${leader.jobTitle} `}
                                        {leader.name}
                                        {idx < leaders.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {/* 하단 연결선 */}
                                {(childDepts.length > 0 || members.length > 0) && (
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-1 md:h-1.5 bg-gray-300"></div>
                                )}
                              </div>

                              {/* 하위 부서들 또는 직원들 */}
                              {(childDepts.length > 0 || employees.length > 0) && (
                                <div className="flex flex-col items-center" style={{ width: '100%' }}>
                                  {/* 수평 연결선 */}
                                  {childDepts.length > 1 && (
                                    <div className="relative mb-1" style={{ width: `${childDepts.length * 110}px`, height: '12px' }}>
                                      <div
                                        className="absolute bg-gray-300"
                                        style={{
                                          top: '0',
                                          left: '55px',
                                          right: '55px',
                                          height: '2px'
                                        }}
                                      ></div>
                                      {childDepts.map((_, idx) => (
                                        <div
                                          key={idx}
                                          className="absolute bg-gray-300"
                                          style={{
                                            top: '0',
                                            left: `${55 + idx * 110}px`,
                                            width: '2px',
                                            height: '12px'
                                          }}
                                        ></div>
                                      ))}
                                    </div>
                                  )}
                                  {childDepts.length === 1 && (
                                    <div className="w-0.5 h-2 md:h-3 bg-gray-300 mb-1"></div>
                                  )}

                                  {/* 하위 부서들 재귀 렌더링 - Grid 레이아웃 */}
                                  {childDepts.length > 0 && (
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${childDepts.length}, 110px)`,
                                        gap: '8px'
                                      }}
                                    >
                                      {childDepts.map(child => renderDepartment(child, level + 1))}
                                    </div>
                                  )}

                                  {/* 구성원들 (하위 부서가 없을 때만) */}
                                  {childDepts.length === 0 && members.length > 0 && (
                                    <div className="flex flex-col gap-0.5 mt-1">
                                      {members.map((member) => (
                                        <div
                                          key={member.id}
                                          className="bg-gray-100 px-2 py-1 rounded border border-gray-300 text-[9px] md:text-[10px] text-center"
                                        >
                                          <div className="font-medium text-gray-800">
                                            {member.position && `${member.position} `}
                                            {member.name}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        };

                        // 최상위 부서 찾기
                        const topDepts = (orgStakeholder.departments || []).filter(d => !d.parentId);

                        return (
                          <div className="flex flex-col items-center gap-2 md:gap-3">
                            {/* 최상위 레벨부터 재귀적으로 렌더링 */}
                            {topDepts.length > 0 && (
                              <div className="flex justify-center gap-2 md:gap-3">
                                {topDepts.map(dept => renderDepartment(dept, 0))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};
