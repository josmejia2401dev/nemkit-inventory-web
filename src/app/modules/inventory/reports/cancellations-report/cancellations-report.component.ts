import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from "@angular/core";
import type { InventoryCancelledSalesReport } from "../../../../core/models/inventory";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../../shared/components/pagination/pagination.component";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { cancellationReason } from "../report.types";
import { ReportsApi } from "../reports.api";

@Component({
  selector: "app-cancellations-report",
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: "./cancellations-report.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancellationsReportComponent {
  private readonly api = inject(ReportsApi);

  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly reloadNonce = input(0);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly report = signal<InventoryCancelledSalesReport | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly page = signal(1);
  readonly pageCount = signal(1);

  constructor() {
    effect(() => {
      const from = this.from();
      const to = this.to();
      this.reloadNonce();
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
    this.api.cancellations(this.from(), this.to(), this.page(), this.pageSize).subscribe({
      next: (response) => {
        const report = response.data;
        const totalPages = Math.max(1, report.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
        this.report.set(report);
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

  reason(value: string | undefined): string {
    return cancellationReason(value);
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }
}
