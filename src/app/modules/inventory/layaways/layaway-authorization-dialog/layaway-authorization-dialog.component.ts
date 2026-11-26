import { ChangeDetectionStrategy, Component, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LayawaysApi } from "../layaways.api";
import { NotificationService } from "../../../../core/services/notification.service";
import { formatCurrency } from "../../../../shared/utils/currency.util";

@Component({
  selector: "app-layaway-authorization-dialog",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./layaway-authorization-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayawayAuthorizationDialogComponent {
  private readonly api = inject(LayawaysApi);
  private readonly notifications = inject(NotificationService);

  readonly customerId = input.required<number>();
  readonly customerName = input("");
  readonly total = input(0);
  readonly reason = input("");

  readonly authorized = output<string>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  form = { adminEmail: "", adminPassword: "", reason: "" };

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  submit(): void {
    if (!this.form.adminEmail.trim() || !this.form.adminPassword) {
      this.notifications.warn("Faltan credenciales", "Ingresa el correo y la contraseña del administrador.");
      return;
    }
    this.saving.set(true);
    this.api.authorize({
      adminEmail: this.form.adminEmail.trim(),
      adminPassword: this.form.adminPassword,
      customerId: this.customerId(),
      total: this.total(),
      reason: this.form.reason.trim(),
    }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notifications.success("Autorización aprobada", "Ya puedes guardar el plan con entrega inmediata.");
        this.authorized.emit(response.data.token);
      },
      error: () => this.saving.set(false),
    });
  }
}
