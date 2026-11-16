import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { InventoryProduct, InventoryReportMovement } from "../../../../core/models/inventory";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../../shared/components/pagination/pagination.component";
import { movementLabel } from "../report.types";
import { ReportsApi } from "../reports.api";

@Component({
  selector: "app-movements-report",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./movements-report.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsReportComponent {
  private readonly api = inject(ReportsApi);

  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly reloadNonce = input(0);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly movementType = signal("");
  readonly productId = signal("");
  readonly productSearch = signal("");
  readonly products = signal<InventoryProduct[]>([]);
  readonly rows = signal<InventoryReportMovement[]>([]);
  readonly total = signal(0);
  readonly pageCount = signal(1);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly failed = signal(false);

  constructor() {
    effect(() => {
      const from = this.from();
      const to = this.to();
      this.reloadNonce();
      this.movementType();
      this.productId();
      if (!from || !to || from > to) return;
      untracked(() => {
        this.page.set(1);
        this.load();
      });
    });

    this.searchProducts();
  }

  searchProducts(): void {
    this.api.activeProducts(this.productSearch()).subscribe({
      next: (response) => {
        const selected = this.products().find((product) => (product.id ?? product._id) === Number(this.productId()));
        const byId = new Map<number, InventoryProduct>();
        for (const product of [selected, ...(response.data ?? [])]) {
          if (product) byId.set(product.id ?? product._id ?? 0, product);
        }
        this.products.set([...byId.values()]);
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .movements({
        from: this.from(),
        to: this.to(),
        page: this.page(),
        limit: this.pageSize,
        type: this.movementType() || undefined,
        productId: this.productId() || undefined,
      })
      .subscribe({
        next: (response) => {
          const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          if (this.page() > totalPages) {
            this.page.set(totalPages);
            this.load();
            return;
          }
          this.rows.set(response.data ?? []);
          this.total.set(response.pagination?.total ?? response.data.length);
          this.pageCount.set(totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pageCount()) return;
    this.page.set(page);
    this.load();
  }

  label(type: string): string {
    return movementLabel(type);
  }

  quantity(movement: InventoryReportMovement): number {
    return movement.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
