import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { interval } from "rxjs";
import { InventoryService } from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";

type KitchenStatus = "pending" | "preparing" | "ready" | "served";

interface KitchenOrder {
  id: number;
  date: string;
  tableNumber?: string;
  kitchenStatus: KitchenStatus;
  notes?: string;
  customerSnapshot?: { name?: string };
  employeeSnapshot?: { name?: string };
  items: Array<{ name: string; quantity: number }>;
}

const STATUS_LABELS: Record<KitchenStatus, string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Listo",
  served: "Servido",
};

const NEXT: Record<KitchenStatus, { status: KitchenStatus; label: string } | null> = {
  pending: { status: "preparing", label: "Empezar a preparar" },
  preparing: { status: "ready", label: "Marcar listo" },
  ready: { status: "served", label: "Marcar servido" },
  served: null,
};

@Component({
  selector: "app-kitchen-board",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./kitchen-board.component.html",
})
export class KitchenBoardComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  readonly columns: KitchenStatus[] = ["pending", "preparing", "ready"];
  readonly statusLabels = STATUS_LABELS;

  orders = signal<KitchenOrder[]>([]);
  loading = signal(true);

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
    return this.orders().filter((order) => order.kitchenStatus === status);
  }

  next(order: KitchenOrder) {
    return NEXT[order.kitchenStatus];
  }

  advance(order: KitchenOrder): void {
    const n = NEXT[order.kitchenStatus];
    if (!n) return;
    this.inventory.put(`/kitchen/${order.id}`, { kitchenStatus: n.status }).subscribe({
      next: () => {
        this.notifications.success(`Pedido #${order.id}`, `Ahora: ${STATUS_LABELS[n.status]}.`);
        this.load(true);
      },
    });
  }

  minutesAgo(date: string): number {
    return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  }
}
