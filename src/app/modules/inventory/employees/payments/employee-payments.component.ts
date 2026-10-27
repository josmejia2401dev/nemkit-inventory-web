import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryEmployeePayment,
  InventoryEmployeePaymentSummary,
  InventoryService,
  PageResult,
} from "../../../../core/services/inventory.service";
import { NotificationService } from "../../../../core/services/notification.service";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../../shared/components/pagination/pagination.component";

interface PaymentForm {
  paymentDate: string;
  periodStart: string;
  periodEnd: string;
  type: InventoryEmployeePayment["type"];
  amount: number | null;
  method: InventoryEmployeePayment["method"];
  reference: string;
  notes: string;
}

@Component({
  selector: "app-employee-payments",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./employee-payments.component.html",
  styleUrl: "./employee-payments.component.css",
})
export class EmployeePaymentsComponent {
  @Input({ required: true }) employeeId!: number;
  @Input({ required: true }) employeeName = "";
  @Output() closed = new EventEmitter<void>();

  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);

  records = signal<InventoryEmployeePayment[]>([]);
  summary = signal<InventoryEmployeePaymentSummary | null>(null);
  loading = signal(true);
  saving = signal(false);
  page = signal(1);
  total = signal(0);
  formOpen = signal(false);
  form: PaymentForm = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.inventory.list<InventoryEmployeePayment>("/employee-payments", {
      employeeId: this.employeeId,
      page: this.page(),
      limit: this.pageSize,
    }).subscribe({
      next: (response: PageResult<InventoryEmployeePayment>) => {
        this.records.set(response.data ?? []);
        this.total.set(response.pagination?.total ?? response.data.length);
        this.inventory.get<InventoryEmployeePaymentSummary>("/employee-payments/summary", {
          employeeId: this.employeeId,
        }).subscribe({
          next: (summary) => {
            this.summary.set(summary.data);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.form = this.emptyForm();
    this.formOpen.set(true);
  }

  save(): void {
    if (!this.form.amount || this.form.amount <= 0) {
      this.notifications.warn("Revisa el valor", "El pago debe ser mayor que cero.");
      return;
    }
    if (Boolean(this.form.periodStart) !== Boolean(this.form.periodEnd)) {
      this.notifications.warn("Revisa el período", "Indica las dos fechas del período o déjalas vacías.");
      return;
    }
    if (this.form.periodStart && this.form.periodEnd && this.form.periodStart > this.form.periodEnd) {
      this.notifications.warn("Revisa el período", "La fecha inicial debe ser anterior o igual a la fecha final.");
      return;
    }

    this.saving.set(true);
    this.inventory.post<InventoryEmployeePayment>("/employee-payments", {
      employeeId: this.employeeId,
      paymentDate: this.form.paymentDate,
      periodStart: this.form.periodStart || undefined,
      periodEnd: this.form.periodEnd || undefined,
      type: this.form.type,
      amount: this.form.amount,
      method: this.form.method,
      reference: this.form.reference.trim(),
      notes: this.form.notes.trim(),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notifications.success("Pago registrado", "El historial del empleado se actualizó.");
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  money(value: number): string {
    return formatCurrency(value);
  }

  paymentTypeLabel(type: InventoryEmployeePayment["type"]): string {
    const labels: Record<InventoryEmployeePayment["type"], string> = {
      salary: "Salario",
      advance: "Anticipo",
      commission: "Comisión",
      bonus: "Bonificación",
      other: "Otro pago",
    };
    return labels[type] ?? "Otro pago";
  }

  paymentMethodLabel(method: InventoryEmployeePayment["method"]): string {
    const labels: Record<InventoryEmployeePayment["method"], string> = {
      cash: "Efectivo",
      bank_transfer: "Transferencia",
      other: "Otro medio",
    };
    return labels[method] ?? "Otro medio";
  }

  private emptyForm(): PaymentForm {
    return {
      paymentDate: this.localDate(),
      periodStart: "",
      periodEnd: "",
      type: "salary",
      amount: null,
      method: "bank_transfer",
      reference: "",
      notes: "",
    };
  }

  private localDate(): string {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }
}
