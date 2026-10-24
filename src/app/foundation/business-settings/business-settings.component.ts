import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../core/services/api.service";
import { NotificationService } from "../../core/services/notification.service";
import { AuthStore, CompanyInfo } from "../../core/store/auth.store";

interface BusinessProfile {
  companyName: string;
  businessType: "retail" | "restaurant";
}

@Component({
  selector: "app-business-settings",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./business-settings.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authStore = inject(AuthStore);

  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly saving = signal(false);

  companyName = "";
  businessType: BusinessProfile["businessType"] = "retail";

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.api.get<BusinessProfile>("/profile").subscribe({
      next: ({ data }) => {
        this.companyName = data.companyName ?? "";
        this.businessType = data.businessType ?? "retail";
        this.loading.set(false);
      },
      error: () => {
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  save(): void {
    const companyName = this.companyName.trim();
    if (companyName.length < 2) {
      this.notifications.warn(
        "Revisa el nombre",
        "Escribe al menos dos caracteres para el negocio.",
      );
      return;
    }

    this.saving.set(true);
    this.api
      .put<BusinessProfile>("/settings/business", {
        companyName,
        businessType: this.businessType,
      })
      .subscribe({
        next: ({ data }) => {
          const currentCompany = this.authStore.company();
          const updatedCompany: CompanyInfo = {
            id: currentCompany?.id ?? 0,
            name: data.companyName,
            businessType: data.businessType,
          };
          this.authStore.updateCompany(updatedCompany);
          this.companyName = data.companyName;
          this.businessType = data.businessType;
          this.saving.set(false);
          this.notifications.success(
            "Negocio actualizado",
            "Cierra sesión y vuelve a entrar para aplicar el nuevo modo.",
          );
        },
        error: () => this.saving.set(false),
      });
  }
}
