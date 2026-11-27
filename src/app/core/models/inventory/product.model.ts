export type ProductType = "simple";

export interface InventoryProduct {
  id: number;
  _id?: number;
  type?: ProductType;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minimumStock: number;
  status: "active" | "inactive";
  image?: { url?: string; storageKey?: string };
}

export interface InventoryCategory {
  id: number;
  _id?: number;
  name: string;
  description?: string;
}
