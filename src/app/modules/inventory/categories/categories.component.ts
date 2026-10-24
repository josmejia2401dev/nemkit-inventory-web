import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryCategory,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
import { ConfirmService } from "../../../core/services/confirm.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

@Component({
  selector: "app-categories",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./categories.component.html",
})
export class CategoriesComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);

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
      .list<InventoryCategory>("/categories", { page: this.page(), limit: this.pageSize })
      .subscribe({
        next: (response) => {
          const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          if (this.page() > totalPages) {
            this.page.set(totalPages);
            this.load();
            return;
          }
          this.categories.set(response.data ?? []);
          this.pageCount.set(totalPages);
          this.categoryCount.set(response.pagination?.total ?? response.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  goToPage(nextPage: number): void {
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

  async remove(category: InventoryCategory): Promise<void> {
    const id = category.id ?? category._id;
    if (!id) return;
    const ok = await this.confirm.ask({
      title: "Eliminar categoría",
      message: `¿Eliminar la categoría "${category.name}"?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      severity: "danger",
    });
    if (!ok) return;

    this.inventory.delete(`/categories/${id}`).subscribe({
      next: () => {
        this.notifications.success("Categoría eliminada");
        this.load();
      },
    });
  }
}
