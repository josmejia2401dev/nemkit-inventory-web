import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  DeliveryStatus,
  InventoryDelivery,
  InventoryEmployee,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
import { formatCurrency } from "../../../shared/utils/currency.util";

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  on_route: "En ruta",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const NEXT_STATUS: Record<DeliveryStatus, DeliveryStatus | null> = {
  pending: "preparing",
  preparing: "on_route",
  on_route: "delivered",
  delivered: null,
  cancelled: null,
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

  readonly statusFilters: Array<{ value: "" | DeliveryStatus; label: string }> = [
    { value: "", label: "Todos" },
    { value: "pending", label: "Pendientes" },
    { value: "preparing", label: "Preparando" },
    { value: "on_route", label: "En ruta" },
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
    this.loadCouriers();
  }

  statusLabel(status: DeliveryStatus): string {
    return STATUS_LABELS[status];
  }

  nextStatusLabel(status: DeliveryStatus): string | null {
    const next = NEXT_STATUS[status];
    return next ? STATUS_LABELS[next] : null;
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
    this.inventory.list<InventoryEmployee>("/employees", { limit: 100, status: "active", role: "courier" })
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
    if (next === "on_route" && !delivery.courierId) {
      this.notifications.warn("Asigna un domiciliario", "Antes de poner el pedido en ruta.");
      return;
    }
    this.changeStatus(delivery, next);
  }

  cancel(delivery: InventoryDelivery): void {
    if (!window.confirm(`¿Cancelar el domicilio #${delivery.id}?`)) return;
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

  voidDelivery(delivery: InventoryDelivery): void {
    const reason = window.prompt(`Anular la entrega #${delivery.id}. Esto revierte la venta y repone el stock.\nMotivo (opcional):`);
    if (reason === null) return;
    this.inventory.put<InventoryDelivery>(`/deliveries/${delivery.id}/void`, { reason }).subscribe({
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
