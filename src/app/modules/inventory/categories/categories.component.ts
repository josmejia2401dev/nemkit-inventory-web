import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryCategory,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";

@Component({
  selector: "app-categories",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./categories.component.html",
})
export class CategoriesComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);

  categories = signal<InventoryCategory[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  categoryCount = signal(0);
  dialogOpen = signal(false);
  saving = signal(false);
  editingId: number | null = null;
  name = "";
  description = "";

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.inventory
      .list<InventoryCategory>("/categories", { page: this.page(), limit: 20 })
      .subscribe({
        next: (response) => {
          this.categories.set(response.data ?? []);
          this.pageCount.set(response.pagination?.totalPages ?? 1);
          this.categoryCount.set(response.pagination?.total ?? response.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  changePage(direction: -1 | 1): void {
    const nextPage = this.page() + direction;
    if (nextPage < 1 || nextPage > this.pageCount()) return;
    this.page.set(nextPage);
    this.load();
  }

  openCreate(): void {
    this.editingId = null;
    this.name = "";
    this.description = "";
    this.dialogOpen.set(true);
  }

  openEdit(category: InventoryCategory): void {
    this.editingId = category.id ?? category._id ?? null;
    this.name = category.name;
    this.description = category.description ?? "";
    this.dialogOpen.set(true);
  }

  save(): void {
    if (this.name.trim().length < 2) {
      this.notifications.warn(
        "Revisa el nombre",
        "Escribe al menos dos caracteres.",
      );
      return;
    }

    this.saving.set(true);
    const body = {
      name: this.name.trim(),
      description: this.description.trim(),
    };
    const request = this.editingId
      ? this.inventory.put<InventoryCategory>(
          `/categories/${this.editingId}`,
          body,
        )
      : this.inventory.post<InventoryCategory>("/categories", body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.notifications.success(
          this.editingId ? "Categoría actualizada" : "Categoría creada",
        );
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(category: InventoryCategory): void {
    const id = category.id ?? category._id;
    if (!id || !window.confirm(`¿Eliminar la categoría "${category.name}"?`))
      return;

    this.inventory.delete(`/categories/${id}`).subscribe({
      next: () => {
        this.notifications.success("Categoría eliminada");
        this.load();
      },
    });
  }
}
