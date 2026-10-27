import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CANCEL_REASONS, CancelReason } from "../../cancel-reasons";

export interface CancelOrderResult {
  reason: CancelReason;
  note: string;
}

/**
 * Diálogo para cancelar un pedido/venta con un motivo predefinido y una nota
 * opcional (obligatoria cuando el motivo es "Otro"). Reutilizable en cocina y
 * en la pantalla de ventas.
 */
@Component({
  selector: "app-cancel-order-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./cancel-order-dialog.component.html",
})
export class CancelOrderDialogComponent {
  @Input() title = "Cancelar pedido";
  @Output() confirm = new EventEmitter<CancelOrderResult>();
  @Output() cancel = new EventEmitter<void>();

  readonly reasons = CANCEL_REASONS;
  reason = signal<CancelReason | null>(null);
  note = signal("");

  canConfirm(): boolean {
    const r = this.reason();
    if (!r) return false;
    if (r === "other") return this.note().trim().length > 0;
    return true;
  }

  submit(): void {
    const r = this.reason();
    if (!r || !this.canConfirm()) return;
    this.confirm.emit({ reason: r, note: this.note().trim() });
  }
}
