import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, Input, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { interval } from "rxjs";
import { InventoryService, KitchenStatus, OrderStatus } from "../../../core/services/inventory.service";
import { ORDER_STATUS_LABELS } from "../order-status.constants";
import { NotificationService } from "../../../core/services/notification.service";
import { ConfirmService } from "../../../core/services/confirm.service";
import { formatCurrency } from "../../../shared/utils/currency.util";
import {
  CancelOrderDialogComponent,
  CancelOrderResult,
} from "../../../shared/components/cancel-order-dialog/cancel-order-dialog.component";

interface KitchenOrder {
  id: number;
  date: string;
  tableNumber?: string;
  orderStatus: KitchenStatus;
  orderChannel?: "delivery" | "on_site";
  paymentStatus?: "paid" | "pending";
  total?: number;
  notes?: string;
  customerSnapshot?: { name?: string };
  employeeSnapshot?: { name?: string };
  items: Array<{ name: string; quantity: number }>;
}

export type KitchenBoardMode = "service" | "preparation";

const STATUS_LABELS: Record<KitchenStatus, string> = {
  pending: ORDER_STATUS_LABELS.pending,
  preparing: ORDER_STATUS_LABELS.preparing,
  ready: ORDER_STATUS_LABELS.ready,
};

const NEXT: Record<KitchenStatus, { status: OrderStatus; label: string; icon: string } | null> = {
  pending: { status: "preparing", label: "Empezar a preparar", icon: "pi pi-play" },
  preparing: { status: "ready", label: "Marcar listo", icon: "pi pi-check" },
  ready: { status: "delivered", label: "Entregar", icon: "pi pi-check-circle" },
};

@Component({
  selector: "app-kitchen-board",
  standalone: true,
  imports: [CommonModule, CancelOrderDialogComponent],
  templateUrl: "./kitchen-board.component.html",
  styleUrls: ["./kitchen-board.component.css"],
})
export class KitchenBoardComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);

  @Input({ required: true }) mode!: KitchenBoardMode;

  readonly columns: KitchenStatus[] = ["pending", "preparing", "ready"];
  readonly statusLabels = STATUS_LABELS;

  orders = signal<KitchenOrder[]>([]);
  loading = signal(true);
  cancelling = signal<KitchenOrder | null>(null);
  mobileColumn = signal<KitchenStatus>("pending");

  ngOnInit(): void {
    this.load();
    // Auto-refresco cada 15s para ver nuevos pedidos sin recargar.
    interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(true));
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.inventory.get<KitchenOrder[]>("/kitchen").subscribe({
      next: (response) => {
        this.orders.set(response.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ordersFor(status: KitchenStatus): KitchenOrder[] {
    return this.orders().filter((order) => order.orderStatus === status);
  }

  selectMobileColumn(status: KitchenStatus): void {
    this.mobileColumn.set(status);
  }

  next(order: KitchenOrder): { status: OrderStatus; label: string; icon: string } | null {
    if (order.orderStatus === "ready" && order.orderChannel === "delivery") return null;
    return NEXT[order.orderStatus];
  }

  advance(order: KitchenOrder): void {
    const n = this.next(order);
    if (!n) return;
    this.setStatus(order, n.status, ORDER_STATUS_LABELS[n.status]);
  }

  private setStatus(order: KitchenOrder, status: OrderStatus, label: string): void {
    this.inventory.put(`/kitchen/${order.id}`, { orderStatus: status }).subscribe({
      next: () => {
        this.notifications.success(`Pedido #${order.id}`, `Ahora: ${label}.`);
        this.load(true);
      },
      error: (err) => {
        const detail = err?.error?.message || "No se pudo cambiar el estado.";
        this.notifications.error("No se pudo actualizar", detail);
      },
    });
  }

  minutesAgo(date: string): number {
    return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  /** Registra el cobro de una comanda "por cobrar". */
  async pay(order: KitchenOrder): Promise<void> {
    const ok = await this.confirm.ask({
      title: "Cobrar pedido",
      message: `¿Registrar el cobro del pedido #${order.id}${order.total != null ? ` por ${this.formatMoney(order.total)}` : ""}?`,
      confirmLabel: "Cobrar",
      cancelLabel: "Volver",
      severity: "info",
    });
    if (!ok) return;
    this.inventory.put(`/sales/${order.id}/pay`, {}).subscribe({
      next: () => {
        this.notifications.success(`Pedido #${order.id}`, "Cobro registrado.");
        this.load(true);
      },
    });
  }

  /** Abre el diálogo para cancelar un pedido con motivo. */
  openCancel(order: KitchenOrder): void {
    this.cancelling.set(order);
  }

  confirmCancel(result: CancelOrderResult): void {
    const order = this.cancelling();
    if (!order) return;
    this.inventory.put(`/kitchen/${order.id}/cancel`, result).subscribe({
      next: () => {
        this.notifications.success(`Pedido #${order.id}`, "Pedido cancelado.");
        this.cancelling.set(null);
        this.load(true);
      },
      error: (err) => {
        const detail = err?.error?.message || "No se pudo cancelar el pedido.";
        this.notifications.error("No se pudo cancelar", detail);
      },
    });
  }
}
