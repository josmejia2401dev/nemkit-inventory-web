import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../core/services/api.service";
import { NotificationService } from "../../core/services/notification.service";

type FeedbackType = "bug" | "suggestion" | "other";

/**
 * Formulario transversal para reportar bugs, hallazgos o sugerencias.
 * Disponible para cualquier usuario autenticado desde su espacio de trabajo.
 */
@Component({
  selector: "app-feedback",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./feedback.component.html",
})
export class FeedbackComponent {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  readonly types: Array<{ value: FeedbackType; label: string; icon: string }> = [
    { value: "bug", label: "Error / Bug", icon: "pi pi-exclamation-triangle" },
    { value: "suggestion", label: "Sugerencia", icon: "pi pi-lightbulb" },
    { value: "other", label: "Otro", icon: "pi pi-comment" },
  ];

  type: FeedbackType = "bug";
  title = "";
  description = "";
  saving = signal(false);
  sent = signal(false);

  submit(): void {
    const title = this.title.trim();
    const description = this.description.trim();
    if (title.length < 3) {
      this.notifications.warn("Falta el título", "Escribe un título breve (mínimo 3 caracteres).");
      return;
    }
    if (description.length < 3) {
      this.notifications.warn("Falta la descripción", "Cuéntanos qué pasó o qué sugieres.");
      return;
    }

    this.saving.set(true);
    this.api.post("/feedback", { type: this.type, title, description }).subscribe({
      next: () => {
        this.saving.set(false);
        this.sent.set(true);
        this.title = "";
        this.description = "";
        this.type = "bug";
        this.notifications.success("Reporte enviado", "Gracias por ayudarnos a mejorar.");
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.message || "No se pudo enviar el reporte. Intenta de nuevo.";
        this.notifications.error("No se pudo enviar", detail);
      },
    });
  }

  reset(): void {
    this.sent.set(false);
  }
}
