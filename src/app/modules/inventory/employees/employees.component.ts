import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  DocumentType,
  EmployeeRole,
  InventoryEmployee,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
import { ConfirmService } from "../../../core/services/confirm.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

interface EmployeeForm {
  name: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  email: string;
  password: string;
  role: EmployeeRole | "";
  hireDate: string;
  status: "active" | "inactive";
}

@Component({
  selector: "app-inventory-employees",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./employees.component.html",
})
export class EmployeesComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);

  readonly roleOptions: Array<{ value: EmployeeRole; label: string }> = [
    { value: "admin", label: "Administrador" },
    { value: "cashier", label: "Cajero" },
    { value: "seller", label: "Vendedor" },
    { value: "courier", label: "Domiciliario" },
    { value: "warehouse", label: "Bodeguero" },
    { value: "waiter", label: "Mesero" },
    { value: "cook", label: "Cocinero" },
  ];

  readonly documentTypeOptions: Array<{ value: DocumentType; label: string }> = [
    { value: "CC", label: "Cédula de ciudadanía" },
    { value: "CE", label: "Cédula de extranjería" },
    { value: "NIT", label: "NIT" },
    { value: "PAS", label: "Pasaporte" },
    { value: "TI", label: "Tarjeta de identidad" },
  ];

  employees = signal<InventoryEmployee[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  employeeCount = signal(0);
  saving = signal(false);
  associationSaving = signal(false);
  dialogOpen = signal(false);
  associationOpen = signal(false);
  associationEmail = "";
  associationRole: EmployeeRole | "" = "";
  editingId: number | null = null;
  search = "";
  roleFilter = "";
  form: EmployeeForm = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  roleLabel(role?: EmployeeRole): string {
    return this.roleOptions.find((option) => option.value === role)?.label ?? "—";
  }

  documentTypeLabel(type?: DocumentType): string {
    return type ?? "—";
  }

  load(): void {
    this.loading.set(true);
    this.inventory
      .list<InventoryEmployee>("/employees", {
        page: this.page(),
        limit: this.pageSize,
        search: this.search.trim(),
        role: this.roleFilter,
      })
      .subscribe({
        next: (response) => {
        const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
          this.employees.set(response.data ?? []);
        this.pageCount.set(totalPages);
          this.employeeCount.set(response.pagination?.total ?? response.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  applySearch(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pageCount()) return;
    this.page.set(nextPage);
    this.load();
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.dialogOpen.set(true);
  }

  openEdit(employee: InventoryEmployee): void {
    this.editingId = employee.id ?? employee._id ?? null;
    this.form = {
      name: employee.name,
      documentType: employee.documentType ?? "CC",
      documentNumber: employee.documentNumber ?? "",
      phone: employee.phone ?? "",
      email: employee.email ?? "",
      password: "",
      role: employee.role,
      hireDate: employee.hireDate ? employee.hireDate.slice(0, 10) : "",
      status: employee.status ?? "active",
    };
    this.dialogOpen.set(true);
  }

  save(): void {
    if (this.form.name.trim().length < 2) {
      this.notifications.warn("Revisa el nombre", "Escribe al menos dos caracteres.");
      return;
    }
    if (!this.form.role) {
      this.notifications.warn("Selecciona un cargo", "El empleado necesita un rol asignado.");
      return;
    }

    const isCreate = !this.editingId;
    if (isCreate) {
      const email = this.form.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.notifications.warn("Revisa el correo", "Escribe un correo válido para el acceso.");
        return;
      }
      if (this.form.password.length < 6) {
        this.notifications.warn("Revisa la contraseña", "Debe tener al menos 6 caracteres.");
        return;
      }
    }

    const body: Record<string, unknown> = {
      name: this.form.name.trim(),
      documentType: this.form.documentType,
      documentNumber: this.form.documentNumber.trim(),
      phone: this.form.phone.trim(),
      role: this.form.role,
      status: this.form.status,
    };
    if (this.form.hireDate) body["hireDate"] = this.form.hireDate;
    if (isCreate) {
      body["email"] = this.form.email.trim();
      body["password"] = this.form.password;
    }

    this.saving.set(true);
    const request = isCreate
      ? this.inventory.post<InventoryEmployee>("/employees", body)
      : this.inventory.put<InventoryEmployee>(`/employees/${this.editingId}`, body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.notifications.success(this.editingId ? "Empleado actualizado" : "Empleado creado");
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  associateExisting(): void {
    const email = this.associationEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !this.associationRole) {
      this.notifications.warn("Revisa los datos", "Indica el correo de la cuenta y el cargo del empleado.");
      return;
    }
    this.associationSaving.set(true);
    this.inventory.post<InventoryEmployee>("/employees/associate", {
      email,
      role: this.associationRole,
    }).subscribe({
      next: () => {
        this.associationSaving.set(false);
        this.associationOpen.set(false);
        this.associationEmail = "";
        this.associationRole = "";
        this.notifications.success("Cuenta asociada", "El usuario recuperó acceso a esta empresa.");
        this.load();
      },
      error: () => this.associationSaving.set(false),
    });
  }

  async remove(employee: InventoryEmployee): Promise<void> {
    const id = employee.id ?? employee._id;
    if (!id) return;
    const ok = await this.confirm.ask({
      title: "Desasociar empleado",
      message: `La cuenta de ${employee.name} quedará inactiva y perderá acceso a esta empresa. Podrá volver a ingresar si otra empresa o esta misma la asocia nuevamente.`,
      confirmLabel: "Desasociar",
      cancelLabel: "Cancelar",
      severity: "danger",
    });
    if (!ok) return;
    this.inventory.delete(`/employees/${id}`).subscribe({
      next: () => {
        this.notifications.success("Empleado desasociado", "La cuenta quedó inactiva y se puede asociar nuevamente.");
        this.load();
      },
    });
  }

  private emptyForm(): EmployeeForm {
    return {
      name: "",
      documentType: "CC",
      documentNumber: "",
      phone: "",
      email: "",
      password: "",
      role: "",
      hireDate: "",
      status: "active",
    };
  }
}
