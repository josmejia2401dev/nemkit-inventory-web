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
  /** Tipos del catálogo aceptados por la API, separados por coma. */
  types?: string;
  productId?: number;
  page?: number;
  limit?: number;
}

/** Filtros de los selectores de producto (movimientos, recetas, reportes). */
export interface ProductLookupQuery {
  search?: string;
  /** Tipos del catálogo aceptados por la API, separados por coma. */
  types?: string;
}

@Injectable({ providedIn: "root" })
export class ProductCatalogService {
  private readonly inventory = inject(InventoryService);
  private readonly categoriesApi = inject(CategoriesApi);

  list(query: ProductCatalogQuery = {}): Observable<PageResult<InventoryProduct>> {
    return this.inventory.list<InventoryProduct>("/products", { ...query });
  }

  /** Productos activos para un selector; una sola página de 100. */
  lookup(query: ProductLookupQuery = {}): Observable<PageResult<InventoryProduct>> {
    return this.list({
      status: "active",
      types: query.types,
      search: query.search?.trim() || undefined,
      limit: 100,
    });
  }

  /** Catálogo completo de productos activos (recorre todas las páginas). */
  lookupAll(query: Omit<ProductLookupQuery, "search"> = {}): Observable<InventoryProduct[]> {
    return this.inventory.listAll<InventoryProduct>("/products", {
      status: "active",
      types: query.types,
    });
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
