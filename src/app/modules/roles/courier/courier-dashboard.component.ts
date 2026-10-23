import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  InventoryDelivery,
  InventoryService,
} from "../../../core/services/inventory.service";

@Component({
  selector: "app-courier-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">MIS ENTREGAS</p>
        <h1>Hola {{ name() }}</h1>
        <p class="heading-subtitle">Estos son los domicilios asignados a ti.</p>
      </div>
      <a routerLink="/courier/deliveries" class="button button-primary"><i class="pi pi-send"></i> Ver domicilios</a>
    </div>

    @if (loading()) {
      <div class="loading-panel"><i class="pi pi-spin pi-spinner"></i><span>Cargando tus entregas…</span></div>
    } @else {
      <div class="report-summary">
        <article><small>Pendientes</small><strong>{{ counts().pending }}</strong></article>
        <article><small>Preparando</small><strong>{{ counts().preparing }}</strong></article>
        <article><small>En ruta</small><strong>{{ counts().on_route }}</strong></article>
        <article><small>Entregados</small><strong>{{ counts().delivered }}</strong></article>
      </div>
    }
  `,
})
export class CourierDashboardComponent implements OnInit {
  private inventory = inject(InventoryService);

  loading = signal(true);
  name = signal("");
  counts = signal({ pending: 0, preparing: 0, on_route: 0, delivered: 0 });

  ngOnInit(): void {
    this.inventory.list<InventoryDelivery>("/deliveries", { limit: 100 }).subscribe({
      next: (response) => {
        const mine = response.data ?? [];
        const c = { pending: 0, preparing: 0, on_route: 0, delivered: 0 };
        for (const d of mine) {
          if (d.status in c) (c as Record<string, number>)[d.status]++;
        }
        this.counts.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
