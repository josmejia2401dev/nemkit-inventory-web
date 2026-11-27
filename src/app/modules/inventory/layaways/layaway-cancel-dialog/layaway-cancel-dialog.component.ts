import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LayawaysApi } from "../layaways.api";
import { NotificationService } from "@nemkit/foundation-web";
import {
  Layaway,
  LayawayPaymentMethod,
  LayawayReturnCondition,
  LayawaySettings,
} from "../../../../core/models/inventory";
import { formatCurrency } from "@nemkit/foundation-web";

@Component({
  selector: "app-layaway-cancel-dialog",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./layaway-cancel-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayawayCancelDialogComponent implements OnInit {
  private readonly api = inject(LayawaysApi);
  private readonly notifications = inject(NotificationService);

  readonly layaway = input.required<Layaway>();
  readonly settings = input<LayawaySettings | null>(null);
  readonly saved = output<Layaway>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  form = {
    reason: "customer_changed",
    note: "",
    productReturned: false,
    returnCondition: "not_returned" as LayawayReturnCondition,
    refundAmount: 0,
    refundMethod: "cash" as LayawayPaymentMethod,
  };

  get delivered(): boolean {
    return this.layaway().handoverStatus === "delivered";
  }

  ngOnInit(): void {
    const settings = this.settings();
    const paid = this.layaway().paidAmount;
    let refund = paid;
    if (settings?.cancellationPolicy === "retain_percent") {
      refund = paid * (1 - settings.retentionPercent / 100);
    }
    this.form.refundAmount = Math.round(refund * 100) / 100;
    this.form.productReturned = this.delivered;
    this.form.returnCondition = this.delivered ? "resellable" : "not_returned";
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  onReturnToggle(): void {
    this.form.returnCondition = this.form.productReturned ? "resellable" : "not_returned";
  }

  submit(): void {
    const refundAmount = Number(this.form.refundAmount) || 0;
    if (refundAmount < 0 || refundAmount > this.layaway().paidAmount) {
      this.notifications.warn("Devolución inválida", "No puede superar lo abonado.");
      return;
    }
    this.saving.set(true);
    this.api.cancel(this.layaway().id, {
      reason: this.form.reason,
      note: this.form.note.trim() || undefined,
      productReturned: this.delivered ? this.form.productReturned : false,
      returnCondition: this.delivered ? this.form.returnCondition : undefined,
      refundAmount,
      refundMethod: this.form.refundMethod,
    }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notifications.success("Plan separe cancelado", "El stock y la caja quedaron actualizados.");
        this.saved.emit(response.data);
      },
      error: () => this.saving.set(false),
    });
  }
}
