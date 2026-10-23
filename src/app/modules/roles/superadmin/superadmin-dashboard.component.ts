import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PlatformService, PlatformOverview } from "../../../core/services/platform.service";

@Component({
  selector: "app-superadmin-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PLATAFORMA</p>
        <h1>Resumen</h1>
        <p class="heading-subtitle">Vista general de la plataforma: cuentas, usuarios y reportes.</p>
      </div>
      <button class="button button-secondary" (click)="load()"><i class="pi pi-refresh"></i> Actualizar</button>
    </div>

    @if (loading()) {
      <div class="loading-panel"><i class="pi pi-spin pi-spinner"></i><span>Cargando…</span></div>
    } @else if (data()) {
      @if (data(); as d) {
      <div class="platform-cards">
        <a routerLink="/superadmin/companies" class="platform-card">
          <span class="platform-card-icon"><i class="pi pi-building"></i></span>
          <strong>{{ d.companies }}</strong>
          <small>Empresas</small>
        </a>
        <a routerLink="/superadmin/users" class="platform-card">
          <span class="platform-card-icon"><i class="pi pi-users"></i></span>
          <strong>{{ d.users }}</strong>
          <small>Usuarios</small>
        </a>
        <a routerLink="/superadmin/feedback-inbox" class="platform-card">
          <span class="platform-card-icon"><i class="pi pi-inbox"></i></span>
          <strong>{{ d.feedback.open }}</strong>
          <small>Reportes abiertos</small>
        </a>
        <a routerLink="/superadmin/feedback-inbox" class="platform-card">
          <span class="platform-card-icon"><i class="pi pi-flag"></i></span>
          <strong>{{ d.feedback.total }}</strong>
          <small>Reportes totales</small>
        </a>
      </div>
      }
    } @else {
      <div class="empty-state"><span class="empty-icon"><i class="pi pi-exclamation-circle"></i></span><strong>Sin datos</strong><p>No se pudo cargar el resumen.</p></div>
    }
  `,
})
export class SuperadminDashboardComponent implements OnInit {
  private platform = inject(PlatformService);

  data = signal<PlatformOverview | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.overview().subscribe({
      next: (response) => {
        this.data.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
