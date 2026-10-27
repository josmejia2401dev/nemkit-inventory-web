import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService, ApiResponse, PaginatedResponse } from "../../core/services/api.service";

export interface PlatformOverview {
  companies: number;
  users: number;
  employees: {
    total: number;
    active: number;
    inactive: number;
    archived: number;
    deleted: number;
    byRole: PlatformEmployeeRoleSummary[];
  };
  feedback: { open: number; total: number };
}

export interface PlatformEmployeeRoleSummary {
  role: string;
  total: number;
  active: number;
  inactive: number;
  archived: number;
}

export interface PlatformUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  userId: number | null;
  companyName: string;
  businessType: "retail" | "restaurant";
  employeeId: number | null;
  accountType: "company_owner" | "employee" | "unassigned_employee" | "super_admin";
  accountLabel: string;
  isOwner: boolean;
  isEmployee: boolean;
  isUnassigned: boolean;
  isSuperAdmin: boolean;
  recordStatus: string;
  role?: string;
  status?: "active" | "inactive";
  security?: {
    lastLoginAt?: string | null;
    lockedUntil?: string | null;
    mustChangePassword?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  employees?: PlatformUser[];
}

export interface PlatformCompany {
  id: number;
  companyName: string;
  businessType: "retail" | "restaurant";
  ownerName: string;
  ownerEmail: string;
  recordStatus: string;
  createdAt?: string;
  memberCount: number;
}

export interface PlatformCompanyDetail {
  id: number;
  companyName: string;
  businessType: "retail" | "restaurant";
  owner: PlatformUser;
  employees: PlatformUser[];
  memberCount: number;
}

export interface PlatformEmployee {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  role: string;
  status: "active" | "inactive";
  recordStatus: string;
  userId: number;
  companyName: string;
  businessType: "retail" | "restaurant";
  createdAt?: string;
}

/** Cliente de los endpoints de plataforma (solo super admin). */
@Injectable({ providedIn: "root" })
export class PlatformService {
  private api = inject(ApiService);

  overview(): Observable<ApiResponse<PlatformOverview>> {
    return this.api.get<PlatformOverview>("/sys/overview");
  }

  listUsers(params?: Record<string, unknown>): Observable<PaginatedResponse<PlatformUser>> {
    return this.api.get<PlatformUser[]>("/sys/users", params) as unknown as Observable<PaginatedResponse<PlatformUser>>;
  }

  getUser(id: number): Observable<ApiResponse<PlatformUser>> {
    return this.api.get<PlatformUser>(`/sys/users/${id}`);
  }

  listCompanies(params?: Record<string, unknown>): Observable<PaginatedResponse<PlatformCompany>> {
    return this.api.get<PlatformCompany[]>("/sys/companies", params) as unknown as Observable<PaginatedResponse<PlatformCompany>>;
  }

  getCompany(id: number): Observable<ApiResponse<PlatformCompanyDetail>> {
    return this.api.get<PlatformCompanyDetail>(`/sys/companies/${id}`);
  }

  listEmployees(params?: Record<string, unknown>): Observable<PaginatedResponse<PlatformEmployee>> {
    return this.api.get<PlatformEmployee[]>("/sys/employees", params) as unknown as Observable<PaginatedResponse<PlatformEmployee>>;
  }
}
