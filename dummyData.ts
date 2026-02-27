import {
  Stakeholder, Property, Building, Unit, LeaseContract, MaintenanceContract,
  UtilityContract, PaymentTransaction, ValuationHistory, MarketComparable,
  Facility, FacilityLog
} from './types';

// ==========================================
// 인물/업체 (임대인, 임차인, 관리업체, 협력업체)
// ==========================================
export const INIT_STAKEHOLDERS: Stakeholder[] = [
  // 임대인 (소유자)
  {
    id: 'sh_owner1', name: '박정우', type: 'INDIVIDUAL', roles: ['LANDLORD'],
    registrationNumber: '8503151******',
    contact: { phone: '01098765432', email: 'jw.park@gmail.com', address: '서울특별시 서초구 반포대로 58' },
    bankAccounts: [{ bankName: '국민은행', accountNumber: '123456789012', accountHolder: '박정우' }],
  },
  // 법인 임대인
  {
    id: 'sh_owner2', name: '(주)한성개발', type: 'CORPORATE', roles: ['LANDLORD'],
    registrationNumber: '1108134567', representative: '김한성',
    contact: { phone: '025551234', email: 'info@hansung.co.kr', address: '서울특별시 중구 을지로 100' },
    bankAccounts: [{ bankName: '신한은행', accountNumber: '110321456789', accountHolder: '(주)한성개발' }],
    taxInvoiceAddress: 'hansung@tax.co.kr',
  },
  // 임차인 - 법인
  {
    id: 'sh_tenant1', name: '(주)미래전자', type: 'CORPORATE', roles: ['TENANT'],
    registrationNumber: '1108100001', representative: '이건희',
    contact: { phone: '0212345678', email: 'biz@mirae.com', address: '서울특별시 강남구 테헤란로 123' },
  },
  {
    id: 'sh_tenant2', name: '세종법률사무소', type: 'CORPORATE', roles: ['TENANT'],
    registrationNumber: '1108122222', representative: '최세종',
    contact: { phone: '0234567890', email: 'sejong@lawfirm.co.kr' },
  },
  {
    id: 'sh_tenant3', name: '카페 블루보틀', type: 'SOLE_PROPRIETOR', roles: ['TENANT'],
    registrationNumber: '2150988888', representative: '김바리',
    contact: { phone: '01022223333', email: 'blue@cafe.com' },
  },
  {
    id: 'sh_tenant4', name: '굿닥터 내과의원', type: 'SOLE_PROPRIETOR', roles: ['TENANT'],
    registrationNumber: '2159011111', representative: '이의사',
    contact: { phone: '021112222', email: 'clinic@gooddr.com' },
  },
  {
    id: 'sh_tenant5', name: '(주)디지털솔루션', type: 'CORPORATE', roles: ['TENANT'],
    registrationNumber: '2118155555', representative: '정개발',
    contact: { phone: '029998888', email: 'info@digisol.co.kr' },
  },
  // 관리회사
  {
    id: 'sh_manager1', name: '(주)리얼티프로', type: 'CORPORATE', roles: ['MANAGER'],
    registrationNumber: '1108600001', representative: '박관리',
    contact: { phone: '027778888', email: 'pm@realty.com' },
  },
  // 협력업체
  {
    id: 'sh_vendor1', name: '오티스엘리베이터', type: 'CORPORATE', roles: ['VENDOR'],
    registrationNumber: '1138112345',
    contact: { phone: '15770603', email: 'service@otis.com' },
  },
  {
    id: 'sh_vendor2', name: '에스원', type: 'CORPORATE', roles: ['VENDOR'],
    registrationNumber: '2118199999',
    contact: { phone: '15883112', email: 'security@s1.co.kr' },
  },
  {
    id: 'sh_vendor3', name: '(주)그린환경', type: 'CORPORATE', roles: ['VENDOR'],
    registrationNumber: '1208177777',
    contact: { phone: '024445555', email: 'green@env.co.kr' },
  },
  {
    id: 'sh_vendor4', name: '한국전기안전공사', type: 'CORPORATE', roles: ['VENDOR'],
    registrationNumber: '1208211111',
    contact: { phone: '15887500', email: 'kesco@kesco.or.kr' },
  },
  {
    id: 'sh_vendor5', name: '(주)소방테크', type: 'CORPORATE', roles: ['VENDOR'],
    registrationNumber: '1308133333',
    contact: { phone: '026667777', email: 'fire@firetech.co.kr' },
  },
];

// ==========================================
// 건물 정의
// ==========================================
const BLDG_P1_A: Building = {
  id: 'b1', propertyId: 'p1', name: '시그니처 타워 A동', ownerId: 'sh_owner1',
  spec: {
    buildingArea: 850.5, grossFloorArea: 12000.2,
    floorCount: { underground: 3, ground: 25 },
    completionDate: '2018-06-15', mainUsage: '업무시설',
    structure: '철근콘크리트', roofType: '평지붕', height: 98.5,
    parkingCapacity: 250,
    parkingDetail: { indoorMech: 80, indoorSelf: 120, outdoorMech: 0, outdoorSelf: 50 },
    elevatorCount: 6,
    elevatorDetail: { passenger: 5, emergency: 1 },
    earthquakeDesign: true,
    floors: [
      ...Array.from({ length: 3 }, (_, i) => ({ floorNumber: -(i + 1), area: 850.5, usage: '주차장' })),
      { floorNumber: 1, area: 720.0, usage: '근린생활시설', exclusiveArea: 580.0, exclusiveRatio: 80.6 },
      ...Array.from({ length: 24 }, (_, i) => ({ floorNumber: i + 2, area: 480.0, usage: '업무시설', exclusiveArea: 384.0, exclusiveRatio: 80.0 })),
    ],
  },
};

const BLDG_P1_B: Building = {
  id: 'b1b', propertyId: 'p1', name: '시그니처 타워 B동', ownerId: 'sh_owner1',
  spec: {
    buildingArea: 620.0, grossFloorArea: 5580.0,
    floorCount: { underground: 2, ground: 9 },
    completionDate: '2018-06-15', mainUsage: '근린생활시설',
    structure: '철근콘크리트', parkingCapacity: 60,
    elevatorCount: 2,
    floors: [
      ...Array.from({ length: 2 }, (_, i) => ({ floorNumber: -(i + 1), area: 620.0, usage: '주차장' })),
      ...Array.from({ length: 9 }, (_, i) => ({ floorNumber: i + 1, area: 620.0, usage: i < 2 ? '근린생활시설' : '업무시설' })),
    ],
  },
};

const BLDG_P2: Building = {
  id: 'b2', propertyId: 'p2', name: '서초 메디컬 빌딩', ownerId: 'sh_owner2',
  spec: {
    buildingArea: 450.0, grossFloorArea: 3150.0,
    floorCount: { underground: 1, ground: 7 },
    completionDate: '2010-09-01', mainUsage: '의료시설',
    structure: '철근콘크리트', parkingCapacity: 40,
    elevatorCount: 2,
    floors: [
      { floorNumber: -1, area: 450.0, usage: '주차장' },
      { floorNumber: 1, area: 450.0, usage: '약국/편의점' },
      ...Array.from({ length: 6 }, (_, i) => ({ floorNumber: i + 2, area: 450.0, usage: '의원/의료' })),
    ],
  },
};

const BLDG_P3: Building = {
  id: 'b3', propertyId: 'p3', name: '마포 상가건물', ownerId: 'sh_owner1',
  spec: {
    buildingArea: 280.0, grossFloorArea: 1400.0,
    floorCount: { underground: 1, ground: 5 },
    completionDate: '2005-03-10', mainUsage: '근린생활시설',
    structure: '철근콘크리트', parkingCapacity: 15,
    elevatorCount: 1,
    floors: [
      { floorNumber: -1, area: 280.0, usage: '주차장/창고' },
      ...Array.from({ length: 5 }, (_, i) => ({ floorNumber: i + 1, area: 280.0, usage: '근린생활시설' })),
    ],
  },
};

// ==========================================
// 물건 (자산)
// ==========================================
export const INIT_PROPERTIES: Property[] = [
  {
    id: 'p1', type: 'LAND_AND_BUILDING', name: '강남 시그니처 센터',
    masterAddress: { sido: '서울특별시', sigungu: '강남구', eupMyeonDong: '역삼동', bonbun: '100', bubun: '1' },
    roadAddress: '서울특별시 강남구 테헤란로 123',
    lots: [
      { id: 'l1', address: { sido: '서울특별시', sigungu: '강남구', eupMyeonDong: '역삼동', bonbun: '100', bubun: '1' }, jimok: '대', area: 1800.4 },
      { id: 'l1b', address: { sido: '서울특별시', sigungu: '강남구', eupMyeonDong: '역삼동', bonbun: '100', bubun: '2' }, jimok: '대', area: 650.0 },
    ],
    buildings: [BLDG_P1_A, BLDG_P1_B],
    totalLandArea: 2450.4, managerId: 'sh_manager1', ownerId: 'sh_owner1',
  },
  {
    id: 'p2', type: 'LAND_AND_BUILDING', name: '서초 메디컬 센터',
    masterAddress: { sido: '서울특별시', sigungu: '서초구', eupMyeonDong: '서초동', bonbun: '200', bubun: '5' },
    roadAddress: '서울특별시 서초구 서초대로 456',
    lots: [
      { id: 'l2', address: { sido: '서울특별시', sigungu: '서초구', eupMyeonDong: '서초동', bonbun: '200', bubun: '5' }, jimok: '대', area: 520.0 },
    ],
    buildings: [BLDG_P2],
    totalLandArea: 520.0, managerId: 'sh_manager1', ownerId: 'sh_owner2',
  },
  {
    id: 'p3', type: 'LAND_AND_BUILDING', name: '마포 역세권 상가',
    masterAddress: { sido: '서울특별시', sigungu: '마포구', eupMyeonDong: '공덕동', bonbun: '55', bubun: '3' },
    roadAddress: '서울특별시 마포구 마포대로 78',
    lots: [
      { id: 'l3', address: { sido: '서울특별시', sigungu: '마포구', eupMyeonDong: '공덕동', bonbun: '55', bubun: '3' }, jimok: '대', area: 310.0 },
    ],
    buildings: [BLDG_P3],
    totalLandArea: 310.0, ownerId: 'sh_owner1',
  },
];

// ==========================================
// 호실
// ==========================================
export const INIT_UNITS: Unit[] = [
  // 강남 시그니처 A동
  { id: 'u1', propertyId: 'p1', buildingId: 'b1', unitNumber: '101', floor: 1, area: 320.5, usage: '카페', status: 'OCCUPIED' },
  { id: 'u2', propertyId: 'p1', buildingId: 'b1', unitNumber: '102', floor: 1, area: 180.0, usage: '편의점', status: 'OCCUPIED' },
  { id: 'u3', propertyId: 'p1', buildingId: 'b1', unitNumber: '501', floor: 5, area: 240.0, usage: '사무실', status: 'OCCUPIED' },
  { id: 'u4', propertyId: 'p1', buildingId: 'b1', unitNumber: '1001', floor: 10, area: 480.0, usage: '사무실', status: 'OCCUPIED' },
  { id: 'u5', propertyId: 'p1', buildingId: 'b1', unitNumber: '1501', floor: 15, area: 480.0, usage: '사무실', status: 'OCCUPIED' },
  { id: 'u6', propertyId: 'p1', buildingId: 'b1', unitNumber: '2001', floor: 20, area: 480.0, usage: '사무실', status: 'VACANT' },
  { id: 'u7', propertyId: 'p1', buildingId: 'b1', unitNumber: '2501', floor: 25, area: 480.0, usage: '사무실', status: 'VACANT' },
  // 강남 시그니처 B동
  { id: 'u8', propertyId: 'p1', buildingId: 'b1b', unitNumber: 'B101', floor: 1, area: 310.0, usage: '음식점', status: 'OCCUPIED' },
  { id: 'u9', propertyId: 'p1', buildingId: 'b1b', unitNumber: 'B301', floor: 3, area: 310.0, usage: '사무실', status: 'VACANT' },
  // 서초 메디컬
  { id: 'u10', propertyId: 'p2', buildingId: 'b2', unitNumber: '101', floor: 1, area: 120.0, usage: '약국', status: 'OCCUPIED' },
  { id: 'u11', propertyId: 'p2', buildingId: 'b2', unitNumber: '201', floor: 2, area: 225.0, usage: '내과의원', status: 'OCCUPIED' },
  { id: 'u12', propertyId: 'p2', buildingId: 'b2', unitNumber: '301', floor: 3, area: 225.0, usage: '치과의원', status: 'OCCUPIED' },
  { id: 'u13', propertyId: 'p2', buildingId: 'b2', unitNumber: '501', floor: 5, area: 225.0, usage: '한의원', status: 'VACANT' },
  // 마포 상가
  { id: 'u14', propertyId: 'p3', buildingId: 'b3', unitNumber: '101', floor: 1, area: 140.0, usage: '음식점', status: 'OCCUPIED' },
  { id: 'u15', propertyId: 'p3', buildingId: 'b3', unitNumber: '102', floor: 1, area: 90.0, usage: '부동산중개', status: 'OCCUPIED' },
  { id: 'u16', propertyId: 'p3', buildingId: 'b3', unitNumber: '201', floor: 2, area: 140.0, usage: '학원', status: 'OCCUPIED' },
  { id: 'u17', propertyId: 'p3', buildingId: 'b3', unitNumber: '301', floor: 3, area: 280.0, usage: '사무실', status: 'VACANT' },
];

// ==========================================
// 임대차 계약
// ==========================================
export const INIT_LEASE_CONTRACTS: LeaseContract[] = [
  // 강남 시그니처 A동
  {
    id: 'lc1', type: 'LEASE_OUT', targetType: 'UNIT', targetIds: ['u1'],
    landlordIds: ['sh_landlord1'], tenantIds: ['sh_tenant3'], status: 'ACTIVE',
    originalContractDate: '2023-01-01',
    terms: [{
      id: 'ct1', termNumber: 1, type: 'NEW', contractDate: '2023-01-01',
      startDate: '2023-02-01', endDate: '2025-01-31', deposit: 100000000, monthlyRent: 8500000,
      rentVatIncluded: true, paymentDay: 5, paymentType: 'PREPAID',
      costItems: [
        { id: 'ci1-1', label: '관리비', method: 'FIXED', amount: 1200000, vatIncluded: true },
        { id: 'ci1-2', label: '전기료', method: 'ACTUAL_COST', amount: 0, vatIncluded: true },
        { id: 'ci1-3', label: '수도료', method: 'ACTUAL_COST', amount: 0, vatIncluded: true },
      ],
      attachments: [],
    }],
    conditions: { restorationRequired: true, subleaseAllowed: false, renewalNoticePeriod: 3, rentIncreaseRate: 5, specialTerms: [] },
    collaterals: [], note: '',
  },
  {
    id: 'lc2', type: 'LEASE_OUT', targetType: 'UNIT', targetIds: ['u4'],
    landlordIds: ['sh_landlord1'], tenantIds: ['sh_tenant1'], status: 'ACTIVE',
    originalContractDate: '2024-03-01',
    terms: [{
      id: 'ct2', termNumber: 1, type: 'NEW', contractDate: '2024-03-01',
      startDate: '2024-04-01', endDate: '2026-03-31', deposit: 500000000, monthlyRent: 25000000,
      rentVatIncluded: true, paymentDay: 1, paymentType: 'PREPAID',
      costItems: [
        { id: 'ci2-1', label: '관리비', method: 'FIXED', amount: 3500000, vatIncluded: true },
        { id: 'ci2-2', label: '전기료', method: 'ACTUAL_COST', amount: 0, vatIncluded: true },
      ],
      attachments: [],
    }],
    conditions: { restorationRequired: true, subleaseAllowed: false, renewalNoticePeriod: 6, rentIncreaseRate: 5, specialTerms: ['계약기간 중 임의해지 시 보증금의 10% 위약금 부담'] },
    collaterals: [{ id: 'col2-1', type: 'GUARANTEE_INSURANCE', amount: 500000000, targetType: 'BUILDING', targetIds: [], priority: 1, insuranceCompany: 'SGI서울보증', policyNumber: 'SGI-2024-00123' }],
    note: '',
  },
  {
    id: 'lc3', type: 'LEASE_OUT', targetType: 'UNIT', targetIds: ['u5'],
    landlordIds: ['sh_landlord1'], tenantIds: ['sh_tenant2'], status: 'ACTIVE',
    originalContractDate: '2024-06-01',
    terms: [{
      id: 'ct3', termNumber: 1, type: 'NEW', contractDate: '2024-06-01',
      startDate: '2024-07-01', endDate: '2026-06-30', deposit: 400000000, monthlyRent: 22000000,
      rentVatIncluded: true, paymentDay: 10, paymentType: 'PREPAID',
      costItems: [
        { id: 'ci3-1', label: '관리비', method: 'FIXED', amount: 3000000, vatIncluded: true },
        { id: 'ci3-2', label: '전기료', method: 'ACTUAL_COST', amount: 0, vatIncluded: true },
        { id: 'ci3-3', label: '수도료', method: 'ACTUAL_COST', amount: 0, vatIncluded: true },
      ],
      attachments: [],
    }],
    conditions: { restorationRequired: true, subleaseAllowed: false, renewalNoticePeriod: 3, rentIncreaseRate: 5, specialTerms: [] },
    collaterals: [],
  },
  {
    id: 'lc4', type: 'LEASE_OUT', targetType: 'UNIT', targetIds: ['u3'],
    landlordIds: ['sh_landlord1'], tenantIds: ['sh_tenant5'], status: 'ACTIVE',
    originalContractDate: '2025-01-01',
    terms: [{
      id: 'ct4', termNumber: 1, type: 'NEW', contractDate: '2025-01-01',
      startDate: '2025-02-01', endDate: '2027-01-31', deposit: 150000000, monthlyRent: 12000000,
      rentVatIncluded: true, paymentDay: 5, paymentType: 'PREPAID',
      costItems: [
        { id: 'ci4-1', label: '관리비', method: 'FIXED', amount: 1800000, vatIncluded: true },
      ],
      attachments: [],
    }],
    conditions: { restorationRequired: true, subleaseAllowed: true, renewalNoticePeriod: 3, specialTerms: [] },
    collaterals: [],
  },
  // 서초 메디컬 - 갱신 이력 있음 (1차 신규 → 2차 갱신)
  {
    id: 'lc5', type: 'LEASE_OUT', targetType: 'UNIT', targetIds: ['u11'],
    landlordIds: ['sh_landlord2'], tenantIds: ['sh_tenant4'], status: 'ACTIVE',
    originalContractDate: '2020-08-01',
    terms: [
      {
        id: 'ct5-1', termNumber: 1, type: 'NEW', contractDate: '2020-08-01',
        startDate: '2020-09-01', endDate: '2022-08-31', deposit: 180000000, monthlyRent: 9000000,
        rentVatIncluded: false, paymentDay: 10, paymentType: 'PREPAID',
        costItems: [
          { id: 'ci5-1', label: '관리비', method: 'FIXED', amount: 1200000, vatIncluded: false },
        ],
        attachments: [],
      },
      {
        id: 'ct5-2', termNumber: 2, type: 'RENEWAL', contractDate: '2022-07-15',
        startDate: '2022-09-01', endDate: '2025-08-31', deposit: 200000000, monthlyRent: 10000000,
        rentVatIncluded: false, paymentDay: 10, paymentType: 'PREPAID', rentIncreaseRate: 5,
        costItems: [
          { id: 'ci5-2', label: '관리비', method: 'FIXED', amount: 1500000, vatIncluded: false },
          { id: 'ci5-3', label: '전기료', method: 'ACTUAL_COST', amount: 0, vatIncluded: true },
        ],
        attachments: [],
      },
    ],
    conditions: { restorationRequired: true, subleaseAllowed: false, renewalNoticePeriod: 3, rentIncreaseRate: 5, specialTerms: ['의료장비 반입을 위한 구조변경 허용 (원상복구 의무)'] },
    collaterals: [{ id: 'col5-1', type: 'MORTGAGE', amount: 200000000, targetType: 'BUILDING', targetIds: [], priority: 1, registrationDate: '2020-09-05' }],
  },
  // 마포 상가 - 만료 예정
  {
    id: 'lc6', type: 'LEASE_OUT', targetType: 'UNIT', targetIds: ['u14', 'u15'],
    landlordIds: ['sh_landlord3'], tenantIds: ['sh_tenant3'], status: 'ACTIVE',
    originalContractDate: '2023-06-01',
    terms: [{
      id: 'ct6', termNumber: 1, type: 'NEW', contractDate: '2023-06-01',
      startDate: '2023-07-01', endDate: '2025-06-30', deposit: 50000000, monthlyRent: 3500000,
      rentVatIncluded: true, paymentDay: 5, paymentType: 'PREPAID',
      costItems: [
        { id: 'ci6-1', label: '관리비', method: 'FIXED', amount: 500000, vatIncluded: true },
      ],
      attachments: [],
    }],
    conditions: { restorationRequired: true, subleaseAllowed: false, specialTerms: [] },
    collaterals: [],
  },
  // 마포 상가 - 만료됨
  {
    id: 'lc7', type: 'LEASE_OUT', targetType: 'UNIT', targetIds: ['u16'],
    landlordIds: ['sh_landlord3'], tenantIds: ['sh_tenant5'], status: 'EXPIRED',
    originalContractDate: '2021-03-01',
    terms: [{
      id: 'ct7', termNumber: 1, type: 'NEW', contractDate: '2021-03-01',
      startDate: '2021-04-01', endDate: '2024-03-31', deposit: 30000000, monthlyRent: 2500000,
      rentVatIncluded: true, paymentDay: 5, paymentType: 'PREPAID',
      costItems: [
        { id: 'ci7-1', label: '관리비', method: 'FIXED', amount: 400000, vatIncluded: true },
      ],
      attachments: [],
    }],
    conditions: { restorationRequired: true, subleaseAllowed: false, specialTerms: [] },
    collaterals: [],
  },
];

// ==========================================
// 유지보수 계약
// ==========================================
export const INIT_MAINTENANCE_CONTRACTS: MaintenanceContract[] = [
  {
    id: 'mc1', targetType: 'PROPERTY', targetId: 'p1', vendorId: 'sh_vendor1', facilityId: 'f1',
    serviceType: 'ELEVATOR', status: 'ACTIVE', isRecurring: true, paymentDay: 25,
    term: { startDate: '2024-01-01', endDate: '2024-12-31' },
    monthlyCost: 1200000, details: '승강기 6대 월 1회 정기점검 및 긴급출동 포함',
  },
  {
    id: 'mc2', targetType: 'PROPERTY', targetId: 'p1', vendorId: 'sh_vendor2',
    serviceType: 'SECURITY', status: 'ACTIVE', isRecurring: true, paymentDay: 25,
    term: { startDate: '2024-01-01', endDate: '2024-12-31' },
    monthlyCost: 2500000, details: '건물 경비 및 주차관리, 출입통제 시스템 운영',
  },
  {
    id: 'mc3', targetType: 'PROPERTY', targetId: 'p1', vendorId: 'sh_vendor3',
    serviceType: 'CLEANING', status: 'ACTIVE', isRecurring: true, paymentDay: 25,
    term: { startDate: '2024-01-01', endDate: '2024-12-31' },
    monthlyCost: 3200000, details: '공용부 일일 청소, 유리창 월 2회, 정화조 연 1회 청소 포함',
  },
  {
    id: 'mc4', targetType: 'PROPERTY', targetId: 'p1', vendorId: 'sh_vendor5', facilityId: 'f3',
    serviceType: 'FIRE_SAFETY', status: 'ACTIVE', isRecurring: true, paymentDay: 10,
    term: { startDate: '2024-03-01', endDate: '2025-02-28' },
    monthlyCost: 800000, details: '소방시설 작동기능점검 반기 1회, 종합정밀점검 연 1회',
  },
  {
    id: 'mc5', targetType: 'PROPERTY', targetId: 'p2', vendorId: 'sh_vendor1',
    serviceType: 'ELEVATOR', status: 'ACTIVE', isRecurring: true, paymentDay: 25,
    term: { startDate: '2024-01-01', endDate: '2024-12-31' },
    monthlyCost: 400000, details: '승강기 2대 격월 정기점검',
  },
];

// ==========================================
// 공과금 계약
// ==========================================
export const INIT_UTILITY_CONTRACTS: UtilityContract[] = [
  {
    id: 'uc1', targetType: 'PROPERTY', targetId: 'p1', category: 'ELECTRICITY',
    provider: '한국전력공사', customerNumber: '01-1234-5678-90', contact: '123',
    status: 'ACTIVE', startDate: '2018-06-15', billingCycle: 'MONTHLY', paymentDay: 20, paymentMethod: '자동이체',
  },
  {
    id: 'uc2', targetType: 'PROPERTY', targetId: 'p1', category: 'WATER',
    provider: '서울시 상수도사업본부', customerNumber: '02-9876-5432', contact: '120',
    status: 'ACTIVE', startDate: '2018-06-15', billingCycle: 'BI_MONTHLY_ODD', paymentDay: 15, paymentMethod: '자동이체',
  },
  {
    id: 'uc3', targetType: 'PROPERTY', targetId: 'p1', category: 'GAS',
    provider: '서울도시가스', customerNumber: 'G-2024-001234', contact: '1588-5788',
    status: 'ACTIVE', startDate: '2018-06-15', billingCycle: 'MONTHLY', paymentDay: 20, paymentMethod: '자동이체',
  },
];

// ==========================================
// 시설/설비
// ==========================================
export const INIT_FACILITIES: Facility[] = [
  // 강남 시그니처 - 승강기
  {
    id: 'f1', propertyId: 'p1', buildingId: 'b1', category: 'ELEVATOR', name: '중앙 승강기 1호기',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 250000000,
    inspectionCycle: 1, lastInspectionDate: '2025-11-15', nextInspectionDate: '2026-05-15',
    spec: { elevatorNo: '2178394' }, safetyOfficerId: 'sh_manager1', vendorId: 'sh_vendor1',
  },
  {
    id: 'f1b', propertyId: 'p1', buildingId: 'b1', category: 'ELEVATOR', name: '중앙 승강기 2호기',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 250000000,
    inspectionCycle: 1, lastInspectionDate: '2025-11-15', nextInspectionDate: '2026-05-15',
    spec: {}, vendorId: 'sh_vendor1',
  },
  // 강남 시그니처 - 소방시설
  {
    id: 'f3', propertyId: 'p1', buildingId: 'b1', category: 'FIRE_SAFETY', name: 'A동 소방시설 일체',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 180000000,
    inspectionCycle: 6, lastInspectionDate: '2025-09-20', nextInspectionDate: '2026-03-20',
    spec: {
      fireExtinguisherCount: 120, sprinkler: '유', indoorHydrant: '유',
      alarmType: '자동화재탐지, 비상방송, 시각경보', evacuationType: '유도등, 비상조명, 완강기',
      safetyManager: '이방재', inspectionType: '종합정밀점검',
    },
    vendorId: 'sh_vendor5',
  },
  // 강남 시그니처 - 전기시설
  {
    id: 'f4', propertyId: 'p1', buildingId: 'b1', category: 'ELECTRICAL', name: 'A동 수변전 설비',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 350000000,
    inspectionCycle: 12, lastInspectionDate: '2025-06-10', nextInspectionDate: '2026-06-10',
    spec: {
      receivingCapacity: 2500, transformerCapacity: 3000, receivingMethod: '특고압',
      emergencyGenerator: '유', generatorCapacity: 500, safetyManager: '김전기', groundingType: '제3종',
    },
    vendorId: 'sh_vendor4',
  },
  // 강남 시그니처 - 가스시설
  {
    id: 'f5', propertyId: 'p1', buildingId: 'b1', category: 'GAS', name: 'A동 가스공급 설비',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 25000000,
    inspectionCycle: 24, lastInspectionDate: '2024-12-01', nextInspectionDate: '2026-12-01',
    spec: {
      gasType: '도시가스', facilityCapacity: '150,000 kcal/h',
      pipeMaterial: '강관', shutoffDevice: '유', meterLocation: '지하 1층 기계실', safetyManager: '박가스',
    },
  },
  // 강남 시그니처 - 보안설비
  {
    id: 'f6', propertyId: 'p1', buildingId: 'b1', category: 'SECURITY', name: 'A동 보안 시스템',
    status: 'OPERATIONAL', installationDate: '2020-03-01', initialCost: 85000000,
    inspectionCycle: 12, lastInspectionDate: '2025-10-15', nextInspectionDate: '2026-10-15',
    spec: {
      securityType: '폐쇄회로TV', quantity: 48,
      manufacturer: '한화비전', recorderType: '네트워크(NVR)', storageCapacity: 16,
      retentionDays: 30, monitoringMethod: '상시+원격',
    },
    vendorId: 'sh_vendor2',
  },
  // 강남 시그니처 - 냉난방
  {
    id: 'f7', propertyId: 'p1', buildingId: 'b1', category: 'HVAC', name: 'A동 중앙냉난방 시스템',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 450000000,
    inspectionCycle: 6, lastInspectionDate: '2025-10-01', nextInspectionDate: '2026-04-01',
    spec: {
      hvacType: '중앙냉난방', coolingCapacity: '200RT',
      heatingCapacity: '1,500,000 kcal/h', manufacturer: '캐리어', refrigerant: 'R410A',
    },
  },
  // 강남 시그니처 - 정화조
  {
    id: 'f8', propertyId: 'p1', category: 'SEPTIC_TANK', name: '오수처리시설',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 60000000,
    inspectionCycle: 6, lastInspectionDate: '2025-07-15', nextInspectionDate: '2026-01-15',
    spec: {
      treatmentMethod: '오수처리시설', treatmentCapacity: '2,000인용 / 80㎥/일',
      cleaningCycle: '1년', waterTestCycle: '6개월', cleaningCompany: '(주)그린환경',
    },
    vendorId: 'sh_vendor3',
  },
  // 강남 시그니처 - 급수
  {
    id: 'f9', propertyId: 'p1', category: 'PLUMBING', name: '저수조 및 급수펌프',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 35000000,
    inspectionCycle: 6, lastInspectionDate: '2025-09-01', nextInspectionDate: '2026-03-01',
    spec: {
      waterTankCapacity: 150, pumpCount: 3, pumpCapacity: '10마력',
      waterTestCycle: '1년', cleaningCycle: '6개월',
    },
  },
  // 강남 시그니처 - 보일러
  {
    id: 'f10', propertyId: 'p1', buildingId: 'b1', category: 'BOILER', name: 'A동 중앙 보일러',
    status: 'OPERATIONAL', installationDate: '2018-06-15', initialCost: 120000000,
    inspectionCycle: 24, lastInspectionDate: '2025-03-15', nextInspectionDate: '2027-03-15',
    spec: {
      boilerType: '가스보일러', capacity: 1500000, pressure: 0.5,
      manufacturer: '경동나비엔', safetyManager: '최보일러', inspectionType: '계속사용검사',
    },
  },
  // 서초 메디컬 - 승강기
  {
    id: 'f11', propertyId: 'p2', buildingId: 'b2', category: 'ELEVATOR', name: '메디컬 빌딩 승강기',
    status: 'OPERATIONAL', installationDate: '2010-09-01', initialCost: 80000000,
    inspectionCycle: 1, lastInspectionDate: '2025-08-20', nextInspectionDate: '2026-02-20',
    spec: {}, vendorId: 'sh_vendor1',
  },
  // 서초 메디컬 - 소방
  {
    id: 'f12', propertyId: 'p2', buildingId: 'b2', category: 'FIRE_SAFETY', name: '메디컬 빌딩 소방시설',
    status: 'INSPECTION_DUE', installationDate: '2010-09-01', initialCost: 45000000,
    inspectionCycle: 6, lastInspectionDate: '2025-03-01', nextInspectionDate: '2025-09-01',
    spec: {
      fireExtinguisherCount: 35, sprinkler: '유', indoorHydrant: '유',
      alarmType: '자동화재탐지, 비상방송', evacuationType: '유도등, 비상조명',
      safetyManager: '김소방', inspectionType: '작동기능점검',
    },
    vendorId: 'sh_vendor5',
  },
  // 마포 상가 - 승강기
  {
    id: 'f13', propertyId: 'p3', buildingId: 'b3', category: 'ELEVATOR', name: '상가 승강기',
    status: 'UNDER_REPAIR', installationDate: '2005-03-10', initialCost: 35000000,
    inspectionCycle: 1, lastInspectionDate: '2025-07-10', nextInspectionDate: '2026-01-10',
    spec: {}, vendorId: 'sh_vendor1',
  },
  // 마포 상가 - 전기
  {
    id: 'f14', propertyId: 'p3', buildingId: 'b3', category: 'ELECTRICAL', name: '상가 수전설비',
    status: 'OPERATIONAL', installationDate: '2005-03-10', initialCost: 15000000,
    inspectionCycle: 24, lastInspectionDate: '2025-04-01', nextInspectionDate: '2027-04-01',
    spec: {
      receivingCapacity: 200, transformerCapacity: 300, receivingMethod: '고압',
      emergencyGenerator: '무', safetyManager: '이전기',
    },
    vendorId: 'sh_vendor4',
  },
];

// ==========================================
// 시설 점검 이력
// ==========================================
export const INIT_FACILITY_LOGS: FacilityLog[] = [
  {
    id: 'fl1', facilityId: 'f1', date: '2025-11-15', type: 'INSPECTION',
    title: '승강기 정기검사', description: '한국승강기안전공단 정기검사 합격', cost: 0, performer: '한국승강기안전공단', isLegal: true,
  },
  {
    id: 'fl2', facilityId: 'f3', date: '2025-09-20', type: 'INSPECTION',
    title: '소방시설 종합정밀점검', description: '전 층 소방시설 종합정밀점검 완료, 3층 감지기 1개 교체', cost: 350000, performer: '(주)소방테크', isLegal: true,
  },
  {
    id: 'fl3', facilityId: 'f4', date: '2025-06-10', type: 'INSPECTION',
    title: '전기설비 정기검사', description: '한국전기안전공사 정기검사 합격, 접지저항 정상', cost: 0, performer: '한국전기안전공사', isLegal: true,
  },
  {
    id: 'fl4', facilityId: 'f7', date: '2025-10-01', type: 'INSPECTION',
    title: '냉난방기 정기점검', description: '냉매량 점검 및 필터 교체 완료', cost: 1200000, performer: '캐리어 서비스', isLegal: false,
  },
  {
    id: 'fl5', facilityId: 'f8', date: '2025-07-15', type: 'INSPECTION',
    title: '오수처리시설 수질측정', description: 'BOD, SS, 대장균 등 수질기준 적합', cost: 250000, performer: '(주)그린환경', isLegal: true,
  },
  {
    id: 'fl6', facilityId: 'f13', date: '2025-12-01', type: 'REPAIR',
    title: '승강기 도어 수리', description: '3층 도어 개폐 불량 수리, 부품 교체', cost: 850000, performer: '오티스엘리베이터', isLegal: false,
  },
  {
    id: 'fl7', facilityId: 'f6', date: '2025-10-15', type: 'INSPECTION',
    title: '보안설비 점검', description: '전체 카메라 48대 화각 점검, 녹화 정상 확인', cost: 0, performer: '에스원', isLegal: false,
  },
  {
    id: 'fl8', facilityId: 'f9', date: '2025-09-01', type: 'INSPECTION',
    title: '저수조 청소 및 수질검사', description: '저수조 내부 청소, 수질검사 적합', cost: 450000, performer: '(주)그린환경', isLegal: true,
  },
];

// ==========================================
// 감정평가 이력
// ==========================================
export const INIT_VALUATIONS: ValuationHistory[] = [
  // 강남 시그니처 토지
  { id: 'v1', targetId: 'l1', targetType: 'LOT', year: 2022, officialValue: 45000000, marketValue: 55000000, note: '공시지가' },
  { id: 'v2', targetId: 'l1', targetType: 'LOT', year: 2023, officialValue: 48000000, marketValue: 60000000, note: '주변 개발 반영' },
  { id: 'v3', targetId: 'l1', targetType: 'LOT', year: 2024, officialValue: 52000000, marketValue: 68000000, note: '최신 공시지가' },
  { id: 'v4', targetId: 'l1', targetType: 'LOT', year: 2025, officialValue: 55000000, marketValue: 72000000, note: 'GTX 개통 효과' },
  // 강남 시그니처 건물
  { id: 'v5', targetId: 'b1', targetType: 'BUILDING', year: 2022, officialValue: 12000000000, marketValue: 15000000000, note: '시가표준액' },
  { id: 'v6', targetId: 'b1', targetType: 'BUILDING', year: 2023, officialValue: 12500000000, marketValue: 16500000000, note: '리모델링 효과' },
  { id: 'v7', targetId: 'b1', targetType: 'BUILDING', year: 2024, officialValue: 13200000000, marketValue: 18000000000, note: '최신 감정가' },
  { id: 'v8', targetId: 'b1', targetType: 'BUILDING', year: 2025, officialValue: 13800000000, marketValue: 19500000000, note: '임대수익 반영' },
  // 서초 메디컬 토지
  { id: 'v9', targetId: 'l2', targetType: 'LOT', year: 2024, officialValue: 38000000, marketValue: 48000000 },
  { id: 'v10', targetId: 'l2', targetType: 'LOT', year: 2025, officialValue: 40000000, marketValue: 51000000 },
  // 서초 메디컬 건물
  { id: 'v11', targetId: 'b2', targetType: 'BUILDING', year: 2024, officialValue: 2800000000, marketValue: 3500000000 },
  // 마포 상가 토지
  { id: 'v12', targetId: 'l3', targetType: 'LOT', year: 2024, officialValue: 22000000, marketValue: 28000000 },
  { id: 'v13', targetId: 'l3', targetType: 'LOT', year: 2025, officialValue: 24000000, marketValue: 31000000, note: '마포대로 상권 활성화' },
];

// ==========================================
// 시세 비교
// ==========================================
export const INIT_COMPARABLES: MarketComparable[] = [
  { id: 'c1', propertyId: 'p1', name: '강남 타워', address: '서울특별시 강남구 역삼동 101', date: '2025-08-10', deposit: 100000000, monthlyRent: 10000000, adminFee: 1500000, area: 400, floor: 10, distance: 150, note: '역세권 대형' },
  { id: 'c2', propertyId: 'p1', name: '테헤란 스퀘어', address: '서울특별시 강남구 역삼동 105', date: '2025-06-20', deposit: 200000000, monthlyRent: 12000000, adminFee: 1800000, area: 450, floor: 5, distance: 300, note: '리모델링 완료' },
  { id: 'c3', propertyId: 'p1', name: '역삼 센트럴', address: '서울특별시 강남구 역삼동 110', date: '2025-10-05', deposit: 150000000, monthlyRent: 9500000, adminFee: 1400000, area: 380, floor: 8, distance: 500, note: '신축 2년차' },
  { id: 'c4', propertyId: 'p2', name: '서초 메디타운', address: '서울특별시 서초구 서초동 210', date: '2025-07-15', deposit: 180000000, monthlyRent: 9000000, adminFee: 1200000, area: 200, floor: 3, distance: 200, note: '의료 특화' },
  { id: 'c5', propertyId: 'p3', name: '공덕역 상가', address: '서울특별시 마포구 공덕동 60', date: '2025-09-01', deposit: 40000000, monthlyRent: 3000000, adminFee: 400000, area: 130, floor: 1, distance: 100, note: '역세권 1층' },
];

// ==========================================
// 납입/청구
// ==========================================
export const INIT_TRANSACTIONS: PaymentTransaction[] = [
  // 2025-12 ~ 2026-02 임대료
  // 카페 블루보틀 (u1)
  { id: 'tx1', contractId: 'lc1', contractType: 'LEASE', targetMonth: '2025-12', type: 'RENT', amount: 8500000, dueDate: '2025-12-05', status: 'PAID', paidDate: '2025-12-04', taxInvoiceIssued: true },
  { id: 'tx2', contractId: 'lc1', contractType: 'LEASE', targetMonth: '2026-01', type: 'RENT', amount: 8500000, dueDate: '2026-01-05', status: 'PAID', paidDate: '2026-01-05', taxInvoiceIssued: true },
  { id: 'tx3', contractId: 'lc1', contractType: 'LEASE', targetMonth: '2026-02', type: 'RENT', amount: 8500000, dueDate: '2026-02-05', status: 'UNPAID', taxInvoiceIssued: true },
  // 미래전자 (u4)
  { id: 'tx4', contractId: 'lc2', contractType: 'LEASE', targetMonth: '2025-12', type: 'RENT', amount: 25000000, dueDate: '2025-12-01', status: 'PAID', paidDate: '2025-11-29', taxInvoiceIssued: true },
  { id: 'tx5', contractId: 'lc2', contractType: 'LEASE', targetMonth: '2026-01', type: 'RENT', amount: 25000000, dueDate: '2026-01-01', status: 'PAID', paidDate: '2025-12-30', taxInvoiceIssued: true },
  { id: 'tx6', contractId: 'lc2', contractType: 'LEASE', targetMonth: '2026-02', type: 'RENT', amount: 25000000, dueDate: '2026-02-01', status: 'UNPAID', taxInvoiceIssued: true },
  // 세종법률 (u5)
  { id: 'tx7', contractId: 'lc3', contractType: 'LEASE', targetMonth: '2026-01', type: 'RENT', amount: 22000000, dueDate: '2026-01-10', status: 'PAID', paidDate: '2026-01-09', taxInvoiceIssued: true },
  { id: 'tx8', contractId: 'lc3', contractType: 'LEASE', targetMonth: '2026-02', type: 'RENT', amount: 22000000, dueDate: '2026-02-10', status: 'UNPAID', taxInvoiceIssued: true },
  // 디지털솔루션 (u3)
  { id: 'tx9', contractId: 'lc4', contractType: 'LEASE', targetMonth: '2026-02', type: 'RENT', amount: 12000000, dueDate: '2026-02-05', status: 'UNPAID', taxInvoiceIssued: false },
  // 굿닥터 내과 (u11) - 연체
  { id: 'tx10', contractId: 'lc5', contractType: 'LEASE', targetMonth: '2026-01', type: 'RENT', amount: 10000000, dueDate: '2026-01-10', status: 'OVERDUE', taxInvoiceIssued: true },
  { id: 'tx11', contractId: 'lc5', contractType: 'LEASE', targetMonth: '2026-02', type: 'RENT', amount: 10000000, dueDate: '2026-02-10', status: 'UNPAID', taxInvoiceIssued: true },
  // 관리비
  { id: 'tx12', contractId: 'lc1', contractType: 'LEASE', targetMonth: '2026-02', type: 'ADMIN_FEE', amount: 1200000, dueDate: '2026-02-05', status: 'UNPAID', taxInvoiceIssued: false },
  { id: 'tx13', contractId: 'lc2', contractType: 'LEASE', targetMonth: '2026-02', type: 'ADMIN_FEE', amount: 3500000, dueDate: '2026-02-01', status: 'UNPAID', taxInvoiceIssued: false },
  // 유지보수 비용 (지출)
  { id: 'tx_exp1', contractId: 'mc1', contractType: 'MAINTENANCE', targetMonth: '2026-01', type: 'MAINTENANCE_COST', amount: -1200000, dueDate: '2026-01-25', status: 'PAID', taxInvoiceIssued: true },
  { id: 'tx_exp2', contractId: 'mc2', contractType: 'MAINTENANCE', targetMonth: '2026-01', type: 'MAINTENANCE_COST', amount: -2500000, dueDate: '2026-01-25', status: 'PAID', taxInvoiceIssued: true },
  { id: 'tx_exp3', contractId: 'mc3', contractType: 'MAINTENANCE', targetMonth: '2026-01', type: 'MAINTENANCE_COST', amount: -3200000, dueDate: '2026-01-25', status: 'PAID', taxInvoiceIssued: true },
  { id: 'tx_exp4', contractId: 'mc4', contractType: 'MAINTENANCE', targetMonth: '2026-02', type: 'MAINTENANCE_COST', amount: -800000, dueDate: '2026-02-10', status: 'UNPAID', taxInvoiceIssued: false },
];
