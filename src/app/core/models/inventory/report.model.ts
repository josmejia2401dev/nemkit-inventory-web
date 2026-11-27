import type { InventoryMovement } from "./movement.model";

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

export interface InventoryCancelledSale {
  id: number;
  date: string;
  saleDate: string;
  total: number;
  customerSnapshot?: { name?: string };
  employeeSnapshot?: { name?: string };
  voidedBy?: number | null;
  voidedBySnapshot?: { name?: string };
  voidReason?: string;
  voidNote?: string;
}

export interface InventoryCancelledSalesReport {
  generatedAt: string;
  totals: { cancellationCount: number; cancelledValue: number };
  cancellations: InventoryCancelledSale[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
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
  collectedValue: number;
  pendingValue: number;
  collectedInPeriod: number;
  collectionsCount: number;
  cancellationCount: number;
  cancelledValue: number;
  grossProfit: number;
}

export interface InventorySalesByEmployeeReport {
  generatedAt: string;
  totals: {
    employeeCount: number;
    salesCount: number;
    unitsSold: number;
    revenue: number;
    collectedValue: number;
    pendingValue: number;
    collectedInPeriod: number;
    collectionsCount: number;
    cancellationCount: number;
    cancelledValue: number;
    grossProfit: number;
  };
  employees: InventorySalesByEmployeeRow[];
}
