import { CommonModule, DatePipe } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  PlatformEmployee,
  PlatformService,
} from "../platform.service";
import {
  DEFAULT_PAGE_SIZE,
  PaginationComponent,
} from "../../../shared/components/pagination/pagination.component";

@Component({
  selector: "app-superadmin-employees",
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, PaginationComponent],
  templateUrl: "./superadmin-employees.component.html",
})
export class SuperadminEmployeesComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private readonly platform = inject(PlatformService);

  readonly employees = signal<PlatformEmployee[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly pageCount = signal(1);
  readonly total = signal(0);

  search = "";
  role = "";
  status = "";
  recordStatus = "";

  readonly roleOptions = [
    { value: "admin", label: "Administrador" },
    { value: "cashier", label: "Cajero" },
    { value: "seller", label: "Vendedor" },
    { value: "courier", label: "Domiciliario" },
    { value: "warehouse", label: "Almacén" },
    { value: "waiter", label: "Mesero" },
    { value: "cook", label: "Cocina" },
  ];

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.listEmployees({
      page: this.page(),
      limit: this.pageSize,
      search: this.search.trim() || undefined,
      role: this.role || undefined,
      status: this.status || undefined,
      recordStatus: this.recordStatus || undefined,
    }).subscribe({
      next: (response) => {
        const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
        this.employees.set(response.data ?? []);
        this.total.set(response.pagination?.total ?? 0);
        this.pageCount.set(totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.employees.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
  }

  goToPage(next: number): void {
    if (next < 1 || next > this.pageCount()) return;
    this.page.set(next);
    this.load();
  }

  roleLabel(role: string): string {
    return this.roleOptions.find((option) => option.value === role)?.label ?? role;
  }

  statusLabel(employee: PlatformEmployee): string {
    if (employee.recordStatus === "deleted") return "Eliminado";
    return employee.status === "active" ? "Activo" : "Inactivo";
  }
}
