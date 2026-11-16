import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryCancelledSalesReport,
  InventoryProduct,
  InventoryReportMovement,
  InventorySalesByEmployeeReport,
  InventorySalesReport,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";
import { CashFlowReport, CashWithdrawalsService } from "../../../core/services/cash-withdrawals.service";
import type { InventoryReport } from "./report.types";

/** Rutas HTTP de la feature de reportes; las pantallas no conocen endpoints. */
@Injectable({ providedIn: "root" })
export class ReportsApi {
  private readonly inventory = inject(InventoryService);
  private readonly withdrawals = inject(CashWithdrawalsService);

  inventoryReport(): Observable<{ success: boolean; data: InventoryReport }> {
    return this.inventory.get<InventoryReport>("/statistics/reports/inventory");
  }

  movements(params: {
    from: string;
    to: string;
    page: number;
    limit: number;
    type?: string;
    productId?: string;
  }): Observable<PageResult<InventoryReportMovement>> {
    return this.inventory.list<InventoryReportMovement>(
      "/statistics/reports/movements",
      params,
    );
  }

  sales(from: string, to: string, groupBy: "day" | "week" | "month"): Observable<{ success: boolean; data: InventorySalesReport }> {
    return this.inventory.get<InventorySalesReport>("/statistics/reports/sales", {
      from,
      to,
      groupBy,
    });
  }

  employees(from: string, to: string): Observable<{ success: boolean; data: InventorySalesByEmployeeReport }> {
    return this.inventory.get<InventorySalesByEmployeeReport>("/statistics/employees/sales", {
      from,
      to,
    });
  }

  cancellations(
    from: string,
    to: string,
    page: number,
    limit: number,
  ): Observable<{ success: boolean; data: InventoryCancelledSalesReport }> {
    return this.inventory.get<InventoryCancelledSalesReport>(
      "/statistics/reports/cancelled-sales",
      { from, to, page, limit },
    );
  }

  cashFlow(from: string, to: string): Observable<{ success: boolean; data: CashFlowReport }> {
    return this.withdrawals.cashFlow(from, to);
  }

  activeProducts(search?: string): Observable<PageResult<InventoryProduct>> {
    return this.inventory.list<InventoryProduct>("/products", {
      limit: 100,
      status: "active",
      search: search?.trim() || undefined,
    });
  }
}
