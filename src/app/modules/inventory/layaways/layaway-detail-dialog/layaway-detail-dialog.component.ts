import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Layaway } from "../../../../core/models/inventory";
import { formatCurrency } from "../../../../shared/utils/currency.util";

@Component({
  selector: "app-layaway-detail-dialog",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./layaway-detail-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayawayDetailDialogComponent {
  readonly layaway = input.required<Layaway>();
  readonly changed = output<void>();
  readonly closed = output<void>();
  readonly pay = output<Layaway>();
  readonly cancel = output<Layaway>();
  readonly deliver = output<Layaway>();

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }

  statusLabel(status: Layaway["status"]): string {
    return {
      active: "Activo",
      ready: "Listo para entregar",
      completed: "Completado",
      cancelled: "Cancelado",
    }[status] ?? status;
  }

  handoverLabel(layaway: Layaway): string {
    if (layaway.handoverStatus === "delivered") {
      if (layaway.handoverMode === "immediate") return "Entregado con la cuota inicial";
      if (layaway.handoverMode === "delivery") return "Entregado a domicilio";
      return "Entregado en tienda";
    }
    if (layaway.handoverMode === "delivery") return "Pendiente de domicilio";
    if (layaway.handoverMode === "immediate") return "Pendiente de entrega inmediata";
    return "Pendiente de recogida";
  }

  methodLabel(method: string | undefined): string {
    return {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      nequi: "Nequi",
      daviplata: "Daviplata",
      other: "Otro",
    }[method ?? "cash"] ?? method ?? "—";
  }

  print(): void {
    window.print();
  }
}
