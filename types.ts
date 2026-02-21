
export type StakeholderType = 'INDIVIDUAL' | 'SOLE_PROPRIETOR' | 'CORPORATE' | 'INTERNAL_ORG' | 'CUSTOM_GROUP';
export type StakeholderRole = 'LANDLORD' | 'TENANT' | 'MANAGER' | 'VENDOR' | 'SAFETY_OFFICER';

// 조직도 부서 정보
export interface Department {
  id: string;
  name: string;
  parentId?: string;  // 상위 부서 ID
  employeeIds: string[];  // 소속 직원 ID 목록
}

// 연관인물 정보
export interface RelatedPerson {
  personId: string;  // Stakeholder ID
  relationship: string;  // 관계 (예: 배우자, 가족, 동업자 등)
}

// 계좌정보
export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  type: StakeholderType;
  roles: StakeholderRole[];
  registrationNumber: string;
  businessRegistrationNumber?: string;
  businessLicenseFile?: string;
  representative?: string;
  contact: {
    phone: string;
    email: string;
    address?: string;
    addressDetail?: string;
  };
  additionalContacts?: { label: string; phone: string }[];
  note?: string;

  // 개인 정보 확장
  companyId?: string;  // 소속회사 (INDIVIDUAL, SOLE_PROPRIETOR용)
  departmentId?: string;  // 소속부서 ID
  isLeader?: boolean;  // 조직장 여부
  position?: string;  // 직급 (예: 사원, 대리, 과장, 차장, 부장 등)
  jobTitle?: string;  // 직책 (예: 팀장, 본부장, 실장 등)
  jobFunction?: string;  // 직무 (수동 입력)

  // 계좌정보
  bankAccounts?: BankAccount[];  // 여러 계좌 가능

  // 세금계산서 발행주소
  taxInvoiceAddress?: string;

  // 연관인물 (INDIVIDUAL용)
  relatedPersons?: RelatedPerson[];

  // 임의그룹용 (CUSTOM_GROUP)
  groupName?: string;  // 그룹 이름
  memberIds?: string[];  // 그룹 구성원 ID 목록

  // 조직도 (SOLE_PROPRIETOR, CORPORATE, INTERNAL_ORG용)
  departments?: Department[];
}

export interface JibunAddress {
  sido: string;
  sigungu: string;
  eupMyeonDong: string;
  li?: string;
  bonbun: string;
  bubun?: string;
}

export interface FloorDetail {
  floorNumber: number;
  area: number;           // 층별 면적 (㎡)
  exclusiveArea?: number; // 전용면적 (㎡) - 수동입력 또는 계산
  exclusiveRatio?: number; // 전용률 (%) - 수동입력
  usage: string;          // 용도
  structure?: string;     // 구조
  deposit?: number;       // 보증금 (원)
  monthlyRent?: number;   // 월차임 (원)
  maintenanceFee?: number; // 관리비 (원)
}

export interface BuildingSpec {
  buildingArea: number;      // 건축면적
  grossFloorArea: number;    // 연면적
  totalDongArea?: number;    // 총동연면적
  floorCount: {
    underground: number;
    ground: number;
  };
  floors: FloorDetail[];
  completionDate: string;    // 사용승인일
  permitDate?: string;       // 허가일
  startDate?: string;        // 착공일
  mainUsage: string;         // 주용도
  detailUsage?: string;      // 기타용도 (상세)
  structure?: string;        // 구조
  roofType?: string;         // 지붕
  height?: number;           // 높이(m)
  parkingCapacity: number;   // 총 주차대수
  parkingDetail?: {          // 주차 상세
    indoorMech: number;      // 옥내기계식
    indoorSelf: number;      // 옥내자주식
    outdoorMech: number;     // 옥외기계식
    outdoorSelf: number;     // 옥외자주식
  };
  elevatorCount: number;     // 총 승강기
  elevatorDetail?: {         // 승강기 상세
    passenger: number;       // 승용
    emergency: number;       // 비상용
  };
  householdCount?: number;   // 세대수
  unitCount?: number;        // 호수
  earthquakeDesign?: boolean; // 내진설계 적용여부
}

export interface Building {
  id: string;
  propertyId: string;
  name: string;              // 동명칭 또는 건물명
  mgmBldrgstPk?: string;     // 관리건축물대장PK (API 연동용)
  spec: BuildingSpec;
  ownerId?: string;          // 소유자 ID (Stakeholder)
}

export type PropertyType = 'AGGREGATE' | 'LAND_AND_BUILDING' | 'LAND';

export interface Lot {
  id: string;
  address: JibunAddress;
  jimok: string;
  area: number;
  pnu?: string;  // VWorld PNU 코드 (토지정보 조회용)
  ownerId?: string;  // 소유자 ID (Stakeholder)
}

export interface PropertyPhoto {
  id: string;
  url: string;
  name?: string;           // 사진 이름
  caption?: string;
  uploadedAt: string;
  // 연계 정보
  linkedType?: 'PROPERTY' | 'LOT' | 'BUILDING' | 'FLOOR' | 'UNIT';
  linkedLotId?: string;    // 토지 연계
  linkedBuildingId?: string; // 건물 연계
  linkedFloor?: number;    // 층 연계
  linkedUnitId?: string;   // 호실 연계
}

export interface Property {
  id: string;
  type: PropertyType;
  name: string;
  masterAddress: JibunAddress;
  roadAddress?: string;
  lots: Lot[];
  buildings: Building[];
  totalLandArea: number;
  ownerId?: string;      // 소유자 ID (Stakeholder)
  managerId?: string;
  photos?: PropertyPhoto[];
}

export interface Unit {
  id: string;
  propertyId: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  area: number;
  usage: string;
  status: 'OCCUPIED' | 'VACANT' | 'UNDER_REPAIR';
  rentType?: string;
  deposit?: number;
  monthlyRent?: number;
  ownerId?: string;  // 소유자 ID (Stakeholder)
}

export type LeaseType = 'LEASE_OUT' | 'LEASE_IN' | 'SUBLEASE_OUT' | 'SUBLEASE_IN';
export type ContractTargetType = 'PROPERTY' | 'BUILDING' | 'FLOOR' | 'UNIT';
export type SettlementMethod = 'FIXED' | 'ACTUAL_COST';
export type CollateralType = 'MORTGAGE' | 'JEONSE_RIGHT' | 'GUARANTEE_INSURANCE' | 'PLEDGE';

export interface CostItem {
  id: string;
  label: string;
  method: SettlementMethod;
  amount: number;
  vatIncluded: boolean;
  note?: string;
}

export interface ContractAttachment {
  id: string;
  name: string;
  contractDate: string;
  fileName: string;
  fileData?: string;
  uploadedAt: string;
}

export interface ContractTerm {
  id: string;
  termNumber: number;
  type: 'NEW' | 'RENEWAL' | 'IMPLICIT';
  contractDate: string;
  startDate: string;
  endDate: string;
  deposit: number;
  monthlyRent: number;
  rentVatIncluded: boolean;
  paymentDay: number;
  paymentType: 'PREPAID' | 'POSTPAID';
  costItems: CostItem[];
  rentIncreaseRate?: number;
  attachments: ContractAttachment[];
  note?: string;
}

export interface DepositCollateral {
  id: string;
  type: CollateralType;
  amount: number;
  targetType: 'LOT' | 'BUILDING' | 'JOINT';
  targetIds: string[];
  priority: number;
  registrationDate?: string;
  expirationDate?: string;
  insuranceCompany?: string;
  policyNumber?: string;
  note?: string;
}

export interface ContractConditions {
  renewalNoticePeriod?: number;
  rentIncreaseRate?: number;
  rentIncreaseCap?: number;
  restorationRequired: boolean;
  restorationNote?: string;
  subleaseAllowed: boolean;
  subleaseNote?: string;
  specialTerms: string[];
}

export interface LeaseContract {
  id: string;
  type: LeaseType;
  targetType: ContractTargetType;
  targetIds: string[];
  landlordIds: string[];
  tenantIds: string[];
  parentContractId?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';
  originalContractDate: string;
  terms: ContractTerm[];
  conditions: ContractConditions;
  collaterals: DepositCollateral[];
  note?: string;
}

export interface MaintenanceContract {
  id: string;
  targetType: ContractTargetType;
  targetId: string; 
  vendorId: string;
  facilityId?: string;
  serviceType: 'CLEANING' | 'SECURITY' | 'ELEVATOR' | 'FIRE_SAFETY' | 'INTERNET' | 'REPAIR' | 'LANDSCAPING' | 'DISINFECTION';
  status: 'ACTIVE' | 'EXPIRED';
  isRecurring: boolean;
  paymentDay?: number;
  term: {
    startDate: string;
    endDate: string;
  };
  monthlyCost: number;
  details: string;
}

export type UtilityCategory = 'ELECTRICITY' | 'WATER' | 'GAS' | 'INTERNET' | 'TV' | 'OTHER';
export type UtilityBillingCycle = 'MONTHLY' | 'BI_MONTHLY_ODD' | 'BI_MONTHLY_EVEN';

export interface UtilityContract {
  id: string;
  targetType: ContractTargetType;
  targetId: string;
  category: UtilityCategory;
  provider: string; 
  customerNumber: string; 
  contact: string; 
  status: 'ACTIVE' | 'EXPIRED';
  startDate: string;
  endDate?: string; 
  billingCycle: UtilityBillingCycle; 
  paymentDay: number; 
  paymentMethod: string; 
  note?: string;
}

export interface PaymentTransaction {
  id: string;
  contractId: string;
  contractType: 'LEASE' | 'MAINTENANCE' | 'UTILITY';
  targetMonth: string;
  type: 'RENT' | 'ADMIN_FEE' | 'MAINTENANCE_COST' | 'DEPOSIT' | 'UTILITY_COST'; 
  amount: number;
  dueDate: string;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIAL';
  paidDate?: string;
  taxInvoiceIssued: boolean;
  breakdown?: {
      supplyValue: number;
      vat: number;
      fundAmount: number;
  };
}

export interface DashboardFinancials {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  collectedAmount: number;
  overdueAmount: number;
  collectionRate: number;
  monthlyHistory: any[];
}

export interface ValuationHistory {
  id: string;
  targetId: string; 
  targetType: 'PROPERTY' | 'LOT' | 'BUILDING';
  year: number;
  officialValue: number; 
  marketValue?: number;  
  note?: string;
}

export interface MarketComparable {
  id: string;
  propertyId: string; 
  name: string;       
  address?: string;   
  date: string;       
  deposit: number;    
  monthlyRent: number;
  adminFee: number;   
  area: number;       
  floor: number;      
  distance: number;   
  note?: string;
}

export type FacilityCategory = 'ELEVATOR' | 'ESCALATOR' | 'PARKING_MECHANICAL' | 'PARKING_BARRIER' | 'HVAC' | 'BOILER' | 'ELECTRICAL' | 'PLUMBING' | 'SEPTIC_TANK' | 'FIRE_SAFETY' | 'GAS' | 'EV_CHARGER' | 'HOIST' | 'SECURITY' | 'OTHER';
export type FacilityStatus = 'OPERATIONAL' | 'UNDER_REPAIR' | 'INSPECTION_DUE' | 'MALFUNCTION';

export interface Facility {
  id: string;
  propertyId: string; 
  buildingId?: string;
  unitId?: string;      // 호실 연동 추가
  floorNumber?: number; // 층 연동 추가
  category: FacilityCategory;
  name: string; 
  modelName?: string; 
  status: FacilityStatus;
  installationDate: string; 
  initialCost: number; 
  vendorId?: string; 
  safetyOfficerId?: string; 
  inspectionCycle: number; 
  lastInspectionDate: string; 
  nextInspectionDate: string; 
  spec: Record<string, any>;
  note?: string;
}

export interface FacilityLog {
  id: string;
  facilityId: string;
  date: string;
  type: 'INSPECTION' | 'REPAIR' | 'REPLACEMENT' | 'ACCIDENT' | 'OTHER';
  title: string;
  description: string;
  cost: number;
  performer: string;
  isLegal: boolean;
  attachment?: string;
}

// 승강기 전용 상세 정보 (API 응답 필드 기준)
export interface ElevatorInfo {
  elevatorNo?: string;               // 승강기번호 (elevatorNo)
  buldNm?: string;                   // 건물명 (buldNm)
  address1?: string;                 // 소재지 (address1)
  address2?: string;                 // 소재지 상세 (address2)
  manufacturerName?: string;         // 제조업체 (manufacturerName)
  elvtrModel?: string;               // 모델명 (elvtrModel)
  elvtrKindNm?: string;              // 승강기종류1 (elvtrKindNm) - 예: 장애인용
  elvtrDivNm?: string;               // 승강기종류2 (elvtrDivNm) - 예: 엘리베이터
  elvtrStts?: string;                // 상태 (elvtrStts) - 예: 운행중
  liveLoad?: number;                 // 적재하중 Kg (liveLoad)
  ratedCap?: number;                 // 최대정원 인승 (ratedCap)
  shuttleSection?: string;           // 운행구간 (shuttleSection)
  shuttleFloorCnt?: number;          // 운행층수 (shuttleFloorCnt)
  divGroundFloorCnt?: number;        // 지상층수 (divGroundFloorCnt)
  divUndgrndFloorCnt?: number;       // 지하층수 (divUndgrndFloorCnt)
  ratedSpeed?: number;               // 정격속도 m/min (ratedSpeed)
  lastInspctDe?: string;             // 최종검사일 (lastInspctDe)
  applcBeDt?: string;                // 검사유효기간 시작 (applcBeDt)
  applcEnDt?: string;                // 검사유효기간 종료 (applcEnDt)
  frstInstallationDe?: string;       // 최초설치일 (frstInstallationDe)
  installationDe?: string;           // 설치일자 (installationDe)
  partcpntNm?: string;               // 관리주체 (partcpntNm)
  partcpntTelno?: string;            // 관리주체 연락처 (partcpntTelno)
  mntCpnyNm?: string;                // 유지관리업체 (mntCpnyNm)
  mntCpnyTelno?: string;             // 유지관리업체 연락처 (mntCpnyTelno)
  subcntrCpny?: string;              // 하도급유지보수업체 (subcntrCpny)
  inspctInstt?: string;              // 최종검사기관 (inspctInstt)
}

// 보험 정보
export interface ElevatorInsurance {
  id: string;
  facilityId: string;
  insuranceCompany?: string;         // 보험사명
  insuranceProduct?: string;         // 보험상품명
  insurancePeriod?: string;          // 보험기간
}

// 안전관리자 정보
export interface ElevatorSafetyManager {
  id: string;
  facilityId: string;
  managerName: string;               // 안전관리자명
  managerContact?: string;           // 안전관리자 연락처
  appointmentDate?: string;          // 안전관리자 임명일
  educationCompletionDate?: string;  // 교육 이수일
  educationValidPeriod?: string;     // 교육 유효기간
}

// 검사이력
export interface ElevatorInspection {
  id: string;
  facilityId: string;
  inspectionType: string;            // 검사종류
  inspectionDate: string;            // 검사일
  suspensionPeriod?: string;         // 운행금지기간
  inspectionOrg: string;             // 검사기관
  inspector?: string;                // 검사원
  result: 'PASS' | 'FAIL' | 'PENDING'; // 합격여부
}

// 고장이력
export interface ElevatorMalfunction {
  id: string;
  facilityId: string;
  malfunctionDate: string;           // 고장일시
  reportDate?: string;               // 신고일시
  malfunctionType?: string;          // 고장유형
  malfunctionContent?: string;       // 고장내용
}

// 사고이력
export interface ElevatorAccident {
  id: string;
  facilityId: string;
  accidentDate: string;              // 사고일시
  accidentCause?: string;            // 사고원인
  damageStatus?: string;             // 피해현황
  casualties?: string;               // 인명사고
}

// 자재결함 이력
export interface ElevatorPartDefect {
  id: string;
  facilityId: string;
  inspectionYear: string;            // 점검년도
  inspectionCompany?: string;        // 점검업체
  defectName?: string;               // 결함명
  inspectionDate?: string;           // 점검일자
  defectManagement?: string;         // 자재점검관리
}

// 유지관리 계약현황
export interface ElevatorMaintenanceContract {
  id: string;
  facilityId: string;
  maintenanceCompany1?: string;      // 유지관리업체1
  maintenanceCompany2?: string;      // 유지관리업체2
  contractNumber?: string;           // 관리계약번호
  registeredElevatorNumber?: string; // 등록승강기번호
}

export type MoneyUnit = 'WON' | 'THOUSAND' | 'MAN' | 'MILLION' | 'EOK';
export type AreaUnit = 'M2' | 'PYEONG';

// ========================================
// 도면 및 조닝 시스템
// ========================================

// 도면 파일 정보
export interface FloorPlan {
  id: string;
  propertyId: string;
  buildingId: string;
  floorNumber: number;
  fileName: string;
  fileType: 'IMAGE' | 'PDF';
  fileData: string;  // Base64 데이터
  width: number;     // 원본 너비 (px)
  height: number;    // 원본 높이 (px)
  scale?: number;    // 축척 (예: 300 = 1/300)
  uploadedAt: string;
}

// 다각형 점 좌표 (0~1 정규화 좌표)
export interface ZonePoint {
  x: number;  // 0~1 (도면 너비 기준 비율)
  y: number;  // 0~1 (도면 높이 기준 비율)
}

// 조닝 영역 타입
export type ZoneType = 'FLOOR_BOUNDARY' | 'PLANNED' | 'LINKED';

// 조닝 세부용도
export type ZoneUsage = 'STORE' | 'COMMON' | 'OFFICE' | 'MEETING_ROOM' | 'STORAGE' | 'SAMPLE_ROOM' | 'CANTEEN' | 'RESTAURANT' | 'PARKING' | 'AUDITORIUM' | 'LIVING_ROOM' | 'MASTER_BEDROOM' | 'BEDROOM' | 'BATHROOM' | 'CORRIDOR' | 'VOID' | 'LANDSCAPE';

// 조닝 세부정보 (용도별 상세)
export interface ZoneDetail {
  usage: ZoneUsage;
  note?: string;
  // 사무실
  headcount?: number;
  departmentName?: string;
  // 회의실
  meetingCapacity?: number;
  // 창고/샘플실
  storageDepartment?: string;
  managerPrimary?: string;
  managerPrimaryId?: string;    // Stakeholder ID 참조
  managerSecondary?: string;
  managerSecondaryId?: string;  // Stakeholder ID 참조
  // 주차장
  parkingSpaces?: number;
  assignedVehicles?: string[];
  parkingAssignee?: string;
  parkingAssigneeId?: string;   // Stakeholder ID 참조
  // 화장실
  toiletCount?: number;
  urinalCount?: number;
  sinkCount?: number;
  // 방 자동 연번
  bedroomNumber?: number;
}

// 조닝 영역 정보
export interface FloorZone {
  id: string;
  floorPlanId: string;
  type: ZoneType;
  name: string;           // 영역 이름 (계획조닝: 임의 이름, 실제조닝: 호실명)
  color: string;          // 영역 색상 (HEX)
  opacity: number;        // 투명도 (0~1)
  points: ZonePoint[];    // 다각형 꼭짓점
  estimatedArea?: number; // 추정 면적 (㎡) - 바닥 기준 면적으로 계산
  linkedUnitId?: string;  // 연결된 호실 ID (실제조닝인 경우)
  parentZoneId?: string;  // 상위 영역 ID (분할된 경우)
  detail?: ZoneDetail;    // 세부용도 정보
  excludeFromGFA?: boolean; // 연면적 산입 제외
  labelOffsetX?: number;  // 레이블 X 오프셋 (정규화 좌표, 중심 대비)
  labelOffsetY?: number;  // 레이블 Y 오프셋 (정규화 좌표, 중심 대비)
  createdAt: string;
  updatedAt: string;
}

// ========================================
// 주차관리
// ========================================

export type VehicleType = 'SEDAN' | 'SUV' | 'VAN' | 'EV' | 'TRUCK' | 'OTHER';
export type ParkingStatus = 'IDLE' | 'OCCUPIED' | 'UNDER_REPAIR';

export interface ParkingSpot {
  id: string;
  propertyId: string;
  buildingId: string;
  floorNumber: number;
  zoneId: string;               // 연결된 FloorZone ID (PARKING 용도)
  spotNumber: string;           // 주차면 번호 (예: A-001)
  isDesignated: boolean;        // 지정주차 여부
  designatedPlate?: string;     // 지정 차량번호
  designatedPhoto?: string;     // 차량 사진 (base64)
  vehicleType?: VehicleType;    // 차량유형
  vehicleBrand?: string;        // 차종 브랜드
  vehicleModel?: string;        // 차종 모델명
  capacity: number;             // 주차대수 (기본 1, 탠덤주차 등)
  assigneeId?: string;          // 배정대상 Stakeholder ID 참조
  status: ParkingStatus;        // 주차상태
  assignmentStartDate?: string; // 배정 시작일
  assignmentEndDate?: string;   // 배정 유효기간
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 도면 뷰어 상태
export interface FloorPlanViewerState {
  zoom: number;
  panX: number;
  panY: number;
  selectedZoneId: string | null;
  isDrawing: boolean;
  drawingPoints: ZonePoint[];
  tool: 'SELECT' | 'DRAW_POLYGON' | 'DRAW_LINE' | 'EDIT_POINTS' | 'PAN';
}
