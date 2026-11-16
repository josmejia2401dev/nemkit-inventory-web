export interface InventoryTable {
  id?: number;
  _id?: number;
  name: string;
  description?: string;
  occupied?: boolean;
  activeOrders?: number;
}
