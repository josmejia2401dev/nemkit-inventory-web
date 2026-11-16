import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryEmployee,
  InventoryMovement,
  InventoryProduct,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
import { AuthStore } from "../../../core/store/auth.store";
import { LimitsService } from "../../../core/services/limits.service";
import { BarcodeDispatcherService } from "../../../core/barcode/barcode-dispatcher.service";
import { BarcodeScan } from "../../../core/barcode/barcode.types";
import { BarcodeScanToolsComponent } from "../../../shared/barcode/barcode-scan-tools/barcode-scan-tools.component";
import { ProductBarcodeService } from "../products/product-barcode.service";
import { ProductQuickCreateDialogComponent } from "../products/product-quick-create-dialog/product-quick-create-dialog.component";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Compra a proveedor",
  manual_adjustment: "Ajuste manual",
  sale: "Venta",
  damage: "Daño",
  loss: "Pérdida",
  internal_use: "Consumo interno",
};

@Component({
  selector: "app-movements",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, BarcodeScanToolsComponent, ProductQuickCreateDialogComponent],
  templateUrl: "./movements.component.html",
  styleUrls: ["./movements.component.css"],
})
export class MovementsComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private store = inject(AuthStore);
  private limits = inject(LimitsService);
  private barcodeDispatcher = inject(BarcodeDispatcherService);
  private productBarcode = inject(ProductBarcodeService);
  private destroyRef = inject(DestroyRef);

  movements = signal<InventoryMovement[]>([]);
  products = signal<InventoryProduct[]>([]);
  employees = signal<InventoryEmployee[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  movementCount = signal(0);
  dialogOpen = signal(false);
  saving = signal(false);
  type = "manual_adjustment";
  notes = "";
  selectedEmployeeId: number | "" = "";
  date = new Date().toISOString().slice(0, 10);
  items: Array<{
    productId: number | "";
    quantity: number;
    direction: "in" | "out";
  }> = [this.emptyItem()];
  filterType = "";
  productSearch = "";
  quickCreateBarcode = signal<string | null>(null);
  labels = MOVEMENT_LABELS;

  ngOnInit(): void {
    this.limits.load().subscribe({ error: () => undefined });
    const unregister = this.barcodeDispatcher.register((scan) => this.onBarcodeScan(scan));
    this.destroyRef.onDestroy(unregister);
    this.loadProducts();
    this.loadMovements();
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.inventory
      .get<InventoryEmployee[]>("/employee-options")
      .subscribe({ next: (response) => this.employees.set(response.data ?? []) });
  }

  loadProducts(): void {
    this.inventory
      .list<InventoryProduct>("/products", {
        limit: 100,
        status: "active",
        types: "simple,ingredient",
        search: this.productSearch.trim() || undefined,
      })
      .subscribe({
        next: (response) => {
          const selectedIds = new Set(this.items.map((item) => Number(item.productId)).filter(Boolean));
          const selectedProducts = this.products().filter((product) => selectedIds.has(product.id ?? product._id ?? 0));
          const productsById = new Map<number, InventoryProduct>();
          for (const product of [...selectedProducts, ...(response.data ?? [])]) {
            productsById.set(product.id ?? product._id ?? 0, product);
          }
          this.products.set([...productsById.values()]);
        },
      });
  }

  searchProducts(): void {
    this.loadProducts();
  }

  private onBarcodeScan(scan: BarcodeScan): void {
    this.applyBarcode(scan.code);
  }

  applyBarcode(code: string): void {
    const value = code.trim();
    if (!value) return;
    if (this.quickCreateBarcode()) return;

    if (!this.dialogOpen()) this.openCreate();

    this.productBarcode.lookup(value).subscribe({
      next: (product) => {
        if (!product) {
          this.offerQuickCreate(value);
          return;
        }
        if (!this.productBarcode.isActive(product)) {
          this.notifications.warn(
            "Producto inactivo",
            `"${product.name}" está inactivo. Actívalo en el catálogo para usarlo.`,
          );
          return;
        }
        if (!this.productBarcode.isPurchasable(product)) {
          this.notifications.warn(
            "Producto no disponible",
            `"${product.name}" es un plato preparado; registra su receta como insumos.`,
          );
          return;
        }
        this.addScannedProduct(product);
      },
      error: () => {
        this.notifications.error(
          "No se pudo buscar el código",
          "Revisa tu conexión e intenta de nuevo.",
        );
      },
    });
  }

  private offerQuickCreate(barcode: string): void {
    const roles = this.store.user()?.roles ?? [];
    if (!this.productBarcode.canManageProducts(roles)) {
      this.notifications.warn(
        "Código no registrado",
        `"${barcode}" no está registrado. Pide a un administrador o bodeguero que cree el producto.`,
      );
      return;
    }

    if (!this.limits.canCreate("products")) {
      this.notifications.warn(
        "Límite del plan alcanzado",
        "No puedes crear más productos con tu plan actual.",
      );
      return;
    }

    this.quickCreateBarcode.set(barcode);
  }

  onProductCreated(product: InventoryProduct): void {
    this.quickCreateBarcode.set(null);
    this.addScannedProduct(product);
  }

  private addScannedProduct(product: InventoryProduct): void {
    const id = product.id ?? product._id;
    if (!id) return;

    this.products.update((list) =>
      list.some((candidate) => (candidate.id ?? candidate._id) === id)
        ? list
        : [...list, product],
    );

    const existingIndex = this.items.findIndex(
      (item) => Number(item.productId) === id,
    );

    if (existingIndex >= 0) {
      this.items = this.items.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: Number(item.quantity) + 1 }
          : item,
      );
    } else {
      const emptyIndex = this.items.findIndex((item) => !item.productId);
      const nextItem = { productId: id, quantity: 1, direction: "in" as const };
      this.items = emptyIndex >= 0
        ? this.items.map((item, index) => (index === emptyIndex ? nextItem : item))
        : [...this.items, nextItem];
    }

    this.notifications.success("Producto agregado", `${product.name} · ${product.sku}`);
  }

  loadMovements(): void {
    this.page.set(1);
    this.fetchMovements();
  }

  private fetchMovements(): void {
    this.loading.set(true);
    this.inventory
      .list<InventoryMovement>("/movements", {
        page: this.page(),
        limit: this.pageSize,
        type: this.filterType || undefined,
      })
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
    this.quickCreateBarcode.set(null);
    this.type = "manual_adjustment";
    this.notes = "";
    this.selectedEmployeeId = "";
    this.date = new Date().toISOString().slice(0, 10);
    this.items = [this.emptyItem()];
    this.dialogOpen.set(true);
  }

  addItem(): void {
    this.items = [...this.items, this.emptyItem()];
  }

  removeItem(index: number): void {
    this.items = this.items.filter((_item, itemIndex) => itemIndex !== index);
  }

  movementDirection(type: string): "in" | "out" {
    return type === "purchase" ? "in" : "out";
  }

  isInbound(movement: InventoryMovement): boolean {
    return movement.type === "purchase" || movement.items[0].direction === "in";
  }

  productName(productId: number): string {
    return (
      this.products().find(
        (product) => (product.id ?? product._id) === productId,
      )?.name ?? `Producto #${productId}`
    );
  }

  movementItemName(item: { productId: number; name?: string }): string {
    return item.name || this.productName(item.productId);
  }

  itemDirection(item: { direction: "in" | "out" }): "in" | "out" {
    return this.type === "manual_adjustment"
      ? item.direction
      : this.movementDirection(this.type);
  }

  save(): void {
    if (
      !this.items.length ||
      this.items.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(Number(item.quantity)) ||
          item.quantity < 1,
      )
    ) {
      this.notifications.warn(
        "Revisa los productos",
        "Cada artículo debe tener un producto y una cantidad entera mayor que cero.",
      );
      return;
    }

    const body: Record<string, unknown> = {
      type: this.type,
      date: new Date(`${this.date}T12:00:00`).toISOString(),
      notes: this.notes.trim(),
      ...(this.selectedEmployeeId ? { employeeId: Number(this.selectedEmployeeId) } : {}),
      items: this.items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        ...(this.type === "manual_adjustment"
          ? { direction: item.direction }
          : {}),
      })),
    };

    this.saving.set(true);
    this.inventory.post<InventoryMovement>("/movements", body).subscribe({
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

  private emptyItem() {
    return {
      productId: "" as number | "",
      quantity: 1,
      direction: "in" as "in" | "out",
    };
  }
}
