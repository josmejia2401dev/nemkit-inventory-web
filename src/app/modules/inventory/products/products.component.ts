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
import { formatCurrency } from "../../../shared/utils/currency.util";

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
  page = signal(1);
  pageCount = signal(1);
  productCount = signal(0);
  dialogOpen = signal(false);
  saving = signal(false);
  editingId: number | null = null;
  search = "";
  categoryFilter: number | "" = "";
  statusFilter = "";
  stockState = "";
  specificProductId: number | "" = "";
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
        const productId = Number(params.get("productId"));
        this.specificProductId = Number.isSafeInteger(productId) && productId > 0
          ? productId
          : "";
        this.page.set(1);
        if (this.stockState) {
          this.search = "";
          this.categoryFilter = "";
          this.statusFilter = "";
        }
        this.loadProducts();
      });
  }

  updateStockFilter(): void {
    this.page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { stockState: this.stockState || null, productId: null },
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
        productId: this.specificProductId || undefined,
        page: this.page(),
        limit: 20,
      })
      .subscribe({
        next: (response) => {
          this.products.set(response.data ?? []);
          this.pageCount.set(response.pagination?.totalPages ?? 1);
          this.productCount.set(response.pagination?.total ?? response.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  changePage(direction: -1 | 1): void {
    const nextPage = this.page() + direction;
    if (nextPage < 1 || nextPage > this.pageCount()) return;
    this.page.set(nextPage);
    this.loadProducts();
  }

  applyFilters(): void {
    if (this.specificProductId) {
      this.specificProductId = "";
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { productId: null },
        queryParamsHandling: "merge",
      });
      return;
    }
    this.page.set(1);
    this.loadProducts();
  }

  clearProductFocus(): void {
    this.specificProductId = "";
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { productId: null },
      queryParamsHandling: "merge",
    });
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  loadCategories(): void {
    this.inventory.listAll<InventoryCategory>("/categories").subscribe({
      next: (categories) => this.categories.set(categories),
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
