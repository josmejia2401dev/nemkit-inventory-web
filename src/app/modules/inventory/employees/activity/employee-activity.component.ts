import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventorySalesByEmployeeReport,
  InventorySalesByEmployeeRow,
  InventoryService,
} from "../../../../core/services/inventory.service";
import { formatCurrency } from "../../../../shared/utils/currency.util";

@Component({
  selector: "app-employee-activity",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./employee-activity.component.html",
  styleUrl: "./employee-activity.component.css",
})
export class EmployeeActivityComponent implements OnInit {
  @Input({ required: true }) employeeId!: number;
  @Input({ required: true }) employeeName = "";
  @Output() closed = new EventEmitter<void>();

  private inventory = inject(InventoryService);
  metrics = signal<InventorySalesByEmployeeRow | null>(null);
  loading = signal(true);
  failed = signal(false);
  from = this.localDate(-29);
  to = this.localDate(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.from || !this.to || this.from > this.to) {
      this.failed.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.failed.set(false);
    this.inventory.get<InventorySalesByEmployeeReport>("/statistics/employees/sales", {
      from: this.from,
      to: this.to,
    }).subscribe({
      next: (response) => {
        this.metrics.set(response.data.employees.find((employee) => employee.employeeId === this.employeeId) ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  money(value = 0): string {
    return formatCurrency(value);
  }

  private localDate(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }
}
