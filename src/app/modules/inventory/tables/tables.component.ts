import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InventoryTable } from "../../../core/services/inventory.service";
import { TablesApi } from "./tables.api";
import { NotificationService } from "../../../core/services/notification.service";
import { ConfirmService } from "../../../core/services/confirm.service";

@Component({
  selector: "app-inventory-tables",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./tables.component.html",
})
export class TablesComponent implements OnInit {
  private tablesApi = inject(TablesApi);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);

  tables = signal<InventoryTable[]>([]);
  loading = signal(true);
  saving = signal(false);
  dialogOpen = signal(false);
  editingId: number | null = null;
  form = { name: "", description: "" };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    // Trae las mesas con su estado de ocupación.
    this.tablesApi.occupancy().subscribe({
      next: (response) => {
        this.tables.set(response.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = { name: "", description: "" };
    this.dialogOpen.set(true);
  }

  openEdit(table: InventoryTable): void {
    this.editingId = table.id ?? table._id ?? null;
    this.form = { name: table.name, description: table.description ?? "" };
    this.dialogOpen.set(true);
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.notifications.warn("Falta el nombre", "Escribe un nombre para la mesa.");
      return;
    }
    const body = { name: this.form.name.trim(), description: this.form.description.trim() };
    this.saving.set(true);
    const request = this.editingId
      ? this.tablesApi.update(this.editingId, body)
      : this.tablesApi.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.notifications.success(this.editingId ? "Mesa actualizada" : "Mesa creada");
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  async remove(table: InventoryTable): Promise<void> {
    const id = table.id ?? table._id;
    if (!id) return;
    const ok = await this.confirm.ask({
      title: "Eliminar mesa",
      message: `¿Eliminar "${table.name}"?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      severity: "danger",
    });
    if (!ok) return;
    this.tablesApi.remove(id).subscribe({
      next: () => {
        this.notifications.success("Mesa eliminada");
        this.load();
      },
    });
  }
}
