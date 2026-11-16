import type { InventoryReportProduct } from "../../../core/models/inventory";

export type ReportKind =
  | "inventory"
  | "movements"
  | "sales"
  | "employees"
  | "cancellations"
  | "cashflow";

export interface InventoryReport {
  generatedAt: string;
  totals: { productCount: number; units: number; inventoryCost: number; potentialSales: number };
  items: InventoryReportProduct[];
}

export const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Compra",
  manual_adjustment: "Ajuste manual",
  sale: "Venta",
  sale_void: "Anulación de venta",
  damage: "Daño",
  loss: "Pérdida",
  internal_use: "Consumo interno",
};

const CANCELLATION_LABELS: Record<string, string> = {
  customer_left: "Cliente se retiró",
  order_error: "Error al tomar el pedido",
  out_of_stock: "Sin insumos o stock",
  customer_changed: "Cliente cambió de opinión",
  other: "Otro",
};

export function movementLabel(type: string): string {
  return MOVEMENT_LABELS[type] ?? type;
}

export function cancellationReason(reason: string | undefined): string {
  return reason ? CANCELLATION_LABELS[reason] ?? reason : "Sin motivo registrado";
}
