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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { FormsModule } from "@angular/forms";
import {
  CASH_WITHDRAWAL_METHODS,
  CASH_WITHDRAWAL_REASONS,
  CashWithdrawal,
  CashWithdrawalMethod,
  CashWithdrawalReason,
  CashWithdrawalSummary,
  CashWithdrawalsService,
} from "../../../core/services/cash-withdrawals.service";
import { ConfirmService } from "../../../core/services/confirm.service";
import { NotificationService } from "../../../core/services/notification.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";
import { formatCurrency } from "../../../shared/utils/currency.util";

@Component({
  selector: "app-cash-withdrawals",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: "./cash-withdrawal-list.component.html",
  styleUrl: "./cash-withdrawal-list.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashWithdrawalListComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  readonly reasons = CASH_WITHDRAWAL_REASONS;
  readonly methods = CASH_WITHDRAWAL_METHODS;

  private readonly service = inject(CashWithdrawalsService);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly records = signal<CashWithdrawal[]>([]);
  readonly summary = signal<CashWithdrawalSummary | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly dialogOpen = signal(false);

  from = this.monthStart();
  to = this.today();
  reason: CashWithdrawalReason | "" = "";
  dateError = signal(false);

  readonly form = this.formBuilder.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [this.today(), Validators.required],
    reason: ["owner_withdrawal" as CashWithdrawalReason, Validators.required],
    beneficiary: [""],
    method: ["cash" as CashWithdrawalMethod],
    reference: [""],
    notes: [""],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.validRange()) {
      this.dateError.set(true);
      return;
    }
    this.dateError.set(false);
    this.loading.set(true);

    this.service
      .list({ from: this.from, to: this.to, reason: this.reason, page: this.page(), limit: this.pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          if (this.page() > totalPages) {
            this.page.set(totalPages);
            this.load();
            return;
          }
          this.records.set(response.data ?? []);
          this.total.set(response.pagination?.total ?? response.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.service
      .summary(this.from, this.to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.summary.set(response.data),
        error: () => this.summary.set(null),
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  openForm(): void {
    this.form.reset({
      amount: 0,
      date: this.today(),
      reason: "owner_withdrawal",
      beneficiary: "",
      method: "cash",
      reference: "",
      notes: "",
    });
    this.dialogOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.service
      .create({
        date: value.date,
        amount: Number(value.amount),
        reason: value.reason,
        beneficiary: value.beneficiary.trim(),
        method: value.method,
        reference: value.reference.trim(),
        notes: value.notes.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogOpen.set(false);
          this.notifications.success("Retiro registrado", "No afecta ventas ni utilidad bruta.");
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  async cancel(withdrawal: CashWithdrawal): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: "Anular retiro",
      message: `Se anulará el retiro de ${formatCurrency(withdrawal.amount)}. No afecta ventas ni utilidad bruta; el registro se conserva para auditoría.`,
      confirmLabel: "Anular retiro",
      severity: "danger",
    });
    if (!confirmed) return;

    this.service
      .remove(withdrawal.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.success("Retiro anulado");
          this.load();
        },
      });
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  reasonLabel(reason: string): string {
    return CASH_WITHDRAWAL_REASONS.find((item) => item.value === reason)?.label ?? reason;
  }

  methodLabel(method: string): string {
    return CASH_WITHDRAWAL_METHODS.find((item) => item.value === method)?.label ?? method;
  }

  private validRange(): boolean {
    return Boolean(this.from && this.to && this.from <= this.to);
  }

  private today(): string {
    return this.dateString(new Date());
  }

  private monthStart(): string {
    const now = new Date();
    return this.dateString(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  private dateString(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
