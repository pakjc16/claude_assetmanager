
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
  area: number;        
  usage: string;       
}

export interface BuildingSpec {
  buildingArea: number; 
  grossFloorArea: number; 
  floorCount: {
    underground: number;
    ground: number;
  };
  floors: FloorDetail[]; 
  completionDate: string;
  mainUsage: string;
  parkingCapacity: number;
  elevatorCount: number;
}

export interface Building {
  id: string;
  propertyId: string;
  name: string; 
  spec: BuildingSpec;
}

export type PropertyType = 'AGGREGATE' | 'LAND_AND_BUILDING' | 'LAND';

export interface Lot {
  id: string;
  address: JibunAddress; 
  jimok: string;   
  area: number;    
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
