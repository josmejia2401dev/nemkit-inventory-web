import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, Subject, tap } from "rxjs";
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

export interface InventoryMovement {
  id: number;
  _id?: number;
  date: string;
  type: string;
  notes?: string;
  items: Array<{
    productId: number;
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
