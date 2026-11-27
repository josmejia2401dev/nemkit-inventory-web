import { CommonModule } from "@angular/common";
import { Component, inject, Input, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  DeliveryStatus,
  InventoryDelivery,
  InventoryEmployee,
} from "../../../core/services/inventory.service";
import { DeliveriesApi, DeliveryProof } from "./deliveries.api";
import { EmployeesApi } from "../employees/employees.api";
import { NotificationService } from "@nemkit/foundation-web";
import { ConfirmService } from "@nemkit/foundation-web";
import { formatCurrency } from "@nemkit/foundation-web";
import { ORDER_STATUS_LABELS } from "../order-status.constants";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "@nemkit/foundation-web";

const STATUS_LABELS: Record<DeliveryStatus, string> = ORDER_STATUS_LABELS;
const DELIVERY_FLOW: DeliveryStatus[] = ["pending", "on_route", "delivered"];

/** Siguiente paso de reparto una vez el domiciliario tiene el pedido. */
const REPARTO_NEXT: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pending: "on_route",
  on_route: "delivered",
};

/** Etiqueta del botón para avanzar al siguiente estado de reparto. */
const NEXT_ACTION_LABELS: Partial<Record<DeliveryStatus, string>> = {
  on_route: "Salir en camino",
  delivered: "Marcar entregado",
};

export type DeliveryBoardMode = "operations" | "courier";

@Component({
  selector: "app-inventory-deliveries",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: "./delivery-board.component.html",
  styleUrls: ["./delivery-board.component.css"],
})
export class DeliveryBoardComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private deliveriesApi = inject(DeliveriesApi);
  private employeesApi = inject(EmployeesApi);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);
  @Input({ required: true }) mode!: DeliveryBoardMode;

  readonly statusFilters: Array<{ value: "" | DeliveryStatus; label: string }> = [
    { value: "", label: "Todos" },
    { value: "pending", label: "Pendientes" },
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
    if (this.mode === "operations") this.loadCouriers();
  }

  statusLabel(status: DeliveryStatus): string {
    return STATUS_LABELS[status];
  }

  progressIndex(delivery: InventoryDelivery): number {
    return DELIVERY_FLOW.indexOf(delivery.status);
  }

  private nextStatusFor(delivery: InventoryDelivery): DeliveryStatus | null {
    return REPARTO_NEXT[delivery.status] ?? null;
  }

  nextStatusLabel(delivery: InventoryDelivery): string | null {
    const next = this.nextStatusFor(delivery);
    return next ? (NEXT_ACTION_LABELS[next] ?? STATUS_LABELS[next]) : null;
  }

  money(value: number | undefined): string {
    return formatCurrency(value ?? 0);
  }

  load(): void {
    this.loading.set(true);
    this.deliveriesApi.list({
      page: this.page(),
      limit: this.pageSize,
      status: this.statusFilter || undefined,
    }).subscribe({
      next: (response) => {
        const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
        this.deliveries.set(response.data ?? []);
        this.pageCount.set(totalPages);
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

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pageCount()) return;
    this.page.set(nextPage);
    this.load();
  }

  loadCouriers(): void {
    this.employeesApi.couriers()
      .subscribe({ next: (response) => this.couriers.set(response.data ?? []) });
  }

  assignCourier(delivery: InventoryDelivery, courierId: string): void {
    if (!courierId) return;
    this.deliveriesApi.assignCourier(delivery.id, Number(courierId)).subscribe({
      next: () => {
        this.notifications.success("Domiciliario asignado");
        this.load();
      },
    });
  }

  advance(delivery: InventoryDelivery): void {
    const next = this.nextStatusFor(delivery);
    if (!next) return;
    if (next === "on_route" && !delivery.courierId) {
      this.notifications.warn("Asigna un domiciliario", "El pedido necesita un domiciliario antes de salir a ruta.");
      return;
    }
    this.changeStatus(delivery, next);
  }

  async cancel(delivery: InventoryDelivery): Promise<void> {
    const ok = await this.confirm.ask({
      title: "Cancelar domicilio",
      message: `¿Cancelar el pedido #${delivery.id} en todo el sistema? La venta se anulará y el inventario se repondrá.`,
      confirmLabel: "Cancelar pedido",
      cancelLabel: "Volver",
      severity: "warn",
    });
    if (!ok) return;
    this.changeStatus(delivery, "cancelled");
  }

  private changeStatus(delivery: InventoryDelivery, status: DeliveryStatus): void {
    this.deliveriesApi.changeStatus(delivery.id, status).subscribe({
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
    this.deliveriesApi.void(delivery.id).subscribe({
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
    const proof: DeliveryProof = { observation: this.proofObservation.trim() };
    if (this.proofPhotoUrl.trim()) proof.photo = { url: this.proofPhotoUrl.trim() };
    this.deliveriesApi.saveProof(delivery.id, proof).subscribe({
      next: () => {
        this.proofOpen.set(false);
        this.notifications.success("Evidencia guardada");
        this.load();
      },
    });
  }
}
