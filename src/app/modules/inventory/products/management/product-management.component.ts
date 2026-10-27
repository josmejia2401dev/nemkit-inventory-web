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
import {
  InventoryCategory,
  InventoryProduct,
  InventoryService,
  ProductType,
} from "../../../../core/services/inventory.service";
import { NotificationService } from "../../../../core/services/notification.service";
import { ConfirmService } from "../../../../core/services/confirm.service";
import { ProductCatalogService } from "../product-catalog.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../../shared/components/pagination/pagination.component";
import { ProductFilterBarComponent } from "../components/product-filter-bar/product-filter-bar.component";
import { ProductTableComponent } from "../components/product-table/product-table.component";

@Component({
  selector: "app-products",
  standalone: true,
  imports: [FormsModule, PaginationComponent, ProductFilterBarComponent, ProductTableComponent],
  templateUrl: "./product-management.component.html",
  styleUrls: ["./product-management.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductManagementComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);
  private catalog = inject(ProductCatalogService);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);
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
  typeFilter: "" | "simple" | "ingredient" | "prepared" = "";

  readonly typeFilters: Array<{ value: "" | "simple" | "ingredient" | "prepared"; label: string }> = [
    { value: "", label: "Todos" },
    { value: "simple", label: "Simples" },
    { value: "ingredient", label: "Insumos" },
    { value: "prepared", label: "Platos" },
  ];

  // Insumos disponibles para armar recetas (productos ingredient o simple).
  ingredients = signal<InventoryProduct[]>([]);
  readonly typeOptions: Array<{ value: ProductType; label: string; hint: string }> = [
    { value: "simple", label: "Simple", hint: "Se compra y se vende (tiendas)" },
    { value: "ingredient", label: "Insumo", hint: "Se compra, no se vende suelto" },
    { value: "prepared", label: "Plato / preparado", hint: "Se vende con receta de insumos" },
  ];
  statusFilter = "";
  stockState: "" | "out_of_stock" | "low_stock" = "";
  specificProductId: number | "" = "";
  form = this.emptyForm();

  ngOnInit(): void {
    this.loadCategories();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const stockState = params.get("stockState") ?? "";
        this.stockState = ["out_of_stock", "low_stock"].includes(stockState)
          ? (stockState as "out_of_stock" | "low_stock")
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

  loadCategories(): void {
    this.catalog.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
    });
  }

  loadIngredients(): void {
    // Insumos y simples activos, aptos para formar parte de una receta.
    this.inventory.listAll<InventoryProduct>("/products", {
      status: "active",
      types: "ingredient,simple",
    }).subscribe({
      next: (products) => this.ingredients.set(products),
    });
  }

  ingredientName(id: number): string {
    const p = this.ingredients().find((item) => (item.id ?? item._id) === id);
    return p ? p.name : `Insumo #${id}`;
  }

  addRecipeItem(): void {
    this.form.recipe = [...this.form.recipe, { ingredientId: "" as number | "", quantity: 1 }];
  }

  removeRecipeItem(index: number): void {
    this.form.recipe = this.form.recipe.filter((_item, i) => i !== index);
  }

  categoryName(id: number): string {
    return (
      this.categories().find((category) => (category.id ?? category._id) === id)
        ?.name ?? "Sin categoría"
    );
  }

  applyTypeFilter(value: "" | "simple" | "ingredient" | "prepared"): void {
    this.typeFilter = value;
    this.page.set(1);
    this.loadProducts();
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.loadIngredients();
    this.dialogOpen.set(true);
  }

  openEdit(product: InventoryProduct): void {
    this.editingId = product.id ?? product._id ?? null;
    this.form = {
      categoryId: product.categoryId,
      type: product.type ?? "simple",
      sku: product.sku,
      barcode: product.barcode ?? "",
      name: product.name,
      description: product.description ?? "",
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      minimumStock: product.minimumStock ?? 0,
      status: product.status,
      image: product.image?.url ?? "",
      recipe: (product.recipe ?? []).map((ri) => ({
        ingredientId: ri.ingredientId as number | "",
        quantity: ri.quantity,
      })),
    };
    this.loadIngredients();
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

    const isPrepared = this.form.type === "prepared";
    let recipe: Array<{ ingredientId: number; quantity: number }> | undefined;
    if (isPrepared) {
      // La receta es opcional: si el restaurante no define insumos, el plato se
      // guarda igual (la venta no descontará insumos). Solo enviamos los válidos.
      const valid = this.form.recipe.filter((ri) => ri.ingredientId && Number(ri.quantity) > 0);
      recipe = valid.map((ri) => ({ ingredientId: Number(ri.ingredientId), quantity: Number(ri.quantity) }));
    }

    const body: Record<string, unknown> = {
      categoryId: Number(this.form.categoryId),
      type: this.form.type,
      sku: this.form.sku.trim(),
      barcode: this.form.barcode.trim(),
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      // Precio de compra opcional: si queda vacío, se envía 0.
      purchasePrice: Number(this.form.purchasePrice) || 0,
      salePrice: Number(this.form.salePrice),
      minimumStock: Number(this.form.minimumStock),
      status: this.form.status,
      image: this.form.image.trim()
        ? { url: this.form.image.trim() }
        : undefined,
    };
    if (isPrepared) body["recipe"] = recipe;

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
      type: "simple" as ProductType,
      sku: "",
      barcode: "",
      name: "",
      description: "",
      purchasePrice: 0,
      salePrice: 0,
      minimumStock: 0,
      status: "active" as "active" | "inactive",
      image: "",
      recipe: [] as Array<{ ingredientId: number | ""; quantity: number }>,
    };
  }
}
