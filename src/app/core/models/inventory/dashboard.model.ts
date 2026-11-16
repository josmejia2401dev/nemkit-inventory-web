import type { InventoryMovement } from "./movement.model";

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
