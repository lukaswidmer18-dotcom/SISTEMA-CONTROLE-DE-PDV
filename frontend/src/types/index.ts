export type UserRole = 'ADMIN' | 'PROMOTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
}

export interface PDV {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
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
}

export type PontoType = 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA';

export interface Ponto {
  id: string;
  userId: string;
  type: PontoType;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAvailable: boolean;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export type VisitStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface Photo {
  id: string;
  visitId: string;
  filePath: string;
  fileName: string;
  latitude?: number | null;
  longitude?: number | null;
  uploadedAt: string;
}

export interface Validity {
  id: string;
  visitId: string;
  productId: string;
  expiryDate: string;
  quantity: number;
  product?: Product;
  createdAt?: string;
}

export interface Visit {
  id: string;
  promotorId: string;
  pdvId: string;
  status: VisitStatus;
  startedAt: string;
  completedAt?: string | null;
  noProductsFound: boolean;
  latitudeStart?: number | null;
  longitudeStart?: number | null;
  latitudeEnd?: number | null;
  longitudeEnd?: number | null;
  pdv?: PDV;
  promotor?: Pick<User, 'id' | 'name' | 'email'>;
  photos?: Photo[];
  validities?: Validity[];
  _count?: { photos: number; validities: number };
}

export interface RotaVisita {
  id: string;
  promotorId: string;
  pdvId: string;
  date: string;
  order: number;
  pdv?: PDV;
  promotor?: Pick<User, 'id' | 'name' | 'email'>;
  createdAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
