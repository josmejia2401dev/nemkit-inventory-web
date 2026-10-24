import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ConfirmService } from "../../../core/services/confirm.service";
import {
  PlatformService,
  PlatformCompanyDetail,
  PlatformUser,
} from "../../../core/services/platform.service";
import { NotificationService } from "../../../core/services/notification.service";

@Component({
  selector: "app-superadmin-company-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PLATAFORMA · EMPRESA</p>
        <h1>{{ company()?.companyName || "Empresa" }}</h1>
        <p class="heading-subtitle">Cuenta, dueño y equipo de la empresa.</p>
      </div>
      <div class="heading-actions">
        <button class="button button-primary" [disabled]="loading() || company()?.owner?.recordStatus !== 'active'" (click)="associationOpen.set(true)"><i class="pi pi-user-plus"></i> Asociar usuario</button>
        <a class="button button-secondary" routerLink="/superadmin/companies"><i class="pi pi-arrow-left"></i> Volver</a>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-panel"><i class="pi pi-spin pi-spinner"></i><span>Cargando…</span></div>
    } @else {
      @if (company(); as c) {
      <section class="panel detail-panel">
        <div class="detail-grid">
          <div><small>Empresa</small><strong>{{ c.companyName }}</strong></div>
          <div><small>Tipo de negocio</small><strong>{{ c.businessType === "restaurant" ? "Restaurante" : "Tienda" }}</strong></div>
          <div><small>Dueño</small><a [routerLink]="['/superadmin/users', c.owner.id]">{{ c.owner.fullName }}</a></div>
          <div><small>Correo del dueño</small><strong>{{ c.owner.email }}</strong></div>
          <div><small>Miembros</small><strong>{{ c.memberCount }}</strong></div>
          <div><small>Estado</small><strong>{{ c.owner.recordStatus === "active" ? "Activa" : "Inactiva" }}</strong></div>
          <div><small>Creada</small><strong>{{ c.owner.createdAt | date: "d MMM yyyy" : "" : "es-CO" }}</strong></div>
        </div>
      </section>

      <section class="panel">
        <div class="filter-bar">
          <div class="filter-title"><span class="panel-icon"><i class="pi pi-id-card"></i></span><strong>Empleados asociados</strong><span class="filter-count">{{ c.employees.length }}</span></div>
        </div>
        @if (c.employees.length) {
          <div class="table-scroll"><table class="inventory-table">
            <thead><tr><th>NOMBRE</th><th>CORREO</th><th>ROLES</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
            <tbody>@for (employee of c.employees; track employee.id) {
              <tr>
                <td data-label="Nombre">{{ employee.fullName }}</td>
                <td data-label="Correo">{{ employee.email }}</td>
                <td data-label="Roles"><div class="role-chips">@for (role of employee.roles; track role) { <span class="role-chip">{{ role }}</span> }</div></td>
                <td data-label="Estado">{{ employee.recordStatus === "active" ? "Activo" : "Inactivo" }}</td>
                <td data-label="Acciones"><div class="row-actions">
                  <a class="icon-button" [routerLink]="['/superadmin/users', employee.id]" title="Ver usuario"><i class="pi pi-eye"></i></a>
                  @if (employee.isEmployee) {
                    <button class="icon-button icon-button--danger" title="Desasociar usuario" (click)="disassociate(employee)"><i class="pi pi-user-minus"></i></button>
                  }
                </div></td>
              </tr>
            }</tbody>
          </table></div>
        } @else {
          <div class="empty-state"><span class="empty-icon"><i class="pi pi-id-card"></i></span><strong>Sin empleados</strong><p>Esta empresa aún no tiene empleados con acceso.</p></div>
        }
      </section>
      } @else {
        <div class="empty-state"><span class="empty-icon"><i class="pi pi-building"></i></span><strong>Empresa no encontrada</strong></div>
      }
    }

    @if (associationOpen()) {
      <div class="dialog-backdrop" (click)="associationOpen.set(false)">
        <section class="form-dialog form-dialog--narrow" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="dialog-heading"><div><p class="eyebrow">EQUIPO DE EMPRESA</p><h2>Asociar cuenta existente</h2></div><button class="icon-button" (click)="associationOpen.set(false)"><i class="pi pi-times"></i></button></div>
          <form class="dialog-form" (ngSubmit)="associate()">
            <p class="form-hint"><i class="pi pi-info-circle"></i> La cuenta debe estar desasociada. Mantendrá su correo y contraseña; al asociarla recuperará acceso con el cargo asignado.</p>
            <label class="form-field"><span>Correo de la cuenta <b>*</b></span><input [(ngModel)]="associationEmail" name="associationEmail" type="email" required maxlength="254" autocomplete="email" /></label>
            <label class="form-field"><span>Cargo <b>*</b></span><select [(ngModel)]="associationRole" name="associationRole" required><option value="" disabled>Selecciona un cargo</option>@for (option of roleOptions; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label>
            <div class="dialog-actions"><button type="button" class="button button-secondary" (click)="associationOpen.set(false)">Cancelar</button><button class="button button-primary" [disabled]="associationSaving()"><i [class]="associationSaving() ? 'pi pi-spin pi-spinner' : 'pi pi-link'"></i>{{ associationSaving() ? "Asociando…" : "Asociar cuenta" }}</button></div>
          </form>
        </section>
      </div>
    }
  `,
})
export class SuperadminCompanyDetailComponent implements OnInit {
  private platform = inject(PlatformService);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);

  company = signal<PlatformCompanyDetail | null>(null);
  loading = signal(true);
  associationOpen = signal(false);
  associationSaving = signal(false);
  associationEmail = "";
  associationRole = "";

  readonly roleOptions = [
    { value: "admin", label: "Administrador" },
    { value: "cashier", label: "Cajero" },
    { value: "seller", label: "Vendedor" },
    { value: "courier", label: "Domiciliario" },
    { value: "warehouse", label: "Bodeguero" },
    { value: "waiter", label: "Mesero" },
    { value: "cook", label: "Cocinero" },
  ];

  private get companyId(): number {
    return Number(this.route.snapshot.paramMap.get("id"));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.getCompany(this.companyId).subscribe({
      next: (response) => {
        this.company.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  associate(): void {
    const email = this.associationEmail.trim().toLowerCase();
    if (!email || !this.associationRole) return;
    this.associationSaving.set(true);
    this.platform.associateEmployee(this.companyId, email, this.associationRole).subscribe({
      next: () => {
        this.associationSaving.set(false);
        this.associationOpen.set(false);
        this.associationEmail = "";
        this.associationRole = "";
        this.notifications.success("Usuario asociado", "La cuenta quedó activa en esta empresa.");
        this.load();
      },
      error: () => this.associationSaving.set(false),
    });
  }

  async disassociate(user: PlatformUser): Promise<void> {
    const ok = await this.confirm.ask({
      title: "Desasociar usuario",
      message: `La cuenta de ${user.fullName} quedará inactiva y perderá acceso a esta empresa. Podrá volver a ingresar cuando otra empresa la asocie.`,
      confirmLabel: "Desasociar",
      cancelLabel: "Cancelar",
      severity: "danger",
    });
    if (!ok) return;
    this.platform.disassociateEmployee(this.companyId, user.id).subscribe({
      next: () => {
        this.notifications.success("Usuario desasociado", "La cuenta quedó inactiva y disponible para una nueva asociación.");
        this.load();
      },
    });
  }
}
