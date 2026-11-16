import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CashFlowReportComponent } from "./cash-flow-report/cash-flow-report.component";
import { CancellationsReportComponent } from "./cancellations-report/cancellations-report.component";
import { EmployeesReportComponent } from "./employees-report/employees-report.component";
import { InventoryReportComponent } from "./inventory-report/inventory-report.component";
import { MovementsReportComponent } from "./movements-report/movements-report.component";
import type { ReportKind } from "./report.types";
import { SalesReportComponent } from "./sales-report/sales-report.component";

@Component({
  selector: "app-inventory-reports",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InventoryReportComponent,
    MovementsReportComponent,
    SalesReportComponent,
    EmployeesReportComponent,
    CancellationsReportComponent,
    CashFlowReportComponent,
  ],
  templateUrl: "./reports.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
  readonly kind = signal<ReportKind>("inventory");
  readonly from = signal(this.localDate(-364));
  readonly to = signal(this.localDate(0));
  readonly periodPreset = signal("custom");
  readonly refresh = signal(0);

  readonly needsRange = computed(() => this.kind() !== "inventory");
  readonly dateError = computed(
    () => this.needsRange() && (!this.from() || !this.to() || this.from() > this.to()),
  );

  selectReport(kind: ReportKind): void {
    this.kind.set(kind);
  }

  reload(): void {
    this.refresh.update((value) => value + 1);
  }

  setPeriodPreset(preset: string): void {
    this.periodPreset.set(preset);
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let start = currentMonthStart;
    let end = currentMonthEnd;

    if (preset === "this-week" || preset === "last-week") {
      const mondayOffset = (today.getDay() + 6) % 7;
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
      if (preset === "last-week") start.setDate(start.getDate() - 7);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    } else if (preset === "previous-month") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === "first-half") {
      start = currentMonthStart;
      end = new Date(today.getFullYear(), today.getMonth(), 15);
    } else if (preset === "second-half") {
      start = new Date(today.getFullYear(), today.getMonth(), 16);
      end = currentMonthEnd;
    }

    this.from.set(this.dateString(start));
    this.to.set(this.dateString(end));
  }

  private localDate(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return this.dateString(date);
  }

  private dateString(date: Date): string {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }
}
