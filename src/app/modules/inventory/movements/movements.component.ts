import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryMovement,
  InventoryProduct,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";

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
  imports: [CommonModule, FormsModule],
  templateUrl: "./movements.component.html",
})
export class MovementsComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);

  movements = signal<InventoryMovement[]>([]);
  products = signal<InventoryProduct[]>([]);
  loading = signal(true);
  dialogOpen = signal(false);
  saving = signal(false);
  type = "purchase";
  notes = "";
  date = new Date().toISOString().slice(0, 10);
  items: Array<{
    productId: number | "";
    quantity: number;
    direction: "in" | "out";
  }> = [this.emptyItem()];
  filterType = "";
  labels = MOVEMENT_LABELS;

  ngOnInit(): void {
    this.loadProducts();
    this.loadMovements();
  }

  loadProducts(): void {
    this.inventory
      .list<InventoryProduct>("/products", { limit: 100, status: "active" })
      .subscribe({
        next: (response) => this.products.set(response.data ?? []),
      });
  }

  loadMovements(): void {
    this.loading.set(true);
    this.inventory
      .list<InventoryMovement>("/movements", {
        limit: 100,
        type: this.filterType || undefined,
      })
      .subscribe({
        next: (response) => {
          this.movements.set(response.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openCreate(): void {
    this.type = "purchase";
    this.notes = "";
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

    const body = {
      type: this.type,
      date: new Date(`${this.date}T12:00:00`).toISOString(),
      notes: this.notes.trim(),
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
