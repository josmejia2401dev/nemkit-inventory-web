import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InventoryEmployee, InventoryProduct, InventoryService } from "../../../../core/services/inventory.service";
import { NotificationService } from "../../../../core/services/notification.service";
import { AuthStore } from "../../../../core/store/auth.store";
import { LimitsService } from "../../../../core/services/limits.service";
import { BarcodeScanToolsComponent } from "../../../../shared/barcode/barcode-scan-tools/barcode-scan-tools.component";
import { ProductBarcodeService } from "../../products/product-barcode.service";
import { ProductQuickCreateDialogComponent } from "../../products/product-quick-create-dialog/product-quick-create-dialog.component";

export type MovementDirection = "in" | "out";

/** Cuerpo que la pantalla envía a `POST /movements`. */
export interface MovementDraft {
  type: string;
  date: string;
  notes: string;
  employeeId?: number;
  items: Array<{ productId: number; quantity: number; direction?: MovementDirection }>;
}

/** Pedido de escaneo emitido por la pantalla (el lector es global). */
export interface MovementScanRequest {
  code: string;
  seq: number;
}

@Component({
  selector: "app-movement-form-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeScanToolsComponent, ProductQuickCreateDialogComponent],
  templateUrl: "./movement-form-dialog.component.html",
  styleUrl: "./movement-form-dialog.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementFormDialogComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly notifications = inject(NotificationService);
  private readonly store = inject(AuthStore);
  private readonly limits = inject(LimitsService);
  private readonly productBarcode = inject(ProductBarcodeService);

  readonly saving = input(false);
  readonly scan = input<MovementScanRequest>({ code: "", seq: 0 });
  readonly submitted = output<MovementDraft>();
  readonly closed = output<void>();

  readonly products = signal<InventoryProduct[]>([]);
  readonly employees = signal<InventoryEmployee[]>([]);
  readonly quickCreateBarcode = signal<string | null>(null);

  readonly type = signal("manual_adjustment");
  readonly notes = signal("");
  readonly date = signal(new Date().toISOString().slice(0, 10));
  readonly selectedEmployeeId = signal<number | "">("");
  readonly productSearch = signal("");
  readonly items = signal<Array<{ productId: number | ""; quantity: number; direction: MovementDirection }>>([
    { productId: "", quantity: 1, direction: "in" },
  ]);

  constructor() {
    effect(() => {
      const request = this.scan();
      if (request.seq > 0 && request.code) {
        untracked(() => this.applyBarcode(request.code));
      }
    });
  }

  ngOnInit(): void {
    this.limits.load().subscribe({ error: () => undefined });
    this.loadProducts();
    this.loadEmployees();
  }

  private loadEmployees(): void {
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
        search: this.productSearch().trim() || undefined,
      })
      .subscribe({
        next: (response) => {
          const selectedIds = new Set(this.items().map((item) => Number(item.productId)).filter(Boolean));
          const selectedProducts = this.products().filter((product) =>
            selectedIds.has(product.id ?? product._id ?? 0),
          );
          const productsById = new Map<number, InventoryProduct>();
          for (const product of [...selectedProducts, ...(response.data ?? [])]) {
            productsById.set(product.id ?? product._id ?? 0, product);
          }
          this.products.set([...productsById.values()]);
        },
      });
  }

  /** Resuelve el código y agrega la línea; si no existe ofrece crearlo aquí. */
  applyBarcode(code: string): void {
    const value = code.trim();
    if (!value) return;
    if (this.quickCreateBarcode()) return;

    this.productBarcode.resolveForScan(value, "purchase").subscribe({
      next: (outcome) => {
        switch (outcome.status) {
          case "found":
            this.addScannedProduct(outcome.product);
            break;
          case "not-found":
            this.offerQuickCreate(outcome.code);
            break;
          case "inactive":
            this.notifications.warn(
              "Producto inactivo",
              `"${outcome.product.name}" está inactivo. Actívalo en el catálogo para usarlo.`,
            );
            break;
          case "not-purchasable":
            this.notifications.warn(
              "Producto no disponible",
              `"${outcome.product.name}" es un plato preparado; registra su receta como insumos.`,
            );
            break;
        }
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
      list.some((candidate) => (candidate.id ?? candidate._id) === id) ? list : [...list, product],
    );

    const current = this.items();
    const existingIndex = current.findIndex((item) => Number(item.productId) === id);

    if (existingIndex >= 0) {
      this.items.set(
        current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: Number(item.quantity) + 1 } : item,
        ),
      );
    } else {
      const emptyIndex = current.findIndex((item) => !item.productId);
      const nextItem = { productId: id, quantity: 1, direction: "in" as const };
      this.items.set(
        emptyIndex >= 0
          ? current.map((item, index) => (index === emptyIndex ? nextItem : item))
          : [...current, nextItem],
      );
    }

    this.notifications.success("Producto agregado", `${product.name} · ${product.sku}`);
  }

  addItem(): void {
    this.items.update((items) => [...items, { productId: "", quantity: 1, direction: "in" }]);
  }

  removeItem(index: number): void {
    this.items.update((items) => items.filter((_item, itemIndex) => itemIndex !== index));
  }

  updateItem(index: number, patch: Partial<{ productId: number | ""; quantity: number; direction: MovementDirection }>): void {
    this.items.update((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  movementDirection(type: string): MovementDirection {
    return type === "purchase" ? "in" : "out";
  }

  itemDirection(item: { direction: MovementDirection }): MovementDirection {
    return this.type() === "manual_adjustment" ? item.direction : this.movementDirection(this.type());
  }

  save(): void {
    const items = this.items();
    if (
      !items.length ||
      items.some(
        (item) => !item.productId || !Number.isInteger(Number(item.quantity)) || item.quantity < 1,
      )
    ) {
      this.notifications.warn(
        "Revisa los productos",
        "Cada artículo debe tener un producto y una cantidad entera mayor que cero.",
      );
      return;
    }

    const employeeId = this.selectedEmployeeId();
    this.submitted.emit({
      type: this.type(),
      date: new Date(`${this.date()}T12:00:00`).toISOString(),
      notes: this.notes().trim(),
      ...(employeeId ? { employeeId: Number(employeeId) } : {}),
      items: items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        ...(this.type() === "manual_adjustment" ? { direction: item.direction } : {}),
      })),
    });
  }
}
