import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PlatformService, PlatformUser } from "../../../core/services/platform.service";

@Component({
  selector: "app-superadmin-user-detail",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PLATAFORMA · USUARIO</p>
        <h1>{{ user()?.fullName || "Usuario" }}</h1>
        <p class="heading-subtitle">Detalle de la cuenta del usuario.</p>
      </div>
      <a class="button button-secondary" routerLink="/superadmin/users"><i class="pi pi-arrow-left"></i> Volver</a>
    </div>

    @if (loading()) {
      <div class="loading-panel"><i class="pi pi-spin pi-spinner"></i><span>Cargando…</span></div>
    } @else if (user()) {
      @if (user(); as u) {
      <section class="panel detail-panel">
        <div class="detail-grid">
          <div><small>Nombre</small><strong>{{ u.fullName }}</strong></div>
          <div><small>Correo</small><strong>{{ u.email }}</strong></div>
          <div><small>Roles</small><div class="role-chips">@for (r of u.roles; track r) { <span class="role-chip">{{ r }}</span> }</div></div>
          <div><small>Tipo</small><strong>{{ u.isOwner ? "Dueño de cuenta" : "Empleado" }}</strong></div>
          <div><small>Empresa</small><strong>{{ u.companyName || "—" }}</strong></div>
          <div><small>Tipo de negocio</small><strong>{{ u.businessType === "restaurant" ? "Restaurante" : "Tienda" }}</strong></div>
          <div><small>Estado</small><strong>{{ u.recordStatus }}</strong></div>
          <div><small>Último acceso</small><strong>{{ u.security?.lastLoginAt ? (u.security?.lastLoginAt | date: "d MMM yyyy, HH:mm" : "" : "es-CO") : "Nunca" }}</strong></div>
          <div><small>Creado</small><strong>{{ u.createdAt | date: "d MMM yyyy" : "" : "es-CO" }}</strong></div>
          @if (!u.isOwner && u.tenantId) {
            <div><small>Empresa (tenant)</small><a [routerLink]="['/superadmin/companies', u.tenantId]">Ver empresa #{{ u.tenantId }}</a></div>
          }
        </div>
      </section>

      @if (u.isOwner && u.employees && u.employees.length) {
        <section class="panel">
          <div class="filter-bar"><div class="filter-title"><span class="panel-icon"><i class="pi pi-id-card"></i></span><strong>Empleados</strong><span class="filter-count">{{ u.employees.length }}</span></div></div>
          <div class="table-scroll"><table class="inventory-table">
            <thead><tr><th>NOMBRE</th><th>CORREO</th><th>ROLES</th><th>ESTADO</th><th></th></tr></thead>
            <tbody>@for (e of u.employees; track e.id) {
              <tr>
                <td data-label="Nombre">{{ e.fullName }}</td>
                <td data-label="Correo">{{ e.email }}</td>
                <td data-label="Roles"><div class="role-chips">@for (r of e.roles; track r) { <span class="role-chip">{{ r }}</span> }</div></td>
                <td data-label="Estado">{{ e.recordStatus }}</td>
                <td><a class="icon-button" [routerLink]="['/superadmin/users', e.id]"><i class="pi pi-eye"></i></a></td>
              </tr>
            }</tbody>
          </table></div>
        </section>
      }
      }
    } @else {
      <div class="empty-state"><span class="empty-icon"><i class="pi pi-user"></i></span><strong>Usuario no encontrado</strong></div>
    }
  `,
})
export class SuperadminUserDetailComponent implements OnInit {
  private platform = inject(PlatformService);
  private route = inject(ActivatedRoute);

  user = signal<PlatformUser | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.platform.getUser(id).subscribe({
      next: (response) => {
        this.user.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
