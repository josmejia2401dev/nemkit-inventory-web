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
  template: `
    <div class="dialog-backdrop" (click)="cancel.emit()">
      <section class="form-dialog cancel-dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="dialog-heading">
          <div><p class="eyebrow">CANCELAR</p><h2>{{ title }}</h2></div>
          <button class="icon-button" (click)="cancel.emit()" aria-label="Cerrar"><i class="pi pi-times"></i></button>
        </div>
        <div class="dialog-form">
          <p class="cancel-hint">Selecciona el motivo de la cancelación. El pedido saldrá de la cola y se repondrá el stock.</p>
          <div class="cancel-reasons">
            @for (r of reasons; track r.value) {
              <button type="button" class="cancel-reason" [class.cancel-reason--active]="reason() === r.value" (click)="reason.set(r.value)">
                {{ r.label }}
              </button>
            }
          </div>
          @if (reason() === "other") {
            <label class="form-field">
              <span>Describe el motivo <b>*</b></span>
              <input [ngModel]="note()" (ngModelChange)="note.set($event)" name="note" maxlength="300" placeholder="Ej. Falla en la cocina" />
            </label>
          } @else {
            <label class="form-field">
              <span>Nota (opcional)</span>
              <input [ngModel]="note()" (ngModelChange)="note.set($event)" name="note" maxlength="300" placeholder="Detalle adicional" />
            </label>
          }
        </div>
        <div class="dialog-actions">
          <button class="button button-secondary" (click)="cancel.emit()">Volver</button>
          <button class="button button-danger" [disabled]="!canConfirm()" (click)="submit()"><i class="pi pi-ban"></i> Cancelar pedido</button>
        </div>
      </section>
    </div>
  `,
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
