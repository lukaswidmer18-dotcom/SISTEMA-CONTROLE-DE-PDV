export type UserRole = 'ADMIN' | 'PROMOTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  monthlySalary?: number | null;
  company?: string | null;
  createdAt?: string;
}

export interface DegustacaoSolicitacao {
  id: string;
  requesterName: string;
  date: string;
  city: string;
  address: string;
  store: string;
  clifor: string;
  productEvent: string;
  eventTime: string;
  supervisor: string;
  sellerName: string;
  justification: string;
  documentPath?: string | null;
  documentFileName?: string | null;
  documentOriginalName?: string | null;
  status: 'pendente' | 'aprovada' | 'reprovada';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
}

export interface PDV {
  id: string;
  name: string;
  cliforCode: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  channel: string;
  network: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
  active: boolean;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  sku: string;
  active: boolean;
  createdAt?: string;
  pdvs?: Pick<PDV, 'id' | 'name'>[];
}

export type PontoType = 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO';

export interface Ponto {
  id: string;
  userId: string;
  type: PontoType;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAvailable: boolean;
  batteryLevel?: number | null;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export type VisitStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface Photo {
  id: string;
  visitId: string;
  checklistItemId?: string | null;
  filePath: string;
  fileName: string;
  latitude?: number | null;
  longitude?: number | null;
  uploadedAt: string;
  checklistItem?: ChecklistItem | null;
}

export type FormType = 'VALIDADE' | 'RUPTURA' | 'PRECO';
export type FormFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'PHOTO';

export interface FormFieldConfig {
  id: string;
  formType: FormType;
  fieldKey: string;
  label: string;
  fieldType: FormFieldType;
  core: boolean;
  lockedActive: boolean;
  lockedRequired: boolean;
  active: boolean;
  required: boolean;
  order: number;
  createdAt?: string;
}

export interface FormTypeConfig {
  formType: FormType;
  title: string;
  description: string;
}

export type ChecklistItemType = 'TEXTO' | 'MULTIPLA_ESCOLHA' | 'SIM_NAO' | 'FOTO';

export interface ChecklistItem {
  id: string;
  label: string;
  type: ChecklistItemType;
  order: number;
  requiredCount: number;
  required: boolean;
  options: string[] | null;
  photoTriggerValues: string[] | null;
  active: boolean;
  createdAt?: string;
}

export interface ChecklistResponse {
  id: string;
  visitId: string;
  checklistItemId: string;
  value: string;
  checklistItem?: ChecklistItem;
  createdAt?: string;
}

export interface Validity {
  id: string;
  visitId: string;
  productId: string;
  expiryDate: string;
  quantity: number;
  extraFields?: Record<string, string | number> | null;
  product?: Product;
  createdAt?: string;
}

export interface VisitRating {
  id: string;
  visitId: string;
  score: number;
  ratedById: string | null;
  ratedAt: string;
}

export interface RupturaRegistro {
  id: string;
  visitId: string;
  productId: string;
  qtyGondola: number;
  qtyDeposito: number;
  qtySeparadoTroca: number;
  extraFields?: Record<string, string | number> | null;
  product?: Product;
  createdAt?: string;
}

export type RupturaRiskLevel = 'CRITICO' | 'ATENCAO' | 'OK';

export interface RupturaAlerta {
  id: string;
  pdvId: string;
  pdvName: string;
  pdvCity: string;
  productId: string;
  productName: string;
  promotorName: string | null;
  qtyGondola: number;
  qtyDeposito: number;
  qtySeparadoTroca: number;
  extraFields?: Record<string, string | number> | null;
  checkedAt: string;
  riskLevel: RupturaRiskLevel;
}

export interface PriceCheck {
  id: string;
  visitId: string;
  productId: string;
  ownPrice: number;
  competitorName?: string | null;
  competitorPrice?: number | null;
  photoPath?: string | null;
  photoFileName?: string | null;
  extraFields?: Record<string, string | number> | null;
  product?: Product;
  visit?: { pdv?: PDV; promotor?: Pick<User, 'id' | 'name'> };
  createdAt?: string;
}

export interface Visit {
  id: string;
  promotorId: string | null;
  pdvId: string | null;
  status: VisitStatus;
  startedAt: string;
  completedAt?: string | null;
  noProductsFound: boolean;
  latitudeStart?: number | null;
  longitudeStart?: number | null;
  latitudeEnd?: number | null;
  longitudeEnd?: number | null;
  boxesGenerated?: number | null;
  pdv?: PDV;
  promotor?: Pick<User, 'id' | 'name' | 'email'>;
  photos?: Photo[];
  checklistResponses?: ChecklistResponse[];
  validities?: Validity[];
  rupturas?: RupturaRegistro[];
  priceChecks?: PriceCheck[];
  rating?: VisitRating | null;
  _count?: { photos: number; validities: number };
  outsideRoute?: boolean;
}

export interface PromotorRanking {
  promotorId: string;
  promotorName: string;
  avgRating: number | null;
  ratedVisitsCount: number;
  totalRotas: number;
  justificadas: number;
  justificationRate: number;
  visitadas: number;
  coverageRate: number | null;
  finalScore: number | null;
}

export interface RotaVisita {
  id: string;
  promotorId: string | null;
  pdvId: string | null;
  date: string;
  order: number;
  justification?: string | null;
  justifiedAt?: string | null;
  pdv?: PDV;
  promotor?: Pick<User, 'id' | 'name' | 'email'>;
  createdAt?: string;
}

export type CoverageStatus = 'NAO_ATENDIDO' | 'EM_ATENDIMENTO' | 'ATENDIDO';

export interface CoverageEntry {
  rotaId: string;
  pdvId: string;
  pdvName: string;
  pdvCity: string;
  latitude?: number | null;
  longitude?: number | null;
  promotorId: string | null;
  promotorName: string | null;
  status: CoverageStatus;
  checkin: { latitude: number | null; longitude: number | null; time: string } | null;
}

export interface PdvNaoVisitado {
  pdvId: string;
  name: string;
  city: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
}

export interface VisitCostEntry {
  visitId: string;
  pdvId: string | null;
  pdvName: string | null;
  pdvCity: string | null;
  promotorId: string | null;
  promotorName: string | null;
  completedAt: string;
  durationHours: number;
  hourlyCost: number | null;
  cost: number | null;
  boxes: number | null;
}

export interface PdvCostSummary {
  pdvId: string;
  pdvName: string;
  pdvCity: string;
  visitCount: number;
  cost: number | null;
  boxes: number | null;
  costPerBox: number | null;
  costPartial: boolean;
  boxesPartial: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
