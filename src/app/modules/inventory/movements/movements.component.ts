import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryEmployee,
  InventoryMovement,
  InventoryProduct,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
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
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./movements.component.html",
})
export class MovementsComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);

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
  labels = MOVEMENT_LABELS;

  ngOnInit(): void {
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
