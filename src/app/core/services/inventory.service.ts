import { HttpClient, HttpContext, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { EMPTY, Observable, Subject, expand, map, reduce, tap } from "rxjs";
import { BackendEndpointService } from "@nemkit/foundation-web";
import type { PageResult } from "../models/inventory";

// Los modelos viven en `core/models/inventory`; se reexportan aquí para no
// romper los imports históricos desde `core/services/inventory.service`.
export * from "../models/inventory";
export type { DeliveryStatus, OrderStatus } from "../../modules/inventory/order-status.constants";

@Injectable({ providedIn: "root" })
export class InventoryService {
  private http = inject(HttpClient);
  private endpoint = inject(BackendEndpointService);
  private inventoryChanged = new Subject<void>();

  /** Getter: cada request se construye contra el nodo activo del balanceador. */
  private get baseUrl(): string {
    return this.endpoint.apiUrl;
  }

  readonly changes = this.inventoryChanged.asObservable();

  get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    context?: HttpContext,
  ): Observable<{ success: boolean; data: T }> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== "") {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<{ success: boolean; data: T }>(
      `${this.baseUrl}${path}`,
      { params: httpParams, context },
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

    // La API expone la paginación en `metadata.pagination`; el resto de la app
    // la consume en la raíz de la respuesta.
    type RawPageResult = PageResult<T> & {
      metadata?: { pagination?: PageResult<T>["pagination"] };
    };

    return this.http
      .get<RawPageResult>(`${this.baseUrl}${path}`, { params: httpParams })
      .pipe(
        map((response) => ({
          ...response,
          pagination: response.pagination ?? response.metadata?.pagination,
        })),
      );
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
