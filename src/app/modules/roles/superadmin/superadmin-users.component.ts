import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PlatformService, PlatformUser } from "../../../core/services/platform.service";

@Component({
  selector: "app-superadmin-users",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PLATAFORMA</p>
        <h1>Usuarios del sistema</h1>
        <p class="heading-subtitle">Todos los usuarios de todas las empresas.</p>
      </div>
      <button class="button button-secondary" (click)="load()"><i class="pi pi-refresh"></i> Actualizar</button>
    </div>

    <section class="panel">
      <div class="filter-bar">
        <div class="filter-title"><span class="panel-icon"><i class="pi pi-users"></i></span><strong>Usuarios</strong><span class="filter-count">{{ total() }}</span></div>
        <div class="feedback-filters">
          <input [(ngModel)]="search" name="search" (keyup.enter)="reload()" placeholder="Buscar por nombre, correo o empresa" aria-label="Buscar usuarios" />
          <select [(ngModel)]="kind" name="kind" (ngModelChange)="reload()" aria-label="Filtrar por tipo">
            <option value="">Todos</option>
            <option value="owner">Titulares de empresa</option>
            <option value="employee">Empleados asociados</option>
            <option value="unassigned_employee">Empleados sin asociación</option>
            <option value="super_admin">Superadministradores</option>
          </select>
          <button class="button button-secondary button-small" (click)="reload()"><i class="pi pi-search"></i> Buscar</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-panel"><i class="pi pi-spin pi-spinner"></i><span>Cargando usuarios…</span></div>
      } @else if (users().length) {
        <div class="table-scroll"><table class="inventory-table">
          <thead><tr><th>NOMBRE</th><th>CORREO</th><th>ROLES</th><th>EMPRESA</th><th>TIPO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>@for (u of users(); track u.id) {
            <tr>
              <td data-label="Nombre"><strong>{{ u.fullName }}</strong></td>
              <td data-label="Correo">{{ u.email }}</td>
              <td data-label="Roles"><div class="role-chips">@for (r of u.roles; track r) { <span class="role-chip">{{ r }}</span> }</div></td>
              <td data-label="Empresa">{{ u.companyName || "—" }}</td>
              <td data-label="Tipo"><span class="feedback-tag feedback-tag--other">{{ u.accountLabel }}</span></td>
              <td data-label="Estado"><span class="feedback-status" [class.feedback-status--resolved]="u.recordStatus === 'active'" [class.feedback-status--open]="u.recordStatus !== 'active'">{{ u.recordStatus === "active" ? "Activo" : u.recordStatus }}</span></td>
              <td data-label="Acciones"><a class="icon-button" [routerLink]="['/superadmin/users', u.id]" title="Ver detalle"><i class="pi pi-eye"></i></a></td>
            </tr>
          }</tbody>
        </table></div>
        <div class="table-footer">
          <span>{{ total() }} usuarios · página {{ page() }} de {{ pageCount() }}</span>
          <span class="table-pagination-actions">
            <button class="button button-secondary button-small" [disabled]="page() <= 1" (click)="changePage(-1)">Anterior</button>
            <button class="button button-secondary button-small" [disabled]="page() >= pageCount()" (click)="changePage(1)">Siguiente</button>
          </span>
        </div>
      } @else {
        <div class="empty-state"><span class="empty-icon"><i class="pi pi-users"></i></span><strong>Sin usuarios</strong><p>No hay usuarios que coincidan con el filtro.</p></div>
      }
    </section>
  `,
})
export class SuperadminUsersComponent implements OnInit {
  private platform = inject(PlatformService);

  users = signal<PlatformUser[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  total = signal(0);
  search = "";
  kind = "";

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.listUsers({
      page: this.page(),
      limit: 20,
      search: this.search.trim() || undefined,
      kind: this.kind || undefined,
    }).subscribe({
      next: (response) => {
        this.users.set(response.data ?? []);
        this.total.set(response.pagination?.total ?? 0);
        this.pageCount.set(response.pagination?.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changePage(direction: -1 | 1): void {
    const next = this.page() + direction;
    if (next < 1 || next > this.pageCount()) return;
    this.page.set(next);
    this.load();
  }
}
