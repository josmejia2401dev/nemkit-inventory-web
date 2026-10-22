import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import {
  InventoryCategory,
  InventoryProduct,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";

@Component({
  selector: "app-products",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./products.component.html",
})
export class ProductsComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  products = signal<InventoryProduct[]>([]);
  categories = signal<InventoryCategory[]>([]);
  loading = signal(true);
  dialogOpen = signal(false);
  saving = signal(false);
  editingId: number | null = null;
  search = "";
  categoryFilter: number | "" = "";
  statusFilter = "";
  stockState = "";
  form = this.emptyForm();

  ngOnInit(): void {
    this.loadCategories();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const stockState = params.get("stockState") ?? "";
        this.stockState = ["out_of_stock", "low_stock"].includes(stockState)
          ? stockState
          : "";
        if (this.stockState) {
          this.search = "";
          this.categoryFilter = "";
          this.statusFilter = "";
        }
        this.loadProducts();
      });
  }

  updateStockFilter(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { stockState: this.stockState || null },
      queryParamsHandling: "merge",
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.inventory
      .list<InventoryProduct>("/products", {
        search: this.search,
        categoryId: this.categoryFilter || undefined,
        status: this.statusFilter || undefined,
        stockState: this.stockState || undefined,
        limit: 100,
      })
      .subscribe({
        next: (response) => {
          this.products.set(response.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  loadCategories(): void {
    this.inventory
      .list<InventoryCategory>("/categories", { limit: 100 })
      .subscribe({
        next: (response) => this.categories.set(response.data ?? []),
      });
  }

  categoryName(id: number): string {
    return (
      this.categories().find((category) => (category.id ?? category._id) === id)
        ?.name ?? "Sin categoría"
    );
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.dialogOpen.set(true);
  }

  openEdit(product: InventoryProduct): void {
    this.editingId = product.id ?? product._id ?? null;
    this.form = {
      categoryId: product.categoryId,
      sku: product.sku,
      barcode: product.barcode ?? "",
      name: product.name,
      description: product.description ?? "",
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      minimumStock: product.minimumStock ?? 0,
      status: product.status,
      image: product.image?.url ?? "",
    };
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  save(): void {
    if (
      !this.form.categoryId ||
      !this.form.sku.trim() ||
      !this.form.name.trim()
    ) {
      this.notifications.warn(
        "Faltan datos",
        "Completa el nombre, SKU y categoría.",
      );
      return;
    }

    const body = {
      categoryId: Number(this.form.categoryId),
      sku: this.form.sku.trim(),
      barcode: this.form.barcode.trim(),
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      purchasePrice: Number(this.form.purchasePrice),
      salePrice: Number(this.form.salePrice),
      minimumStock: Number(this.form.minimumStock),
      status: this.form.status,
      image: this.form.image.trim()
        ? { url: this.form.image.trim() }
        : undefined,
    };

    this.saving.set(true);
    const request = this.editingId
      ? this.inventory.put<InventoryProduct>(
          `/products/${this.editingId}`,
          body,
        )
      : this.inventory.post<InventoryProduct>("/products", body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.notifications.success(
          this.editingId ? "Producto actualizado" : "Producto creado",
        );
        this.loadProducts();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(product: InventoryProduct): void {
    const id = product.id ?? product._id;
    if (!id || !window.confirm(`¿Eliminar "${product.name}"?`)) return;

    this.inventory.delete(`/products/${id}`).subscribe({
      next: () => {
        this.notifications.success(
          "Producto eliminado",
          "El producto se movió a eliminados.",
        );
        this.loadProducts();
      },
    });
  }

  private emptyForm() {
    return {
      categoryId: "" as number | "",
      sku: "",
      barcode: "",
      name: "",
      description: "",
      purchasePrice: 0,
      salePrice: 0,
      minimumStock: 0,
      status: "active" as "active" | "inactive",
      image: "",
    };
  }
}
