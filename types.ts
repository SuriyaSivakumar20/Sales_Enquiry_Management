
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  RSM = 'RSM',
  SALES_ENG = 'SALES_ENG',
  DEALER = 'DEALER',
  DSE = 'DSE'
}

export interface Organization {
  id: string;
  name: string;
  adminEmail: string;
  isApproved: boolean;
  createdAt: string;
}

export interface UserHierarchy {
  rsmEmail?: string;
  seEmails?: string[];
  dealerEmails?: string[];
  dseEmails?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  parentId?: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  isApproved: boolean;
  hierarchy?: UserHierarchy;
}

export interface Customer {
  id: string;
  createdBy: string;
  organizationId: string;
  name: string;
  address: string;
  pinCode: string;
  contactPerson: string;
  contactNumber: string;
  businessSector: string;
  tungaloyShare: number;
  annualPotential: number;
  competitors: {
    name: string;
    share: number;
  }[];
  fyPlan: string;
}

export enum PlanType {
  NEW_PROJECT = 'NEW PROJECT',
  CONVERSION = 'CONVERSION',
  RETENTION = 'RETENTION'
}

export interface Attachment {
  name: string;
  data: string; // Base64 or URL
  type: 'photo' | 'document';
}

export interface AIParameter {
  category: string;
  parameter: string;
  unit: string;
  description: string;
  value: string; 
}

export interface UpdateLogEntry {
  status: string;
  updatedBy: string; 
  updatedById: string; 
  timestamp: string;
}

export interface BasePlan {
  id: string;
  type: PlanType;
  customerId: string;
  organizationId: string; 
  projectName: string;
  machineType: string;
  machineManufacturer?: string; 
  machineAiParameters?: AIParameter[]; 
  machineDetail: string; 
  sqShankSize?: string; 
  spindleTaper?: string; 
  componentMaterial: string;
  materialHardness: string;
  inputCondition: string;
  status: string;
  updateStatus?: string; 
  updateStatusLog?: UpdateLogEntry[]; 
  responsibility: string;
  createdAt: string;
  createdBy: string;
  valueLakhs: number;
  attachments?: Attachment[];
  customFields?: Record<string, string>; 
}

export interface ProjectPlan extends BasePlan {
  cycleTime: boolean; 
  toolList: boolean;  
  requiredDate: string;
}

export interface ConversionPlan extends BasePlan {
  existingCompetitor: string;
  competitorProduct: string;
  unitPrice: number;
  monthlyQty?: number; 
  reasonForConversion: string;
  machineDetails?: string; 
  operation?: string; 
  solutionType?: 'TUNGALOY' | 'NTK';
  catalogItemDescription?: string;
  aiParameters?: AIParameter[];
}

export interface RetentionPlan extends BasePlan {
  tungaloyProductDesc: string;
  reasonForTrial: string;
  competitorName: string;
  competitorProductDesc: string;
  operation: string;
  solutionType?: 'TUNGALOY' | 'NTK';
  catalogItemDescription?: string;
  aiParameters?: AIParameter[];
  unitPrice?: number; 
  monthlyQty?: number; 
}

export type AnyPlan = ProjectPlan | ConversionPlan | RetentionPlan;