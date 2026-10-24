import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PlatformService, PlatformCompany } from "../../../core/services/platform.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

@Component({
  selector: "app-superadmin-companies",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PLATAFORMA</p>
        <h1>Empresas</h1>
        <p class="heading-subtitle">Cuentas registradas en la plataforma.</p>
      </div>
      <button class="button button-secondary" (click)="load()"><i class="pi pi-refresh"></i> Actualizar</button>
    </div>

    <section class="panel">
      <div class="filter-bar">
        <div class="filter-title"><span class="panel-icon"><i class="pi pi-building"></i></span><strong>Empresas</strong><span class="filter-count">{{ total() }}</span></div>
        <div class="feedback-filters">
          <input [(ngModel)]="search" name="search" (keyup.enter)="reload()" placeholder="Buscar por nombre, dueño o correo" aria-label="Buscar empresas" />
          <button class="button button-secondary button-small" (click)="reload()"><i class="pi pi-search"></i> Buscar</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-panel"><i class="pi pi-spin pi-spinner"></i><span>Cargando empresas…</span></div>
      } @else if (companies().length) {
        <div class="table-scroll"><table class="inventory-table">
          <thead><tr><th>EMPRESA</th><th>DUEÑO</th><th>CORREO</th><th>TIPO</th><th>MIEMBROS</th><th>ACCIONES</th></tr></thead>
          <tbody>@for (c of companies(); track c.id) {
            <tr>
              <td data-label="Empresa"><strong>{{ c.companyName }}</strong></td>
              <td data-label="Dueño">{{ c.ownerName }}</td>
              <td data-label="Correo">{{ c.ownerEmail }}</td>
              <td data-label="Tipo"><span class="feedback-tag feedback-tag--other">{{ c.businessType === "restaurant" ? "Restaurante" : "Tienda" }}</span></td>
              <td data-label="Miembros">{{ c.memberCount }}</td>
              <td data-label="Acciones"><a class="icon-button" [routerLink]="['/superadmin/companies', c.id]" title="Ver detalle"><i class="pi pi-eye"></i></a></td>
            </tr>
          }</tbody>
        </table></div>
        <app-pagination [page]="page()" [pageSize]="pageSize" [totalItems]="total()" (pageChange)="goToPage($event)" />
      } @else {
        <div class="empty-state"><span class="empty-icon"><i class="pi pi-building"></i></span><strong>Sin empresas</strong><p>No hay empresas que coincidan con el filtro.</p></div>
      }
    </section>
  `,
})
export class SuperadminCompaniesComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private platform = inject(PlatformService);

  companies = signal<PlatformCompany[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  total = signal(0);
  search = "";

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.listCompanies({
      page: this.page(),
      limit: this.pageSize,
      search: this.search.trim() || undefined,
    }).subscribe({
      next: (response) => {
        const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
        this.companies.set(response.data ?? []);
        this.total.set(response.pagination?.total ?? 0);
        this.pageCount.set(totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(next: number): void {
    if (next < 1 || next > this.pageCount()) return;
    this.page.set(next);
    this.load();
  }
}
