import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { InventoryCategory, InventoryProduct } from "../../../../core/services/inventory.service";
import { NotificationService } from "@nemkit/foundation-web";
import { ConfirmService } from "@nemkit/foundation-web";
import { LimitsService } from "@nemkit/foundation-web";
import { AuthStore } from "@nemkit/foundation-web";
import { BarcodeDispatcherService } from "@nemkit/foundation-web";
import { BarcodeScan } from "@nemkit/foundation-web";
import { BarcodeScanToolsComponent } from "@nemkit/foundation-web";
import { EMPTY_SCAN, ScanRequest, nextScan } from "@nemkit/foundation-web";
import { ProductBarcodeService } from "../product-barcode.service";
import { ProductQuickCreateDialogComponent } from "../product-quick-create-dialog/product-quick-create-dialog.component";
import { ProductCatalogService } from "../product-catalog.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "@nemkit/foundation-web";
import { PlanLimitBannerComponent } from "@nemkit/foundation-web";
import { ProductFilterBarComponent } from "../components/product-filter-bar/product-filter-bar.component";
import { ProductTableComponent } from "../components/product-table/product-table.component";
import { ProductDraft, ProductFormDialogComponent } from "./product-form-dialog/product-form-dialog.component";

@Component({
  selector: "app-products",
  standalone: true,
  imports: [
    FormsModule,
    PaginationComponent,
    PlanLimitBannerComponent,
    ProductFilterBarComponent,
    ProductTableComponent,
    BarcodeScanToolsComponent,
    ProductQuickCreateDialogComponent,
    ProductFormDialogComponent,
  ],
  templateUrl: "./product-management.component.html",
  styleUrls: ["./product-management.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductManagementComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private readonly catalog = inject(ProductCatalogService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly barcodeDispatcher = inject(BarcodeDispatcherService);
  private readonly productBarcode = inject(ProductBarcodeService);
  private readonly store = inject(AuthStore);
  readonly limits = inject(LimitsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<InventoryProduct[]>([]);
  readonly categories = signal<InventoryCategory[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly pageCount = signal(1);
  readonly productCount = signal(0);
  readonly dialogOpen = signal(false);
  readonly saving = signal(false);
  readonly editingProduct = signal<InventoryProduct | null>(null);
  readonly scanRequest = signal<ScanRequest>(EMPTY_SCAN);
  readonly quickCreateBarcode = signal<string | null>(null);

  search = "";
  categoryFilter: number | "" = "";
  typeFilter: "" | "simple" = "";
  statusFilter = "";
  stockState: "" | "out_of_stock" | "low_stock" = "";
  specificProductId: number | "" = "";

  readonly typeFilters: Array<{ value: "" | "simple"; label: string }> = [
    { value: "", label: "Todos" },
    { value: "simple", label: "Simples" },
  ];

  ngOnInit(): void {
    this.limits.load().subscribe({ error: () => undefined });
    const unregister = this.barcodeDispatcher.register((scan) => this.onBarcodeScan(scan));
    this.destroyRef.onDestroy(unregister);
    this.loadCategories();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const stockState = params.get("stockState") ?? "";
        this.stockState = ["out_of_stock", "low_stock"].includes(stockState)
          ? (stockState as "out_of_stock" | "low_stock")
          : "";
        const productId = Number(params.get("productId"));
        this.specificProductId = Number.isSafeInteger(productId) && productId > 0 ? productId : "";
        this.page.set(1);
        if (this.stockState) {
          this.search = "";
          this.categoryFilter = "";
          this.statusFilter = "";
        }
        this.loadProducts();
      });
  }

  updateStockFilter(stockState: "" | "out_of_stock" | "low_stock"): void {
    this.stockState = stockState;
    this.page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { stockState: this.stockState || null, productId: null },
      queryParamsHandling: "merge",
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.catalog
      .list({
        search: this.search,
        categoryId: this.categoryFilter || undefined,
        status: this.statusFilter || undefined,
        type: this.typeFilter || undefined,
        stockState: this.stockState || undefined,
        productId: this.specificProductId || undefined,
        page: this.page(),
        limit: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          if (this.page() > totalPages) {
            this.page.set(totalPages);
            this.loadProducts();
            return;
          }
          this.products.set(response.data ?? []);
          this.pageCount.set(totalPages);
          this.productCount.set(response.pagination?.total ?? response.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  goToPage(nextPage: number): void {
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

  private onBarcodeScan(scan: BarcodeScan): void {
    this.applyBarcode(scan.code);
  }

  /**
   * Con el formulario abierto el código llena el campo; en el listado dispara
   * una búsqueda. En ambos casos se avisa si el código ya existe.
   */
  applyBarcode(code: string): void {
    const value = code.trim();
    if (!value) return;
    if (this.quickCreateBarcode()) return;

    if (this.dialogOpen()) {
      this.scanRequest.update((current) => nextScan(current, value));
      return;
    }

    this.specificProductId = "";
    this.search = value;
    this.page.set(1);
    this.loadProducts();

    // Si el código no existe, el listado ofrece crearlo sin salir de aquí.
    this.productBarcode.resolveForScan(value, "catalog").subscribe({
      next: (outcome) => {
        if (outcome.status === "not-found") this.offerQuickCreate(outcome.code);
      },
      error: () => undefined,
    });
  }

  private offerQuickCreate(barcode: string): void {
    const roles = this.store.user()?.roles ?? [];
    if (!this.productBarcode.canManageProducts(roles)) return;

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
    this.notifications.success(
      "Producto creado",
      `"${product.name}" ya está disponible en el catálogo.`,
    );
    this.search = product.barcode ?? this.search;
    this.loadProducts();
    this.limits.load(true).subscribe({ error: () => undefined });
  }

  loadCategories(): void {
    this.catalog.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
    });
  }

  categoryName(id: number): string {
    return (
      this.categories().find((category) => (category.id ?? category._id) === id)?.name ??
      "Sin categoría"
    );
  }

  applyTypeFilter(value: "" | "simple"): void {
    this.typeFilter = value;
    this.page.set(1);
    this.loadProducts();
  }

  openCreate(): void {
    if (!this.limits.canCreate("products")) {
      this.notifications.warn("Límite del plan alcanzado", "No puedes crear más productos con tu plan actual.");
      return;
    }
    this.editingProduct.set(null);
    this.scanRequest.set(EMPTY_SCAN);
    this.dialogOpen.set(true);
  }

  openEdit(product: InventoryProduct): void {
    this.editingProduct.set(product);
    this.scanRequest.set(EMPTY_SCAN);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  save(draft: ProductDraft): void {
    const editing = this.editingProduct();
    this.saving.set(true);
    const request = editing
      ? this.catalog.update(Number(editing.id ?? editing._id), draft.body)
      : this.catalog.create(draft.body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.notifications.success(draft.isCreate ? "Producto creado" : "Producto actualizado");
        this.loadProducts();
        if (draft.isCreate) this.limits.load(true).subscribe({ error: () => undefined });
      },
      error: () => this.saving.set(false),
    });
  }

  async remove(product: InventoryProduct): Promise<void> {
    const id = product.id ?? product._id;
    if (!id) return;
    const ok = await this.confirm.ask({
      title: "Eliminar producto",
      message: `¿Eliminar "${product.name}"? El producto se moverá a eliminados.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      severity: "danger",
    });
    if (!ok) return;

    this.catalog.remove(id).subscribe({
      next: () => {
        this.notifications.success(
          "Producto eliminado",
          "El producto se movió a eliminados.",
        );
        this.loadProducts();
        this.limits.load(true).subscribe({ error: () => undefined });
      },
    });
  }
}
