import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { EMPTY, Observable, Subject, expand, reduce, tap } from "rxjs";
import { environment } from "../../../environments/environment";

export interface InventoryProduct {
  id: number;
  _id?: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minimumStock: number;
  status: "active" | "inactive";
  image?: { url?: string; storageKey?: string };
}

export interface InventoryCategory {
  id: number;
  _id?: number;
  name: string;
  description?: string;
}

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface InventoryContact {
  id?: number;
  _id?: number;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: string | null;
  loyaltyTier?: LoyaltyTier;
  stats?: {
    totalSpent?: number;
    purchaseCount?: number;
    firstPurchaseAt?: string | null;
    lastPurchaseAt?: string | null;
  };
}

export interface CustomerProfile {
  customer: InventoryContact;
  history: {
    data: Array<{
      id: number;
      date: string;
      total: number;
      items: InventoryDocumentItem[];
      employeeSnapshot?: { name?: string };
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export type EmployeeRole =
  | "admin"
  | "cashier"
  | "seller"
  | "courier"
  | "warehouse"
  | "waiter";

export type DocumentType = "CC" | "CE" | "NIT" | "PAS" | "TI";

export interface InventoryEmployee {
  id?: number;
  _id?: number;
  name: string;
  documentType?: DocumentType;
  documentNumber?: string;
  phone?: string;
  email?: string;
  role: EmployeeRole;
  hireDate?: string;
  status?: "active" | "inactive";
  photo?: { url?: string; storageKey?: string };
  linkedUserId?: number | null;
}

export interface InventoryDocumentItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
  lineTotal: number;
}

export type DeliveryStatus =
  | "pending"
  | "preparing"
  | "on_route"
  | "delivered"
  | "cancelled";

export interface InventoryDelivery {
  id: number;
  _id?: number;
  saleId?: number | null;
  customerId: number;
  customerSnapshot: { name: string; phone?: string };
  address: string;
  location?: { lat?: number | null; lng?: number | null };
  items: Array<{
    productId: number;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
  notes?: string;
  status: DeliveryStatus;
  courierId?: number | null;
  courierSnapshot?: { name?: string };
  timeline?: {
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
    cancelledAt?: string | null;
  };
  proof?: {
    photo?: { url?: string };
    signature?: { url?: string };
    observation?: string;
  };
  createdAt?: string;
}

export interface InventoryDocument {
  id: number;
  _id?: number;
  supplierId?: number;
  supplierSnapshot?: InventoryContact;
  customerId?: number | null;
  customerSnapshot?: InventoryContact;
  employeeId?: number | null;
  employeeSnapshot?: { name?: string };
  movementId: number;
  date: string;
  status: "completed";
  notes?: string;
  items: InventoryDocumentItem[];
  total: number;
}

export interface InventoryMovement {
  id: number;
  _id?: number;
  date: string;
  type: string;
  notes?: string;
  employeeId?: number | null;
  employeeSnapshot?: { name?: string };
  items: Array<{
    productId: number;
    name?: string;
    sku?: string;
    quantity: number;
    direction: "in" | "out";
    unitCost?: number;
    unitPrice?: number;
  }>;
}

export interface InventoryDashboardSummary {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  inventoryValue: number;
  recentMovements: InventoryMovement[];
  topSellingProducts: Array<{
    productId: number;
    name: string;
    sku: string;
    unitsSold: number;
  }>;
  customers?: { total: number; new: number; frequent: number; vip: number };
  topEmployees?: Array<{
    employeeId: number;
    employeeName: string;
    salesCount: number;
    revenue: number;
  }>;
  deliveries?: {
    pending: number;
    preparing: number;
    onRoute: number;
    delivered: number;
    cancelled: number;
    avgDeliveryMinutes: number | null;
  };
}

export interface InventoryStockAlert {
  id: number;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  categoryName: string;
  state: "out_of_stock" | "low_stock";
}

export interface InventoryStockAlerts {
  outOfStock: number;
  lowStock: number;
  products: InventoryStockAlert[];
}

export interface InventoryReportProduct {
  id: number;
  sku: string;
  name: string;
  categoryName: string;
  status: "active" | "inactive";
  stock: number;
  minimumStock: number;
  purchasePrice: number;
  salePrice: number;
  inventoryCost: number;
  potentialSales: number;
}

export interface InventoryReportMovement extends InventoryMovement {
  type: string;
  notes: string;
  items: Array<{
    productId: number;
    name: string;
    sku: string;
    quantity: number;
    direction: "in" | "out";
    unitCost?: number;
    unitPrice?: number;
  }>;
}

export interface InventorySalesReport {
  groupBy: "day" | "week" | "month";
  totals: { salesCount: number; unitsSold: number; revenue: number; grossProfit: number };
  periods: Array<{
    periodStart: string;
    salesCount: number;
    unitsSold: number;
    revenue: number;
    grossProfit: number;
  }>;
}

export interface InventorySalesByEmployeeRow {
  employeeId: number | null;
  employeeName: string;
  salesCount: number;
  unitsSold: number;
  revenue: number;
  grossProfit: number;
}

export interface InventorySalesByEmployeeReport {
  generatedAt: string;
  totals: {
    employeeCount: number;
    salesCount: number;
    unitsSold: number;
    revenue: number;
    grossProfit: number;
  };
  employees: InventorySalesByEmployeeRow[];
}

export interface PageResult<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
  };
}

@Injectable({ providedIn: "root" })
export class InventoryService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private inventoryChanged = new Subject<void>();

  readonly changes = this.inventoryChanged.asObservable();

  get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Observable<{ success: boolean; data: T }> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== "") {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<{ success: boolean; data: T }>(
      `${this.baseUrl}${path}`,
      { params: httpParams },
    );
  }

  list<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Observable<PageResult<T>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== "") {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<PageResult<T>>(`${this.baseUrl}${path}`, {
      params: httpParams,
    });
  }

  listAll<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Observable<T[]> {
    const firstPage = this.list<T>(path, { ...params, page: 1, limit: 100 });
    return firstPage.pipe(
      expand((response) => {
        const currentPage = response.pagination?.page ?? 1;
        const totalPages = response.pagination?.totalPages ?? 1;
        return currentPage < totalPages
          ? this.list<T>(path, { ...params, page: currentPage + 1, limit: 100 })
          : EMPTY;
      }),
      reduce((items, response) => items.concat(response.data ?? []), [] as T[]),
    );
  }

  post<T>(
    path: string,
    body: unknown,
  ): Observable<{ success: boolean; data: T }> {
    return this.http
      .post<{ success: boolean; data: T }>(`${this.baseUrl}${path}`, body)
      .pipe(tap(() => this.inventoryChanged.next()));
  }

  put<T>(
    path: string,
    body: unknown,
  ): Observable<{ success: boolean; data: T }> {
    return this.http
      .put<{ success: boolean; data: T }>(`${this.baseUrl}${path}`, body)
      .pipe(tap(() => this.inventoryChanged.next()));
  }

  delete(path: string): Observable<{ success: boolean; data: unknown }> {
    return this.http
      .delete<{ success: boolean; data: unknown }>(`${this.baseUrl}${path}`)
      .pipe(tap(() => this.inventoryChanged.next()));
  }
}
