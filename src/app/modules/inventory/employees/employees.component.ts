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
  imports: [CommonModule, FormsModule],
  templateUrl: "./employees.component.html",
})
export class EmployeesComponent implements OnInit {
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
  dialogOpen = signal(false);
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
        limit: 20,
        search: this.search.trim(),
        role: this.roleFilter,
      })
      .subscribe({
        next: (response) => {
          this.employees.set(response.data ?? []);
          this.pageCount.set(response.pagination?.totalPages ?? 1);
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

  changePage(direction: -1 | 1): void {
    const nextPage = this.page() + direction;
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

  async remove(employee: InventoryEmployee): Promise<void> {
    const id = employee.id ?? employee._id;
    if (!id) return;
    const ok = await this.confirm.ask({
      title: "Eliminar empleado",
      message: `¿Eliminar a ${employee.name}?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      severity: "danger",
    });
    if (!ok) return;
    this.inventory.delete(`/employees/${id}`).subscribe({
      next: () => {
        this.notifications.success("Empleado eliminado");
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
