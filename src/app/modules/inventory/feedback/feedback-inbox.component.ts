import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InventoryService } from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";

type FeedbackType = "bug" | "suggestion" | "other";
type FeedbackStatus = "open" | "reviewed" | "resolved";

interface FeedbackItem {
  id: number;
  _id?: number;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  userSnapshot?: { fullName?: string; email?: string; companyName?: string };
  createdAt: string;
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Error",
  suggestion: "Sugerencia",
  other: "Otro",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Abierto",
  reviewed: "Revisado",
  resolved: "Resuelto",
};

/** Bandeja global de reportes de usuarios. Solo el super admin accede aquí. */
@Component({
  selector: "app-feedback-inbox",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./feedback-inbox.component.html",
})
export class FeedbackInboxComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);

  readonly typeLabels = TYPE_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly statuses: FeedbackStatus[] = ["open", "reviewed", "resolved"];

  items = signal<FeedbackItem[]>([]);
  loading = signal(true);
  errorMessage = signal("");
  statusFilter = "";
  typeFilter = "";
  search = "";
  selected = signal<FeedbackItem | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set("");
    this.inventory.list<FeedbackItem>("/feedback", {
      status: this.statusFilter || undefined,
      type: this.typeFilter || undefined,
      search: this.search.trim() || undefined,
      limit: 100,
    }).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || "No se pudieron cargar los reportes.");
      },
    });
  }

  open(item: FeedbackItem): void {
    this.selected.set(item);
  }

  close(): void {
    this.selected.set(null);
  }

  changeStatus(item: FeedbackItem, status: FeedbackStatus): void {
    if (item.status === status) return;
    this.inventory.put<FeedbackItem>(`/feedback/${item.id || item._id}/status`, { status }).subscribe({
      next: () => {
        this.notifications.success("Estado actualizado", `Ahora: ${STATUS_LABELS[status]}.`);
        this.items.update((list) =>
          list.map((candidate) => (candidate.id === item.id ? { ...candidate, status } : candidate)),
        );
        this.selected.update((current) => (current && current.id === item.id ? { ...current, status } : current));
      },
      error: (error) => this.notifications.error(
        "No se pudo actualizar",
        error?.error?.message || "Intenta actualizar el estado nuevamente.",
      ),
    });
  }

  typeIcon(type: FeedbackType): string {
    return type === "bug" ? "pi pi-exclamation-triangle" : type === "suggestion" ? "pi pi-lightbulb" : "pi pi-comment";
  }
}
