import { ChangeDetectionStrategy, Component, inject, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NotificationService } from "../../../../core/services/notification.service";

/** Datos mínimos del cliente que la pantalla envía a `POST /customers`. */
export interface CustomerDraft {
  name: string;
  document: string;
  phone: string;
  email: string;
}

@Component({
  selector: "app-customer-create-form",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./customer-create-form.component.html",
  styleUrl: "./customer-create-form.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCreateFormComponent {
  private readonly notifications = inject(NotificationService);

  readonly saving = input(false);
  readonly submitted = output<CustomerDraft>();

  form = this.emptyForm();

  submit(): void {
    if (this.form.name.trim().length < 2) {
      this.notifications.warn(
        "Falta el nombre",
        "Escribe al menos dos caracteres para el cliente.",
      );
      return;
    }

    this.submitted.emit({
      name: this.form.name.trim(),
      document: this.form.document.trim(),
      phone: this.form.phone.trim(),
      email: this.form.email.trim(),
    });
  }

  private emptyForm(): CustomerDraft {
    return { name: "", document: "", phone: "", email: "" };
  }
}
