import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  CustomerProfile,
  InventoryContact,
  InventoryLoyaltyRule,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";

export type ContactKind = "suppliers" | "customers";

export interface ContactInput {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ContactQuery {
  page: number;
  limit: number;
  search?: string;
}

type ApiResponse<T> = Observable<{ success: boolean; data: T }>;

/**
 * Rutas del directorio de clientes y proveedores. Ambos comparten el mismo
 * recurso (`/{kind}`); el perfil 360° y las reglas aplican a clientes.
 */
@Injectable({ providedIn: "root" })
export class ContactsApi {
  private readonly inventory = inject(InventoryService);

  list(kind: ContactKind, query: ContactQuery): Observable<PageResult<InventoryContact>> {
    return this.inventory.list<InventoryContact>(`/${kind}`, { ...query });
  }

  create(kind: ContactKind, body: ContactInput): ApiResponse<InventoryContact> {
    return this.inventory.post<InventoryContact>(`/${kind}`, body);
  }

  update(kind: ContactKind, id: number, body: ContactInput): ApiResponse<InventoryContact> {
    return this.inventory.put<InventoryContact>(`/${kind}/${id}`, body);
  }

  remove(kind: ContactKind, id: number): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.delete(`/${kind}/${id}`);
  }

  lookup(term: string): ApiResponse<InventoryContact | null> {
    return this.inventory.get<InventoryContact | null>("/customers/lookup", { term });
  }

  loyaltyRules(): Observable<{ success: boolean; data: InventoryLoyaltyRule[] }> {
    return this.inventory.get<InventoryLoyaltyRule[]>("/statistics/customers/loyalty-rules");
  }

  profile(customerId: number, page: number, limit: number): ApiResponse<CustomerProfile> {
    return this.inventory.get<CustomerProfile>(`/statistics/customers/${customerId}/profile`, {
      page,
      limit,
    });
  }
}
