import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryCategory,
  InventoryProduct,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";

export interface ProductCatalogQuery {
  search?: string;
  categoryId?: number;
  status?: string;
  type?: string;
  stockState?: string;
  productId?: number;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: "root" })
export class ProductCatalogService {
  private readonly inventory = inject(InventoryService);

  list(query: ProductCatalogQuery = {}): Observable<PageResult<InventoryProduct>> {
    return this.inventory.list<InventoryProduct>("/products", { ...query });
  }

  listCategories(): Observable<InventoryCategory[]> {
    return this.inventory.listAll<InventoryCategory>("/categories");
  }
}
