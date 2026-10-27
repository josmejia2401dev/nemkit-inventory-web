import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { finalize, timeout } from "rxjs";
import { ApiService } from "../../core/services/api.service";
import { NotificationService } from "../../core/services/notification.service";
import { AuthStore } from "../../core/store/auth.store";
import { BusinessProfileChanges, BusinessProfileSectionComponent } from "./components/business-profile-section/business-profile-section.component";

interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  security: {
    loginAttempts: number;
    lastLockedAt: string | null;
    lockedUntil: string | null;
    lastLoginAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  businessType?: "retail" | "restaurant";
}

type UserProfileResponse = Omit<UserProfile, "security"> & {
  security?: Partial<UserProfile["security"]> | null;
};

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule, FormsModule, BusinessProfileSectionComponent],
  templateUrl: "./profile.component.html",
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);
  private authStore = inject(AuthStore);

  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  savingProfile = signal(false);
  savingBusinessProfile = signal(false);
  passwordDialogVisible = signal(false);
  savingPassword = signal(false);

  /** Base del endpoint de perfil según el tipo de sesión (empresa o empleado). */
  private get base(): string {
    return this.authStore.sessionType() === "employee" ? "/employees/profile" : "/users/profile";
  }

  editName = "";
  editEmail = "";
  currentPassword = "";
  newPassword = "";
  confirmPassword = "";

  get showBusinessSettings(): boolean {
    const profile = this.profile();
    return Boolean(profile?.companyName && profile.roles.includes("ADMIN"));
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.api
      .get<UserProfileResponse & { name?: string }>(this.base)
      .pipe(
        timeout(15000),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.profile.set(null);
            return;
          }

          const profile: UserProfile = {
            ...response.data,
            // El perfil de empleado usa 'name'; el de empresa 'fullName'.
            fullName: response.data.fullName ?? response.data.name ?? "",
            security: {
              loginAttempts: 0,
              lastLockedAt: null,
              lockedUntil: null,
              lastLoginAt: null,
              ...response.data.security,
            },
          };

          this.profile.set(profile);
          this.editName = profile.fullName;
          this.editEmail = profile.email;
        },
        error: (error) => {
          this.profile.set(null);
          this.notifications.error(
            "No se pudo cargar el perfil",
            error?.error?.message ?? error?.message ?? "Inténtalo nuevamente.",
          );
        },
      });
  }

  saveProfile(): void {
    const fullName = this.editName.trim();
    const email = this.editEmail.trim().toLowerCase();

    if (fullName.length < 2 || !this.isValidEmail(email)) {
      this.notifications.warn(
        "Revisa tus datos",
        "Escribe tu nombre y un correo electrónico válido.",
      );
      return;
    }

    this.savingProfile.set(true);
    const body = this.authStore.sessionType() === "employee"
      ? { name: fullName, email }
      : { fullName, email };
    this.api.put<UserProfile & { name?: string }>(this.base, body).subscribe({
      next: (response) => {
        const updatedProfile = {
          ...this.profile()!,
          ...response.data,
          fullName: response.data.fullName ?? response.data.name ?? this.profile()!.fullName,
        };

        this.profile.set(updatedProfile);
        this.authStore.updateUser({
          ...this.authStore.user(),
          fullName: updatedProfile.fullName,
          email: updatedProfile.email,
        });
        this.editName = updatedProfile.fullName;
        this.editEmail = updatedProfile.email;
        this.savingProfile.set(false);
        this.notifications.success("Perfil actualizado");
      },
      error: () => this.savingProfile.set(false),
    });
  }

  saveBusinessProfile(changes: BusinessProfileChanges): void {
    if (changes.companyName.length < 2) {
      this.notifications.warn("Revisa el nombre", "Escribe al menos dos caracteres para el negocio.");
      return;
    }

    this.savingBusinessProfile.set(true);
    this.api.put<Pick<UserProfile, "companyName" | "businessType">>("/users/profile", changes).subscribe({
      next: (response) => {
        const currentProfile = this.profile();
        if (currentProfile) this.profile.set({ ...currentProfile, ...response.data });

        const currentCompany = this.authStore.company();
        this.authStore.updateCompany({
          id: currentCompany?.id ?? currentProfile?.id ?? 0,
          name: changes.companyName,
          businessType: changes.businessType,
        });

        this.savingBusinessProfile.set(false);
        this.notifications.success(
          "Negocio actualizado",
          "Cierra sesión y vuelve a entrar para aplicar el nuevo modo de operación.",
        );
      },
      error: () => this.savingBusinessProfile.set(false),
    });
  }

  openPasswordDialog(): void {
    this.currentPassword = "";
    this.newPassword = "";
    this.confirmPassword = "";
    this.passwordDialogVisible.set(true);
  }

  changePassword(): void {
    if (!this.currentPassword || !this.newPassword) {
      this.notifications.warn(
        "Completa los campos",
        "Todos los campos son obligatorios.",
      );
      return;
    }

    if (this.newPassword.length < 6) {
      this.notifications.warn(
        "Contraseña muy corta",
        "Usa al menos seis caracteres.",
      );
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.notifications.warn(
        "Las contraseñas no coinciden",
        "Confirma la contraseña nueva correctamente.",
      );
      return;
    }

    this.savingPassword.set(true);
    this.api
      .put(`${this.base}/password`, {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordDialogVisible.set(false);
          this.notifications.success("Contraseña actualizada");
        },
        error: () => this.savingPassword.set(false),
      });
  }

  closePasswordDialog(): void {
    this.passwordDialogVisible.set(false);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
