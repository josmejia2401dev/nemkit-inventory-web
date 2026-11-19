import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryCategory,
  InventoryProduct,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";
import { CategoriesApi } from "../categories/categories.api";

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
  private readonly categoriesApi = inject(CategoriesApi);

  list(query: ProductCatalogQuery = {}): Observable<PageResult<InventoryProduct>> {
    return this.inventory.list<InventoryProduct>("/products", { ...query });
  }

  listCategories(): Observable<InventoryCategory[]> {
    return this.categoriesApi.listAll();
  }

  create(body: Record<string, unknown>): Observable<{ success: boolean; data: InventoryProduct }> {
    return this.inventory.post<InventoryProduct>("/products", body);
  }

  update(
    id: number,
    body: Record<string, unknown>,
  ): Observable<{ success: boolean; data: InventoryProduct }> {
    return this.inventory.put<InventoryProduct>(`/products/${id}`, body);
  }

  remove(id: number): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.delete(`/products/${id}`);
  }
}
