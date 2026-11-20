import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  CustomerProfile,
  InventoryContact,
  InventoryDocument,
  InventoryEmployee,
  InventoryProduct,
  InventoryService,
  InventoryTable,
  PageResult,
} from "../../../core/services/inventory.service";
import { EmployeesApi } from "../employees/employees.api";
import { ProductCatalogService } from "../products/product-catalog.service";
import type { CancelOrderResult } from "../../../shared/components/cancel-order-dialog/cancel-order-dialog.component";
import type { OrderStatus } from "../order-status.constants";
import type { CustomerDraft } from "./customer-create-form/customer-create-form.component";
import type { DocumentKind } from "./document.types";

/** Rutas HTTP de ventas y compras; los componentes no conocen endpoints. */
@Injectable({ providedIn: "root" })
export class DocumentsApi {
  private readonly inventory = inject(InventoryService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly employeesApi = inject(EmployeesApi);

  list(kind: DocumentKind, page: number, limit: number): Observable<PageResult<InventoryDocument>> {
    return this.inventory.list<InventoryDocument>(`/${kind}`, { page, limit });
  }

  create(kind: DocumentKind, body: Record<string, unknown>): Observable<{ success: boolean; data: InventoryDocument }> {
    return this.inventory.post<InventoryDocument>(`/${kind}`, body);
  }

  paySale(id: number | string): Observable<{ success: boolean; data: InventoryDocument }> {
    return this.inventory.put<InventoryDocument>(`/sales/${id}/pay`, {});
  }

  advanceSale(id: number | string, orderStatus: OrderStatus): Observable<{ success: boolean; data: InventoryDocument }> {
    return this.inventory.put<InventoryDocument>(`/sales/${id}/status`, { orderStatus });
  }

  cancelSale(id: number | string, body: CancelOrderResult): Observable<{ success: boolean; data: InventoryDocument }> {
    return this.inventory.put<InventoryDocument>(`/sales/${id}/cancel`, body);
  }

  /** Ventas: vendibles (simples + platos). Compras: comprables (simples + insumos). */
  products(kind: DocumentKind, search = ""): Observable<PageResult<InventoryProduct>> {
    return this.catalog.lookup({
      types: kind === "sales" ? "simple,prepared" : "simple,ingredient",
      search,
    });
  }

  contacts(kind: DocumentKind, search = ""): Observable<PageResult<InventoryContact>> {
    return this.inventory.list<InventoryContact>(kind === "sales" ? "/customers" : "/suppliers", {
      limit: 100,
      search: search.trim() || undefined,
    });
  }

  createCustomer(body: CustomerDraft): Observable<{ success: boolean; data: InventoryContact }> {
    return this.inventory.post<InventoryContact>("/customers", body);
  }

  employees(role?: "courier"): Observable<{ success: boolean; data: InventoryEmployee[] }> {
    return this.employeesApi.options(role);
  }

  tablesOccupancy(): Observable<{ success: boolean; data: InventoryTable[] }> {
    return this.inventory.get<InventoryTable[]>("/tables/occupancy");
  }

  customerProfile(customerId: number): Observable<{ success: boolean; data: CustomerProfile }> {
    return this.inventory.get<CustomerProfile>(`/statistics/customers/${customerId}/profile`, { limit: 1 });
  }
}
