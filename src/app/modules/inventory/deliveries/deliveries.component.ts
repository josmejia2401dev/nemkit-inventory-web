import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  DeliveryStatus,
  InventoryDelivery,
  InventoryEmployee,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
import { ConfirmService } from "../../../core/services/confirm.service";
import { AuthStore } from "../../../core/store/auth.store";
import { formatCurrency } from "../../../shared/utils/currency.util";

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Listo para recoger",
  picked_up: "Recogido",
  on_route: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/**
 * Siguiente estado en la FASE DE REPARTO (lo que puede hacer el domiciliario).
 * pending/preparing los dicta la cocina, por eso no tienen "siguiente" aquí: el
 * domiciliario espera a que la cocina marque "listo para recoger".
 */
const NEXT_STATUS: Record<DeliveryStatus, DeliveryStatus | null> = {
  // En tienda (sin cocina) el domiciliario recoge desde 'pending'. En
  // restaurante normalmente lo hace al llegar a 'ready', pero puede recoger
  // antes si quiere. En todos los casos el siguiente paso es "recogido".
  pending: "picked_up",
  preparing: "picked_up",
  ready: "picked_up",
  picked_up: "on_route",
  on_route: "delivered",
  delivered: null,
  cancelled: null,
};

/** Etiqueta del botón para avanzar al siguiente estado de reparto. */
const NEXT_ACTION_LABELS: Partial<Record<DeliveryStatus, string>> = {
  picked_up: "Marcar recogido",
  on_route: "Salir en camino",
  delivered: "Marcar entregado",
};

@Component({
  selector: "app-inventory-deliveries",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./deliveries.component.html",
})
export class DeliveriesComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private store = inject(AuthStore);

  /** El domiciliario gestiona sus entregas pero NO asigna domiciliarios. */
  isCourier = computed(() => {
    const roles: string[] = this.store.user()?.roles ?? [];
    const privileged = roles.includes("ADMIN") || roles.includes("SUPERADMIN");
    return !privileged && roles.includes("COURIER");
  });

  readonly statusFilters: Array<{ value: "" | DeliveryStatus; label: string }> = [
    { value: "", label: "Todos" },
    { value: "pending", label: "Pendientes" },
    { value: "preparing", label: "Preparando" },
    { value: "ready", label: "Listos" },
    { value: "picked_up", label: "Recogidos" },
    { value: "on_route", label: "En camino" },
    { value: "delivered", label: "Entregados" },
    { value: "cancelled", label: "Cancelados" },
  ];

  deliveries = signal<InventoryDelivery[]>([]);
  couriers = signal<InventoryEmployee[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  deliveryCount = signal(0);
  statusFilter: "" | DeliveryStatus = "";

  proofOpen = signal(false);
  proofDelivery = signal<InventoryDelivery | null>(null);
  proofObservation = "";
  proofPhotoUrl = "";

  ngOnInit(): void {
    this.load();
    // El domiciliario no asigna domiciliarios, así que no necesita la lista
    // (además el backend restringe /employees a administradores).
    if (!this.isCourier()) this.loadCouriers();
  }

  statusLabel(status: DeliveryStatus): string {
    return STATUS_LABELS[status];
  }

  nextStatusLabel(status: DeliveryStatus): string | null {
    const next = NEXT_STATUS[status];
    return next ? (NEXT_ACTION_LABELS[next] ?? STATUS_LABELS[next]) : null;
  }

  /** En restaurante, mostrar que la cocina está trabajando el pedido. */
  isInKitchenPhase(status: DeliveryStatus): boolean {
    const isRestaurant = this.store.company()?.businessType === "restaurant";
    return isRestaurant && (status === "pending" || status === "preparing");
  }

  money(value: number | undefined): string {
    return formatCurrency(value ?? 0);
  }

  load(): void {
    this.loading.set(true);
    this.inventory.list<InventoryDelivery>("/deliveries", {
      page: this.page(),
      limit: 20,
      status: this.statusFilter || undefined,
    }).subscribe({
      next: (response) => {
        this.deliveries.set(response.data ?? []);
        this.pageCount.set(response.pagination?.totalPages ?? 1);
        this.deliveryCount.set(response.pagination?.total ?? response.data.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(status: "" | DeliveryStatus): void {
    this.statusFilter = status;
    this.page.set(1);
    this.load();
  }

  changePage(direction: -1 | 1): void {
    const nextPage = this.page() + direction;
    if (nextPage < 1 || nextPage > this.pageCount()) return;
    this.page.set(nextPage);
    this.load();
  }

  loadCouriers(): void {
    this.inventory.get<InventoryEmployee[]>("/employee-options", { role: "courier" })
      .subscribe({ next: (response) => this.couriers.set(response.data ?? []) });
  }

  assignCourier(delivery: InventoryDelivery, courierId: string): void {
    if (!courierId) return;
    this.inventory.put<InventoryDelivery>(`/deliveries/${delivery.id}/courier`, {
      courierId: Number(courierId),
    }).subscribe({
      next: () => {
        this.notifications.success("Domiciliario asignado");
        this.load();
      },
    });
  }

  advance(delivery: InventoryDelivery): void {
    const next = NEXT_STATUS[delivery.status];
    if (!next) return;
    if ((next === "picked_up" || next === "on_route") && !delivery.courierId) {
      this.notifications.warn("Asigna un domiciliario", "Antes de recoger o despachar el pedido.");
      return;
    }
    this.changeStatus(delivery, next);
  }

  async cancel(delivery: InventoryDelivery): Promise<void> {
    const ok = await this.confirm.ask({
      title: "Cancelar domicilio",
      message: `¿Cancelar el domicilio #${delivery.id}?`,
      confirmLabel: "Cancelar domicilio",
      cancelLabel: "Volver",
      severity: "warn",
    });
    if (!ok) return;
    this.changeStatus(delivery, "cancelled");
  }

  private changeStatus(delivery: InventoryDelivery, status: DeliveryStatus): void {
    this.inventory.put<InventoryDelivery>(`/deliveries/${delivery.id}/status`, { status }).subscribe({
      next: () => {
        this.notifications.success("Estado actualizado", `Ahora: ${STATUS_LABELS[status]}.`);
        this.load();
      },
    });
  }

  async voidDelivery(delivery: InventoryDelivery): Promise<void> {
    const ok = await this.confirm.ask({
      title: "Anular entrega",
      message: `¿Anular la entrega #${delivery.id}? Se revertirá la venta y se repondrá el stock. Esta acción no se puede deshacer.`,
      confirmLabel: "Anular entrega",
      cancelLabel: "Volver",
      severity: "danger",
    });
    if (!ok) return;
    this.inventory.put<InventoryDelivery>(`/deliveries/${delivery.id}/void`, {}).subscribe({
      next: () => {
        this.notifications.success("Entrega anulada", "La venta fue revertida y el stock repuesto.");
        this.load();
      },
    });
  }

  openProof(delivery: InventoryDelivery): void {
    this.proofDelivery.set(delivery);
    this.proofObservation = delivery.proof?.observation ?? "";
    this.proofPhotoUrl = delivery.proof?.photo?.url ?? "";
    this.proofOpen.set(true);
  }

  saveProof(): void {
    const delivery = this.proofDelivery();
    if (!delivery) return;
    const proof: Record<string, unknown> = { observation: this.proofObservation.trim() };
    if (this.proofPhotoUrl.trim()) proof["photo"] = { url: this.proofPhotoUrl.trim() };
    this.inventory.put<InventoryDelivery>(`/deliveries/${delivery.id}/proof`, { proof }).subscribe({
      next: () => {
        this.proofOpen.set(false);
        this.notifications.success("Evidencia guardada");
        this.load();
      },
    });
  }
}
