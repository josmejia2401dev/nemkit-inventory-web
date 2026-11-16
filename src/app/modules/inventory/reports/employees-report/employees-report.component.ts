import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from "@angular/core";
import type { InventorySalesByEmployeeReport } from "../../../../core/models/inventory";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../../shared/components/pagination/pagination.component";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { ReportExportService } from "../report-export.service";
import { ReportsApi } from "../reports.api";

@Component({
  selector: "app-employees-report",
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: "./employees-report.component.html",
  styleUrl: "./employees-report.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesReportComponent {
  private readonly api = inject(ReportsApi);
  private readonly exporter = inject(ReportExportService);

  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly reloadNonce = input(0);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly report = signal<InventorySalesByEmployeeReport | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly page = signal(1);

  readonly visibleRows = computed(() => {
    const rows = this.report()?.employees ?? [];
    const start = (this.page() - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  });

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
    this.api.employees(this.from(), this.to()).subscribe({
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
    const total = this.report()?.employees.length ?? 0;
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
    this.exporter.employeesExcel(report, this.from(), this.to());
  }
}
