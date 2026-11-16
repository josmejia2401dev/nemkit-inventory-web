export interface InventoryMovement {
  id: number;
  _id?: number;
  date: string;
  type: string;
  notes?: string;
  employeeId?: number | null;
  employeeSnapshot?: { name?: string };
  items: Array<{
    productId: number;
    name?: string;
    sku?: string;
    quantity: number;
    direction: "in" | "out";
    unitCost?: number;
    unitPrice?: number;
  }>;
}
