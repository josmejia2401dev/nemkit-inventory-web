import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LayawaysApi } from "../layaways.api";
import { NotificationService } from "../../../../core/services/notification.service";
import { LayawaySettings } from "../../../../core/models/inventory";

@Component({
  selector: "app-layaway-settings-dialog",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./layaway-settings-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayawaySettingsDialogComponent implements OnInit {
  private readonly api = inject(LayawaysApi);
  private readonly notifications = inject(NotificationService);

  readonly settings = input.required<LayawaySettings>();
  readonly saved = output<LayawaySettings>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  form: LayawaySettings = {
    minInitialPercent: 0,
    maxTermMonths: 60,
    defaultFrequency: "monthly",
    cancellationPolicy: "manual",
    retentionPercent: 0,
    allowImmediateHandover: true,
  };

  ngOnInit(): void {
    this.form = { ...this.settings() };
  }

  save(): void {
    this.saving.set(true);
    this.api.updateSettings({
      minInitialPercent: Number(this.form.minInitialPercent) || 0,
      maxTermMonths: Number(this.form.maxTermMonths) || 60,
      defaultFrequency: this.form.defaultFrequency,
      cancellationPolicy: this.form.cancellationPolicy,
      retentionPercent: Number(this.form.retentionPercent) || 0,
      allowImmediateHandover: this.form.allowImmediateHandover,
    }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notifications.success("Configuración guardada", "Aplica a los próximos planes separe.");
        this.saved.emit(response.data);
      },
      error: () => this.saving.set(false),
    });
  }
}
