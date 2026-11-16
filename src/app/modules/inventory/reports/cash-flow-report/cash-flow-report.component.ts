import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CashFlowReport } from "../../../../core/services/cash-withdrawals.service";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { ReportsApi } from "../reports.api";

@Component({
  selector: "app-cash-flow-report",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./cash-flow-report.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashFlowReportComponent {
  private readonly api = inject(ReportsApi);

  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly reloadNonce = input(0);

  readonly report = signal<CashFlowReport | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  constructor() {
    effect(() => {
      const from = this.from();
      const to = this.to();
      this.reloadNonce();
      if (!from || !to || from > to) return;
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.cashFlow(this.from(), this.to()).subscribe({
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

  formatMoney(value: number): string {
    return formatCurrency(value);
  }
}
