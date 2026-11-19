import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryDashboardSummary,
  InventoryService,
  InventoryStockAlerts,
} from "../../../core/services/inventory.service";

/** Rutas del panel y sus alertas de stock. */
@Injectable({ providedIn: "root" })
export class DashboardApi {
  private readonly inventory = inject(InventoryService);

  summary(): Observable<{ success: boolean; data: InventoryDashboardSummary }> {
    return this.inventory.get<InventoryDashboardSummary>("/statistics/dashboard/summary");
  }

  alerts(): Observable<{ success: boolean; data: InventoryStockAlerts }> {
    return this.inventory.get<InventoryStockAlerts>("/statistics/dashboard/alerts");
  }
}
