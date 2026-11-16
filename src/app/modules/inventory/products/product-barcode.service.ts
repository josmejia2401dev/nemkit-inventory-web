import { Injectable, inject } from "@angular/core";
import { HttpContext } from "@angular/common/http";
import { Observable, catchError, map, of, throwError } from "rxjs";
import { InventoryProduct, InventoryService } from "../../../core/services/inventory.service";
import { SKIP_ERROR_TOAST } from "../../../core/http/http-context.tokens";

/**
 * Puente entre el escaneo genérico y el dominio de productos. Es el único
 * punto que conoce el endpoint exacto `/products/by-barcode/:barcode`.
 */
@Injectable({ providedIn: "root" })
export class ProductBarcodeService {
  private readonly inventory = inject(InventoryService);

  /** Devuelve el producto o `null` cuando el código no está registrado (404). */
  lookup(code: string): Observable<InventoryProduct | null> {
    const value = code.trim();
    if (!value) return of(null);

    return this.inventory
      .get<InventoryProduct>(
        `/products/by-barcode/${encodeURIComponent(value)}`,
        undefined,
        new HttpContext().set(SKIP_ERROR_TOAST, true),
      )
      .pipe(
        map((response) => response.data ?? null),
        catchError((error: { status?: number }) =>
          error?.status === 404 ? of(null) : throwError(() => error),
        ),
      );
  }

  /** Roles con permiso de escritura de productos en el backend. */
  canManageProducts(roles: string[] | null | undefined): boolean {
    return Boolean(roles?.includes("ADMIN") || roles?.includes("WAREHOUSE"));
  }

  /** Un producto inactivo no se usa en ventas, compras ni movimientos. */
  isActive(product: InventoryProduct | null | undefined): boolean {
    return product?.status === "active";
  }

  /** Un insumo no se vende suelto; todo lo demás sí. */
  isSellable(product: InventoryProduct | null | undefined): boolean {
    return Boolean(product) && product?.type !== "ingredient";
  }

  /** Un plato preparado no se compra; simples e insumos sí. */
  isPurchasable(product: InventoryProduct | null | undefined): boolean {
    return Boolean(product) && product?.type !== "prepared";
  }
}
