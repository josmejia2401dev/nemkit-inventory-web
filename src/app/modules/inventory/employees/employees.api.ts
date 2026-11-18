import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  DocumentType,
  EmployeeRole,
  InventoryEmployee,
  InventoryEmployeePayment,
  InventoryEmployeePaymentSummary,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";

export interface EmployeeQuery {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: "active" | "inactive" | "all";
}

export interface EmployeeInput {
  name: string;
  documentType?: DocumentType;
  documentNumber?: string;
  phone?: string;
  role: EmployeeRole | "";
  hireDate?: string;
  status?: "active" | "inactive";
  email?: string;
  password?: string;
}

export interface EmployeePaymentInput {
  employeeId: number;
  paymentDate: string;
  periodStart?: string;
  periodEnd?: string;
  type: InventoryEmployeePayment["type"];
  amount: number;
  method: InventoryEmployeePayment["method"];
  reference?: string;
  notes?: string;
}

type ApiResponse<T> = Observable<{ success: boolean; data: T }>;

/** Rutas de empleados, nómina y opciones de selección; las pantallas no conocen endpoints. */
@Injectable({ providedIn: "root" })
export class EmployeesApi {
  private readonly inventory = inject(InventoryService);

  list(query: EmployeeQuery): Observable<PageResult<InventoryEmployee>> {
    return this.inventory.list<InventoryEmployee>("/users/employees", { ...query });
  }

  create(body: EmployeeInput): ApiResponse<InventoryEmployee> {
    return this.inventory.post<InventoryEmployee>("/users/employees", body);
  }

  update(id: number, body: EmployeeInput): ApiResponse<InventoryEmployee> {
    return this.inventory.put<InventoryEmployee>(`/users/employees/${id}`, body);
  }

  changeStatus(id: number, status: "active" | "inactive"): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.put(`/users/employees/${id}`, { status });
  }

  resetPassword(id: number, newPassword: string): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.put(`/users/employees/${id}/password`, { newPassword });
  }

  /** Empleados activos para selectores (por cargo, p. ej. domiciliarios). */
  options(role?: string): Observable<{ success: boolean; data: InventoryEmployee[] }> {
    return this.inventory.get<InventoryEmployee[]>(
      "/employee-options",
      role ? { role } : undefined,
    );
  }

  couriers(): Observable<{ success: boolean; data: InventoryEmployee[] }> {
    return this.options("courier");
  }

  payments(employeeId: number, page: number, limit: number): Observable<PageResult<InventoryEmployeePayment>> {
    return this.inventory.list<InventoryEmployeePayment>("/employee-payments", {
      employeeId,
      page,
      limit,
    });
  }

  paymentSummary(employeeId: number): ApiResponse<InventoryEmployeePaymentSummary> {
    return this.inventory.get<InventoryEmployeePaymentSummary>(
      "/statistics/employees/payments",
      { employeeId },
    );
  }

  createPayment(body: EmployeePaymentInput): ApiResponse<InventoryEmployeePayment> {
    return this.inventory.post<InventoryEmployeePayment>("/employee-payments", body);
  }
}
