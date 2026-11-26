import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { LayawaysApi } from "../layaways.api";
import { LayawayCreateDialogComponent } from "../layaway-create-dialog/layaway-create-dialog.component";
import { LayawayDetailDialogComponent } from "../layaway-detail-dialog/layaway-detail-dialog.component";
import { LayawayPaymentDialogComponent } from "../layaway-payment-dialog/layaway-payment-dialog.component";
import { LayawayCancelDialogComponent } from "../layaway-cancel-dialog/layaway-cancel-dialog.component";
import { LayawaySettingsDialogComponent } from "../layaway-settings-dialog/layaway-settings-dialog.component";
import { PaginationComponent } from "../../../../shared/components/pagination/pagination.component";
import { NotificationService } from "../../../../core/services/notification.service";
import { ConfirmService } from "../../../../core/services/confirm.service";
import { AuthStore } from "../../../../core/store/auth.store";
import {
  Layaway,
  LayawaySettings,
  LayawaySummary,
} from "../../../../core/models/inventory";
import { formatCurrency } from "../../../../shared/utils/currency.util";

const PAGE_SIZE = 10;

@Component({
  selector: "app-layaways-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LayawayCreateDialogComponent,
    LayawayDetailDialogComponent,
    LayawayPaymentDialogComponent,
    LayawayCancelDialogComponent,
    LayawaySettingsDialogComponent,
  ],
  templateUrl: "./layaways-page.component.html",
  styleUrls: ["./layaways-page.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayawaysPageComponent implements OnInit {
  private readonly api = inject(LayawaysApi);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(AuthStore);

  readonly pageSize = PAGE_SIZE;
  readonly layaways = signal<Layaway[]>([]);
  readonly summary = signal<LayawaySummary>({
    activeCount: 0,
    activeBalance: 0,
    overdueCount: 0,
    overdueBalance: 0,
    readyCount: 0,
  });
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly selected = signal<Layaway | null>(null);
  readonly settings = signal<LayawaySettings | null>(null);

  readonly createOpen = signal(false);
  readonly detailOpen = signal(false);
  readonly paymentOpen = signal(false);
  readonly cancelOpen = signal(false);
  readonly settingsOpen = signal(false);

  readonly isAdmin = computed(() => (this.store.user()?.roles ?? []).includes("ADMIN"));

  filters = { search: "", status: "", overdue: false };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list({
      page: this.page(),
      limit: PAGE_SIZE,
      search: this.filters.search,
      status: this.filters.status,
      overdue: this.filters.overdue,
    }).subscribe({
      next: (response) => {
        this.layaways.set(response.data ?? []);
        this.totalItems.set(response.pagination?.total ?? response.metadata?.pagination?.total ?? 0);
        this.totalPages.set(response.pagination?.totalPages ?? response.metadata?.pagination?.totalPages ?? 1);
        const summary = response.metadata?.summary;
        if (summary) this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.filters = { search: "", status: "", overdue: false };
    this.page.set(1);
    this.load();
  }

  changePage(page: number): void {
    this.page.set(page);
    this.load();
  }

  openCreate(): void {
    this.createOpen.set(true);
  }

  openDetail(plan: Layaway): void {
    this.api.get(plan.id).subscribe({
      next: (response) => {
        this.selected.set(response.data);
        this.detailOpen.set(true);
      },
    });
  }

  openSettings(): void {
    this.api.settings().subscribe({
      next: (response) => {
        this.settings.set(response.data);
        this.settingsOpen.set(true);
      },
    });
  }

  onCreated(): void {
    this.createOpen.set(false);
    this.load();
  }

  onPay(plan: Layaway): void {
    this.detailOpen.set(false);
    this.selected.set(plan);
    this.paymentOpen.set(true);
  }

  onPaymentSaved(plan: Layaway): void {
    this.paymentOpen.set(false);
    this.load();
    this.selected.set(plan);
    this.detailOpen.set(true);
  }

  onCancel(plan: Layaway): void {
    this.detailOpen.set(false);
    this.selected.set(plan);
    if (!this.settings()) {
      this.api.settings().subscribe({
        next: (response) => {
          this.settings.set(response.data);
          this.cancelOpen.set(true);
        },
      });
      return;
    }
    this.cancelOpen.set(true);
  }

  onCancelSaved(plan: Layaway): void {
    this.cancelOpen.set(false);
    this.load();
    this.selected.set(plan);
    this.detailOpen.set(true);
  }

  async onDeliver(plan: Layaway): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: "Entregar plan separe",
      message: `¿Entregar a ${plan.customerSnapshot.name}? Se generará la venta y se cerrará el plan.`,
      confirmLabel: "Entregar",
      cancelLabel: "Cancelar",
      severity: "info",
    });
    if (!confirmed) return;
    this.api.deliver(plan.id).subscribe({
      next: (response) => {
        this.notifications.success("Plan entregado", "La venta quedó registrada.");
        this.selected.set(response.data);
        this.detailOpen.set(true);
        this.load();
      },
    });
  }

  onSettingsSaved(settings: LayawaySettings): void {
    this.settings.set(settings);
    this.settingsOpen.set(false);
  }

  statusLabel(status: Layaway["status"]): string {
    return {
      active: "Activo",
      ready: "Listo",
      completed: "Completado",
      cancelled: "Cancelado",
    }[status] ?? status;
  }

  handoverLabel(plan: Layaway): string {
    if (plan.handoverStatus === "delivered") {
      if (plan.handoverMode === "immediate") return "Con cuota inicial";
      if (plan.handoverMode === "delivery") return "Domicilio";
      return "Tienda";
    }
    if (plan.handoverMode === "delivery") return "Domicilio pendiente";
    return "Recoge en tienda";
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }
}
