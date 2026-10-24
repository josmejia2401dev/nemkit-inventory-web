import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService, ApiResponse, PaginatedResponse } from "./api.service";

export interface PlatformOverview {
  companies: number;
  users: number;
  feedback: { open: number; total: number };
}

export interface PlatformUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  tenantId: number | null;
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
  security?: {
    lastLoginAt?: string | null;
    lockedUntil?: string | null;
    mustChangePassword?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  employees?: PlatformUser[];
  employmentHistory?: PlatformEmploymentHistory[];
}

export interface PlatformEmploymentHistory {
  employeeId: number;
  companyId: number;
  companyName: string;
  role: string;
  status: string;
  recordStatus: string;
  associatedAt: string;
  disassociatedAt: string | null;
  associatedBy: number | null;
  disassociatedBy: number | null;
  isCurrent: boolean;
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

export interface LogFile {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface LogEntry {
  timestamp?: string | null;
  level?: string;
  message?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LogReadResult {
  file: string;
  total: number;
  returned: number;
  entries: LogEntry[];
}

/** Cliente de los endpoints de plataforma (solo super admin). */
@Injectable({ providedIn: "root" })
export class PlatformService {
  private api = inject(ApiService);

  overview(): Observable<ApiResponse<PlatformOverview>> {
    return this.api.get<PlatformOverview>("/platform/overview");
  }

  listUsers(params?: Record<string, unknown>): Observable<PaginatedResponse<PlatformUser>> {
    return this.api.get<PlatformUser[]>("/platform/users", params) as unknown as Observable<PaginatedResponse<PlatformUser>>;
  }

  getUser(id: number): Observable<ApiResponse<PlatformUser>> {
    return this.api.get<PlatformUser>(`/platform/users/${id}`);
  }

  getEmploymentHistory(id: number): Observable<ApiResponse<PlatformEmploymentHistory[]>> {
    return this.api.get<PlatformEmploymentHistory[]>(`/platform/users/${id}/employment-history`);
  }

  listCompanies(params?: Record<string, unknown>): Observable<PaginatedResponse<PlatformCompany>> {
    return this.api.get<PlatformCompany[]>("/platform/companies", params) as unknown as Observable<PaginatedResponse<PlatformCompany>>;
  }

  getCompany(id: number): Observable<ApiResponse<PlatformCompanyDetail>> {
    return this.api.get<PlatformCompanyDetail>(`/platform/companies/${id}`);
  }

  associateEmployee(companyId: number, email: string, role: string): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>(`/platform/companies/${companyId}/members`, { email, role });
  }

  disassociateEmployee(companyId: number, userId: number): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`/platform/companies/${companyId}/members/${userId}`);
  }

  logFiles(): Observable<ApiResponse<LogFile[]>> {
    return this.api.get<LogFile[]>("/platform/logs/files");
  }

  readLogs(params: Record<string, unknown>): Observable<ApiResponse<LogReadResult>> {
    return this.api.get<LogReadResult>("/platform/logs/read", params);
  }
}
