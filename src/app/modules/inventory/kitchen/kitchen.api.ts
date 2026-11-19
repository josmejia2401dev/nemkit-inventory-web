import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryService,
  KitchenStatus,
  OrderStatus,
} from "../../../core/services/inventory.service";

/** Comanda tal como la entrega `/kitchen`; solo lo que pinta el tablero. */
export interface KitchenOrder {
  id: number;
  date: string;
  createdAt?: string;
  tableNumber?: string;
  orderStatus: KitchenStatus;
  orderChannel?: "delivery" | "on_site";
  paymentStatus?: "paid" | "pending";
  total?: number;
  notes?: string;
  customerSnapshot?: { name?: string };
  employeeSnapshot?: { name?: string };
  items: Array<{ name: string; quantity: number }>;
}

type ApiResponse<T> = Observable<{ success: boolean; data: T }>;

/** Rutas de comandas; el tablero no conoce endpoints. */
@Injectable({ providedIn: "root" })
export class KitchenApi {
  private readonly inventory = inject(InventoryService);

  list(): ApiResponse<KitchenOrder[]> {
    return this.inventory.get<KitchenOrder[]>("/kitchen");
  }

  setStatus(id: number, orderStatus: OrderStatus): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.put(`/kitchen/${id}`, { orderStatus });
  }

  pay(saleId: number): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.put(`/sales/${saleId}/pay`, {});
  }

  cancel(
    id: number,
    body: { reason: string; note: string },
  ): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.put(`/kitchen/${id}/cancel`, body);
  }
}
