import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryService,
  InventoryTable,
} from "../../../core/services/inventory.service";

export interface TableInput {
  name: string;
  description?: string;
}

type ApiResponse<T> = Observable<{ success: boolean; data: T }>;

/** Rutas de mesas; la ocupación la calcula el backend. */
@Injectable({ providedIn: "root" })
export class TablesApi {
  private readonly inventory = inject(InventoryService);

  occupancy(): Observable<{ success: boolean; data: InventoryTable[] }> {
    return this.inventory.get<InventoryTable[]>("/tables/occupancy");
  }

  create(body: TableInput): ApiResponse<InventoryTable> {
    return this.inventory.post<InventoryTable>("/tables", body);
  }

  update(id: number, body: TableInput): ApiResponse<InventoryTable> {
    return this.inventory.put<InventoryTable>(`/tables/${id}`, body);
  }

  remove(id: number): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.delete(`/tables/${id}`);
  }
}
