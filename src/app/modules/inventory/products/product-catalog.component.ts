import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  InventoryCategory,
  InventoryProduct,
} from "../../../core/services/inventory.service";
import { formatCurrency } from "../../../shared/utils/currency.util";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";
import { ProductCatalogService } from "./product-catalog.service";

@Component({
  selector: "app-product-catalog",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./product-catalog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private readonly catalog = inject(ProductCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<InventoryProduct[]>([]);
  readonly categories = signal<InventoryCategory[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly page = signal(1);
  readonly pageCount = signal(1);
  readonly productCount = signal(0);

  search = "";
  categoryFilter: number | "" = "";
  stockState: "" | "out_of_stock" | "low_stock" = "";
  specificProductId: number | "" = "";

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
        this.loadProducts();
      });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    this.catalog
      .list({
        search: this.search.trim() || undefined,
        categoryId: this.categoryFilter || undefined,
        stockState: this.stockState || undefined,
        productId: this.specificProductId || undefined,
        page: this.page(),
        limit: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
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
        error: () => {
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pageCount()) return;

    this.page.set(nextPage);
    this.loadProducts();
  }

  applyFilters(): void {
    this.page.set(1);
    if (this.specificProductId) {
      this.specificProductId = "";
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { productId: null },
        queryParamsHandling: "merge",
      });
      return;
    }
    this.loadProducts();
  }

  updateStockFilter(): void {
    this.page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { stockState: this.stockState || null, productId: null },
      queryParamsHandling: "merge",
    });
  }

  clearProductFocus(): void {
    this.specificProductId = "";
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { productId: null },
      queryParamsHandling: "merge",
    });
  }

  categoryName(categoryId: number): string {
    return this.categories().find((category) => category.id === categoryId)?.name
      ?? "Sin categoría";
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  private loadCategories(): void {
    this.catalog
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
      });
  }
}
