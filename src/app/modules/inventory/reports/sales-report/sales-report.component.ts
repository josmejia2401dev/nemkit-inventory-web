import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { InventorySalesReport } from "../../../../core/models/inventory";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../../shared/components/pagination/pagination.component";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { ReportsApi } from "../reports.api";

export type SalesGroupBy = "day" | "week" | "month";

@Component({
  selector: "app-sales-report",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./sales-report.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesReportComponent {
  private readonly api = inject(ReportsApi);

  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly reloadNonce = input(0);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly groupBy = signal<SalesGroupBy>("day");
  readonly report = signal<InventorySalesReport | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly page = signal(1);

  readonly visiblePeriods = computed(() => {
    const periods = this.report()?.periods ?? [];
    const start = (this.page() - 1) * this.pageSize;
    return periods.slice(start, start + this.pageSize);
  });

  constructor() {
    effect(() => {
      const from = this.from();
      const to = this.to();
      this.reloadNonce();
      this.groupBy();
      if (!from || !to || from > to) return;
      untracked(() => {
        this.page.set(1);
        this.load();
      });
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.sales(this.from(), this.to(), this.groupBy()).subscribe({
      next: (response) => {
        this.report.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    const total = this.report()?.periods.length ?? 0;
    const max = Math.max(1, Math.ceil(total / this.pageSize));
    if (page < 1 || page > max) return;
    this.page.set(page);
  }

  groupLabel(): string {
    return this.groupBy() === "day" ? "día" : this.groupBy() === "week" ? "semana" : "mes";
  }

  periodFormat(): string {
    return this.groupBy() === "month" ? "MMMM yyyy" : "d MMM yyyy";
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }
}
