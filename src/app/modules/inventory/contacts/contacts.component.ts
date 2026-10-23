import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import {
  CustomerProfile,
  InventoryContact,
  LoyaltyTier,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
import { formatCurrency } from "../../../shared/utils/currency.util";

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

  // Búsqueda rápida y perfil 360° (solo clientes)
  lookupTerm = "";
  lookupLoading = signal(false);
  profile = signal<CustomerProfile | null>(null);
  profileOpen = signal(false);

  readonly tierLabels: Record<LoyaltyTier, string> = {
    bronze: "Bronce",
    silver: "Plata",
    gold: "Oro",
    platinum: "Platino",
  };

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
      address: this.form.address.trim(),
    };
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

  lookup(): void {
    const term = this.lookupTerm.trim();
    if (!term) {
      this.notifications.warn("Escribe un celular o documento", "Para identificar al cliente.");
      return;
    }
    this.lookupLoading.set(true);
    this.inventory.get<InventoryContact | null>("/customers/lookup", { term }).subscribe({
      next: (response) => {
        this.lookupLoading.set(false);
        if (!response.data) {
          this.notifications.info("Sin resultados", "No encontramos un cliente con ese dato.");
          return;
        }
        this.openProfile(response.data);
      },
      error: () => this.lookupLoading.set(false),
    });
  }

  openProfile(customer: InventoryContact): void {
    const id = customer.id ?? customer._id;
    if (!id) return;
    this.inventory.get<CustomerProfile>(`/customers/${id}/profile`).subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.profileOpen.set(true);
      },
    });
  }

  closeProfile(): void {
    this.profileOpen.set(false);
    this.profile.set(null);
  }

  tierLabel(tier?: LoyaltyTier): string {
    return tier ? this.tierLabels[tier] : "Bronce";
  }

  tierStars(tier?: LoyaltyTier): number {
    return { bronze: 1, silver: 2, gold: 3, platinum: 4 }[tier ?? "bronze"];
  }

  money(value?: number): string {
    return formatCurrency(value ?? 0);
  }

  private emptyForm() {
    return { name: "", document: "", phone: "", email: "", address: "" };
  }
}
