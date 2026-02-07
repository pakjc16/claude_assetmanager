
export type StakeholderType = 'INDIVIDUAL' | 'CORPORATE';
export type StakeholderRole = 'LANDLORD' | 'TENANT' | 'MANAGER' | 'VENDOR' | 'SAFETY_OFFICER';

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
  };
  note?: string;
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
}

export type PropertyType = 'AGGREGATE' | 'LAND_AND_BUILDING' | 'LAND';

export interface Lot {
  id: string;
  address: JibunAddress;
  jimok: string;
  area: number;
  pnu?: string;  // VWorld PNU 코드 (토지정보 조회용)
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
}

export type LeaseType = 'LEASE_OUT' | 'LEASE_IN' | 'SUBLEASE_OUT' | 'SUBLEASE_IN';
export type ManagementItem = 'ELECTRICITY' | 'WATER' | 'GAS' | 'INTERNET' | 'TV' | 'CLEANING' | 'ELEVATOR' | 'SECURITY' | 'PARKING';
export type ContractTargetType = 'PROPERTY' | 'BUILDING' | 'UNIT';

export interface LeaseFinancialTerm {
  id: string;
  startDate: string; 
  endDate: string;   
  deposit: number;
  monthlyRent: number;
  vatIncluded: boolean;
  paymentDay: number;
  paymentType: 'PREPAID' | 'POSTPAID';
  adminFee: number;
  managementItems: ManagementItem[];
  lateFeeRate?: number;
  bankAccount?: string;
  note?: string; 
}

export interface LeaseContract {
  id: string;
  type: LeaseType;
  targetType: ContractTargetType;
  targetId: string; 
  tenantId: string;
  parentContractId?: string; 
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';
  term: {
    contractDate: string;
    startDate: string;
    endDate: string;
    extensionType: 'NEW' | 'RENEWAL' | 'IMPLICIT';
  };
  financialTerms: LeaseFinancialTerm[];
  conditions: string[];
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

export type FacilityCategory = 'ELEVATOR' | 'ESCALATOR' | 'PARKING_MECHANICAL' | 'PARKING_BARRIER' | 'HVAC' | 'BOILER' | 'ELECTRICAL' | 'PLUMBING' | 'SEPTIC_TANK' | 'FIRE_SAFETY' | 'GAS' | 'EV_CHARGER' | 'HOIST' | 'OTHER';
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

export type MoneyUnit = 'WON' | 'THOUSAND' | 'MAN' | 'MILLION' | 'EOK';
export type AreaUnit = 'M2' | 'PYEONG';
