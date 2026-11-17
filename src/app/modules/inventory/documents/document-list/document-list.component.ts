import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { InventoryDocument } from "../../../../core/services/inventory.service";
import { BarcodeScanToolsComponent } from "../../../../shared/barcode/barcode-scan-tools/barcode-scan-tools.component";
import { PaginationComponent } from "../../../../shared/components/pagination/pagination.component";
import { cancelReasonLabel } from "../../../../shared/cancel-reasons";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { ORDER_STATUS_LABELS, OrderStatus } from "../../order-status.constants";

/** Avance de estado pedido desde la tabla; la pantalla ejecuta el `PUT`. */
export interface DocumentAdvanceEvent {
  document: InventoryDocument;
  orderStatus: OrderStatus;
}

@Component({
  selector: "app-document-list",
  standalone: true,
  imports: [CommonModule, PaginationComponent, BarcodeScanToolsComponent],
  templateUrl: "./document-list.component.html",
  styleUrl: "./document-list.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentListComponent {
  readonly documents = input.required<InventoryDocument[]>();
  readonly loading = input(true);
  readonly isSale = input(false);
  readonly title = input("Ventas");
  readonly singular = input("venta");
  readonly contactLabel = input("Cliente");
  readonly page = input(1);
  readonly pageSize = input(10);
  readonly totalItems = input(0);
  readonly canRegisterPayment = input(false);
  readonly canAdvanceOnSiteOrders = input(false);

  readonly refreshed = output<void>();
  readonly create = output<void>();
  readonly scanned = output<string>();
  readonly opened = output<InventoryDocument>();
  readonly paid = output<InventoryDocument>();
  readonly cancelled = output<InventoryDocument>();
  readonly advanced = output<DocumentAdvanceEvent>();
  readonly pageChange = output<number>();

  currentOrderStatus(document: InventoryDocument): OrderStatus | null {
    if (document.status === "void") return "cancelled";
    const rawStatus = document.deliveryStatus ?? document.orderStatus ?? document.kitchenStatus;
    if (rawStatus === "served") return "delivered";
    if (rawStatus === "picked_up") return "on_route";
    return rawStatus && rawStatus in ORDER_STATUS_LABELS ? rawStatus as OrderStatus : null;
  }

  orderStages(document: InventoryDocument): OrderStatus[] {
    return document.orderChannel === "delivery"
      ? ["pending", "preparing", "ready", "on_route", "delivered"]
      : ["pending", "preparing", "ready", "delivered"];
  }

  orderProgressIndex(document: InventoryDocument): number {
    const status = this.currentOrderStatus(document);
    return status ? this.orderStages(document).indexOf(status) : 0;
  }

  orderProgressLabel(document: InventoryDocument): string {
    const status = this.currentOrderStatus(document);
    return status ? ORDER_STATUS_LABELS[status] : "Pendiente";
  }

  nextOnSiteOrderStatus(document: InventoryDocument): OrderStatus | null {
    if (!this.isSale() || !this.canAdvanceOnSiteOrders() || document.orderChannel === "delivery" || document.status === "void") return null;
    const currentStatus = document.orderStatus ?? document.kitchenStatus ?? "pending";
    if (currentStatus === "pending") return "preparing";
    if (currentStatus === "preparing") return "ready";
    if (currentStatus === "ready") return "delivered";
    return null;
  }

  advance(document: InventoryDocument): void {
    const orderStatus = this.nextOnSiteOrderStatus(document);
    if (!orderStatus) return;
    this.advanced.emit({ document, orderStatus });
  }

  documentContact(document: InventoryDocument): string {
    return this.isSale()
      ? document.customerSnapshot?.name || "Cliente"
      : document.supplierSnapshot?.name || "Proveedor";
  }

  /** Venta pendiente que administración o ventas puede cobrar al recibir el dinero. */
  isPending(document: InventoryDocument): boolean {
    return this.isSale()
      && this.canRegisterPayment()
      && document.status !== "void"
      && document.paymentStatus === "pending";
  }

  /** ¿Se puede cancelar? Ventas no anuladas (restaurante: típicamente pendientes). */
  canCancel(document: InventoryDocument): boolean {
    return this.isSale() && document.status !== "void";
  }

  cancelReasonLabel(value: string | undefined | null): string {
    return cancelReasonLabel(value);
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }
}
