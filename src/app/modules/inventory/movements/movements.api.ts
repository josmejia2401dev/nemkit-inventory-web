import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryMovement,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";
import type { MovementDraft } from "./movement-form-dialog/movement-form-dialog.component";

/** Rutas del historial de movimientos. */
@Injectable({ providedIn: "root" })
export class MovementsApi {
  private readonly inventory = inject(InventoryService);

  list(page: number, limit: number, type?: string): Observable<PageResult<InventoryMovement>> {
    return this.inventory.list<InventoryMovement>("/movements", {
      page,
      limit,
      type: type || undefined,
    });
  }

  create(draft: MovementDraft): Observable<{ success: boolean; data: InventoryMovement }> {
    return this.inventory.post<InventoryMovement>("/movements", draft);
  }
}
