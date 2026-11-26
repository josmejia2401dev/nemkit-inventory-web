import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LayawaysApi } from "../layaways.api";
import { NotificationService } from "../../../../core/services/notification.service";
import { Layaway, LayawayPaymentMethod } from "../../../../core/models/inventory";
import { formatCurrency } from "../../../../shared/utils/currency.util";

@Component({
  selector: "app-layaway-payment-dialog",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./layaway-payment-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayawayPaymentDialogComponent implements OnInit {
  private readonly api = inject(LayawaysApi);
  private readonly notifications = inject(NotificationService);

  readonly layaway = input.required<Layaway>();
  readonly saved = output<Layaway>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  form = {
    amount: 0,
    method: "cash" as LayawayPaymentMethod,
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  };

  ngOnInit(): void {
    this.form.amount = this.layaway().balance;
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  payFull(): void {
    this.form.amount = this.layaway().balance;
  }

  submit(): void {
    const amount = Number(this.form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.notifications.warn("Monto inválido", "El abono debe ser mayor que cero.");
      return;
    }
    if (amount > this.layaway().balance) {
      this.notifications.warn("El abono supera el saldo", "Ajusta el monto o usa “Pagar saldo”.");
      return;
    }
    this.saving.set(true);
    this.api.addPayment(this.layaway().id, {
      amount,
      method: this.form.method,
      date: this.form.date || undefined,
      reference: this.form.reference.trim() || undefined,
      notes: this.form.notes.trim() || undefined,
    }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notifications.success("Abono registrado", `Saldo: ${formatCurrency(response.data.balance)}`);
        this.saved.emit(response.data);
      },
      error: () => this.saving.set(false),
    });
  }
}
