import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  DeliveryStatus,
  InventoryDelivery,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";

export type DeliveryProof = NonNullable<InventoryDelivery["proof"]>;

export interface DeliveryQuery {
  page?: number;
  limit?: number;
  status?: DeliveryStatus;
}

type ApiResponse<T> = Observable<{ success: boolean; data: T }>;

/** Rutas de domicilios; la pantalla no conoce endpoints ni cuerpos. */
@Injectable({ providedIn: "root" })
export class DeliveriesApi {
  private readonly inventory = inject(InventoryService);

  list(query: DeliveryQuery): Observable<PageResult<InventoryDelivery>> {
    return this.inventory.list<InventoryDelivery>("/deliveries", { ...query });
  }

  assignCourier(id: number, courierId: number): ApiResponse<InventoryDelivery> {
    return this.inventory.put<InventoryDelivery>(`/deliveries/${id}/courier`, { courierId });
  }

  changeStatus(id: number, status: DeliveryStatus): ApiResponse<InventoryDelivery> {
    return this.inventory.put<InventoryDelivery>(`/deliveries/${id}/status`, { status });
  }

  void(id: number): ApiResponse<InventoryDelivery> {
    return this.inventory.put<InventoryDelivery>(`/deliveries/${id}/void`, {});
  }

  saveProof(id: number, proof: DeliveryProof): ApiResponse<InventoryDelivery> {
    return this.inventory.put<InventoryDelivery>(`/deliveries/${id}/proof`, { proof });
  }
}
