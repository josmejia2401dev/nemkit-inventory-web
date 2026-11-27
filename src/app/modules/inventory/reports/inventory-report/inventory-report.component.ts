import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from "@angular/core";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "@nemkit/foundation-web";
import { formatCurrency } from "@nemkit/foundation-web";
import { ReportExportService } from "../report-export.service";
import type { InventoryReport } from "../report.types";
import { ReportsApi } from "../reports.api";

@Component({
  selector: "app-inventory-report",
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: "./inventory-report.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryReportComponent {
  private readonly api = inject(ReportsApi);
  private readonly exporter = inject(ReportExportService);

  readonly reloadNonce = input(0);
  readonly to = input.required<string>();
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly report = signal<InventoryReport | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly page = signal(1);

  readonly visibleItems = computed(() => {
    const items = this.report()?.items ?? [];
    const start = (this.page() - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  });

  constructor() {
    effect(() => {
      this.reloadNonce();
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.inventoryReport().subscribe({
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
    const total = this.report()?.items.length ?? 0;
    const max = Math.max(1, Math.ceil(total / this.pageSize));
    if (page < 1 || page > max) return;
    this.page.set(page);
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  exportExcel(): void {
    const report = this.report();
    if (!report) return;
    this.exporter.inventoryExcel(report, this.to());
  }

  exportPdf(): void {
    const report = this.report();
    if (!report) return;
    this.exporter.inventoryPdf(report);
  }
}
