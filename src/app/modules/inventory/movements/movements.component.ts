import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InventoryMovement, InventoryProduct } from "../../../core/services/inventory.service";
import { ProductCatalogService } from "../products/product-catalog.service";
import { MovementsApi } from "./movements.api";
import { NotificationService } from "../../../core/services/notification.service";
import { BarcodeDispatcherService } from "../../../core/barcode/barcode-dispatcher.service";
import { BarcodeScan } from "../../../core/barcode/barcode.types";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";
import { EMPTY_SCAN, ScanRequest, nextScan } from "../../../shared/barcode/scan-request";
import {
  MovementDraft,
  MovementFormDialogComponent,
} from "./movement-form-dialog/movement-form-dialog.component";

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Compra a proveedor",
  manual_adjustment: "Ajuste manual",
  sale: "Venta",
  damage: "Daño",
  loss: "Pérdida",
  internal_use: "Consumo interno",
  layaway_reserve: "Reserva Plan separe",
  layaway_release: "Liberación Plan separe",
};

@Component({
  selector: "app-movements",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, MovementFormDialogComponent],
  templateUrl: "./movements.component.html",
  styleUrls: ["./movements.component.css"],
})
export class MovementsComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private readonly movementsApi = inject(MovementsApi);
  private readonly catalog = inject(ProductCatalogService);
  private readonly notifications = inject(NotificationService);
  private readonly barcodeDispatcher = inject(BarcodeDispatcherService);
  private readonly destroyRef = inject(DestroyRef);

  readonly movements = signal<InventoryMovement[]>([]);
  readonly products = signal<InventoryProduct[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly pageCount = signal(1);
  readonly movementCount = signal(0);
  readonly dialogOpen = signal(false);
  readonly saving = signal(false);
  readonly scanRequest = signal<ScanRequest>(EMPTY_SCAN);
  readonly filterType = signal("");
  readonly labels = MOVEMENT_LABELS;

  ngOnInit(): void {
    const unregister = this.barcodeDispatcher.register((scan) => this.onBarcodeScan(scan));
    this.destroyRef.onDestroy(unregister);
    this.loadProducts();
    this.loadMovements();
  }

  loadProducts(): void {
    this.catalog
      .list({ limit: 100, status: "active" })
      .subscribe({ next: (response) => this.products.set(response.data ?? []) });
  }

  /** El lector es global: abre la hoja y le pasa el código al formulario. */
  private onBarcodeScan(scan: BarcodeScan): void {
    this.dialogOpen.set(true);
    this.scanRequest.update((current) => nextScan(current, scan.code));
  }

  onFilterChange(value: string): void {
    this.filterType.set(value);
    this.loadMovements();
  }

  loadMovements(): void {
    this.page.set(1);
    this.fetchMovements();
  }

  private fetchMovements(): void {
    this.loading.set(true);
    this.movementsApi
      .list(this.page(), this.pageSize, this.filterType())
      .subscribe({
        next: (response) => {
          const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          if (this.page() > totalPages) {
            this.page.set(totalPages);
            this.fetchMovements();
            return;
          }
          this.movements.set(response.data ?? []);
          this.pageCount.set(totalPages);
          this.movementCount.set(response.pagination?.total ?? response.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pageCount()) return;
    this.page.set(nextPage);
    this.fetchMovements();
  }

  openCreate(): void {
    this.scanRequest.set(EMPTY_SCAN);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  save(draft: MovementDraft): void {
    this.saving.set(true);
    this.movementsApi.create(draft).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.notifications.success(
          "Movimiento registrado",
          "Las existencias ya están actualizadas.",
        );
        this.loadMovements();
      },
      error: () => this.saving.set(false),
    });
  }

  isInbound(movement: InventoryMovement): boolean {
    return movement.type === "purchase" || movement.items[0].direction === "in";
  }

  productName(productId: number): string {
    return (
      this.products().find((product) => (product.id ?? product._id) === productId)?.name ??
      `Producto #${productId}`
    );
  }

  movementItemName(item: { productId: number; name?: string }): string {
    return item.name || this.productName(item.productId);
  }
}
