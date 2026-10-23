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
  isOwner: boolean;
  recordStatus: string;
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

  listCompanies(params?: Record<string, unknown>): Observable<PaginatedResponse<PlatformCompany>> {
    return this.api.get<PlatformCompany[]>("/platform/companies", params) as unknown as Observable<PaginatedResponse<PlatformCompany>>;
  }

  getCompany(id: number): Observable<ApiResponse<PlatformCompanyDetail>> {
    return this.api.get<PlatformCompanyDetail>(`/platform/companies/${id}`);
  }

  logFiles(): Observable<ApiResponse<LogFile[]>> {
    return this.api.get<LogFile[]>("/platform/logs/files");
  }

  readLogs(params: Record<string, unknown>): Observable<ApiResponse<LogReadResult>> {
    return this.api.get<LogReadResult>("/platform/logs/read", params);
  }
}
