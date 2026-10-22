import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import {
  InventoryContact,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";

type ContactKind = "suppliers" | "customers";

@Component({
  selector: "app-inventory-contacts",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./contacts.component.html",
})
export class ContactsComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);

  kind: ContactKind = "suppliers";
  contacts = signal<InventoryContact[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  contactCount = signal(0);
  saving = signal(false);
  dialogOpen = signal(false);
  editingId: number | null = null;
  search = "";
  form = this.emptyForm();

  get isSupplier(): boolean {
    return this.kind === "suppliers";
  }

  get title(): string {
    return this.isSupplier ? "Proveedores" : "Clientes";
  }

  get singular(): string {
    return this.isSupplier ? "proveedor" : "cliente";
  }

  ngOnInit(): void {
    this.kind = this.route.snapshot.data["kind"] === "customers" ? "customers" : "suppliers";
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.inventory.list<InventoryContact>(`/${this.kind}`, {
      page: this.page(),
      limit: 20,
      search: this.search.trim(),
    }).subscribe({
      next: (response) => {
        this.contacts.set(response.data ?? []);
        this.pageCount.set(response.pagination?.totalPages ?? 1);
        this.contactCount.set(response.pagination?.total ?? response.data.length);
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

  openEdit(contact: InventoryContact): void {
    this.editingId = contact.id ?? contact._id ?? null;
    this.form = {
      name: contact.name,
      document: contact.document ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      address: contact.address ?? "",
    };
    this.dialogOpen.set(true);
  }

  save(): void {
    if (this.form.name.trim().length < 2) {
      this.notifications.warn("Revisa el nombre", "Escribe al menos dos caracteres.");
      return;
    }
    const body: Record<string, string> = {
      name: this.form.name.trim(),
      document: this.form.document.trim(),
      phone: this.form.phone.trim(),
      email: this.form.email.trim(),
    };
    if (this.isSupplier) body["address"] = this.form.address.trim();
    this.saving.set(true);
    const request = this.editingId
      ? this.inventory.put<InventoryContact>(`/${this.kind}/${this.editingId}`, body)
      : this.inventory.post<InventoryContact>(`/${this.kind}`, body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.notifications.success(this.editingId ? "Registro actualizado" : "Registro creado");
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(contact: InventoryContact): void {
    const id = contact.id ?? contact._id;
    if (!id || !window.confirm(`¿Eliminar a ${contact.name}?`)) return;
    this.inventory.delete(`/${this.kind}/${id}`).subscribe({
      next: () => {
        this.notifications.success("Registro eliminado");
        this.load();
      },
    });
  }

  private emptyForm() {
    return { name: "", document: "", phone: "", email: "", address: "" };
  }
}
