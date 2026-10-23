import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PlatformService, PlatformCompanyDetail } from "../../../core/services/platform.service";

@Component({
  selector: "app-superadmin-company-detail",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PLATAFORMA · EMPRESA</p>
        <h1>{{ company()?.companyName || "Empresa" }}</h1>
        <p class="heading-subtitle">Cuenta, dueño y equipo de la empresa.</p>
      </div>
      <a class="button button-secondary" routerLink="/superadmin/companies"><i class="pi pi-arrow-left"></i> Volver</a>
    </div>

    @if (loading()) {
      <div class="loading-panel"><i class="pi pi-spin pi-spinner"></i><span>Cargando…</span></div>
    } @else if (company()) {
      @if (company(); as c) {
      <section class="panel detail-panel">
        <div class="detail-grid">
          <div><small>Empresa</small><strong>{{ c.companyName }}</strong></div>
          <div><small>Tipo de negocio</small><strong>{{ c.businessType === "restaurant" ? "Restaurante" : "Tienda" }}</strong></div>
          <div><small>Dueño</small><a [routerLink]="['/superadmin/users', c.owner.id]">{{ c.owner.fullName }}</a></div>
          <div><small>Correo del dueño</small><strong>{{ c.owner.email }}</strong></div>
          <div><small>Miembros</small><strong>{{ c.memberCount }}</strong></div>
          <div><small>Estado</small><strong>{{ c.owner.recordStatus }}</strong></div>
          <div><small>Creada</small><strong>{{ c.owner.createdAt | date: "d MMM yyyy" : "" : "es-CO" }}</strong></div>
        </div>
      </section>

      <section class="panel">
        <div class="filter-bar"><div class="filter-title"><span class="panel-icon"><i class="pi pi-id-card"></i></span><strong>Empleados</strong><span class="filter-count">{{ c.employees.length }}</span></div></div>
        @if (c.employees.length) {
          <div class="table-scroll"><table class="inventory-table">
            <thead><tr><th>NOMBRE</th><th>CORREO</th><th>ROLES</th><th>ESTADO</th><th></th></tr></thead>
            <tbody>@for (e of c.employees; track e.id) {
              <tr>
                <td data-label="Nombre">{{ e.fullName }}</td>
                <td data-label="Correo">{{ e.email }}</td>
                <td data-label="Roles"><div class="role-chips">@for (r of e.roles; track r) { <span class="role-chip">{{ r }}</span> }</div></td>
                <td data-label="Estado">{{ e.recordStatus }}</td>
                <td><a class="icon-button" [routerLink]="['/superadmin/users', e.id]"><i class="pi pi-eye"></i></a></td>
              </tr>
            }</tbody>
          </table></div>
        } @else {
          <div class="empty-state"><span class="empty-icon"><i class="pi pi-id-card"></i></span><strong>Sin empleados</strong><p>Esta empresa aún no tiene empleados con acceso.</p></div>
        }
      </section>
      }
    } @else {
      <div class="empty-state"><span class="empty-icon"><i class="pi pi-building"></i></span><strong>Empresa no encontrada</strong></div>
    }
  `,
})
export class SuperadminCompanyDetailComponent implements OnInit {
  private platform = inject(PlatformService);
  private route = inject(ActivatedRoute);

  company = signal<PlatformCompanyDetail | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.platform.getCompany(id).subscribe({
      next: (response) => {
        this.company.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
