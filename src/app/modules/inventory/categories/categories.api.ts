import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryCategory,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";

export interface CategoryInput {
  name: string;
  description?: string;
}

type ApiResponse<T> = Observable<{ success: boolean; data: T }>;

/** Rutas de categorías de productos. */
@Injectable({ providedIn: "root" })
export class CategoriesApi {
  private readonly inventory = inject(InventoryService);

  list(page: number, limit: number): Observable<PageResult<InventoryCategory>> {
    return this.inventory.list<InventoryCategory>("/categories", { page, limit });
  }

  listAll(): Observable<InventoryCategory[]> {
    return this.inventory.listAll<InventoryCategory>("/categories");
  }

  create(body: CategoryInput): ApiResponse<InventoryCategory> {
    return this.inventory.post<InventoryCategory>("/categories", body);
  }

  update(id: number, body: CategoryInput): ApiResponse<InventoryCategory> {
    return this.inventory.put<InventoryCategory>(`/categories/${id}`, body);
  }

  remove(id: number): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.delete(`/categories/${id}`);
  }
}
