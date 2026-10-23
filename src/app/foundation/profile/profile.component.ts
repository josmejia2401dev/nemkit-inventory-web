import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { finalize, timeout } from "rxjs";
import { ApiService } from "../../core/services/api.service";
import { NotificationService } from "../../core/services/notification.service";
import { AuthStore } from "../../core/store/auth.store";

interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  companyName?: string;
  businessType?: "retail" | "restaurant";
  security: {
    loginAttempts: number;
    lastLockedAt: string | null;
    lockedUntil: string | null;
    lastLoginAt: string | null;
    mustChangePassword: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

type UserProfileResponse = Omit<UserProfile, "security"> & {
  security?: Partial<UserProfile["security"]> | null;
};

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./profile.component.html",
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);
  private authStore = inject(AuthStore);

  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  savingProfile = signal(false);
  passwordDialogVisible = signal(false);
  savingPassword = signal(false);

  editName = "";
  editEmail = "";
  currentPassword = "";
  newPassword = "";
  confirmPassword = "";

  // Configuración del negocio (solo admin)
  editCompanyName = "";
  editBusinessType: "retail" | "restaurant" = "retail";
  savingBusiness = signal(false);

  get isAdmin(): boolean {
    const roles: string[] = this.authStore.user()?.roles ?? [];
    return roles.includes("ADMIN") || roles.includes("SUPERADMIN");
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.api
      .get<UserProfileResponse>("/profile")
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
            security: {
              loginAttempts: 0,
              lastLockedAt: null,
              lockedUntil: null,
              lastLoginAt: null,
              mustChangePassword: false,
              ...response.data.security,
            },
          };

          this.profile.set(profile);
          this.editName = profile.fullName;
          this.editEmail = profile.email;
          this.editCompanyName = profile.companyName ?? "";
          this.editBusinessType = profile.businessType ?? "retail";
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
    this.api.put<UserProfile>("/profile", { fullName, email }).subscribe({
      next: (response) => {
        const updatedProfile = {
          ...this.profile()!,
          ...response.data,
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

  saveBusiness(): void {
    const companyName = this.editCompanyName.trim();
    this.savingBusiness.set(true);
    this.api.put<{ companyName: string; businessType: "retail" | "restaurant" }>(
      "/settings/business",
      { companyName, businessType: this.editBusinessType },
    ).subscribe({
      next: (response) => {
        this.savingBusiness.set(false);
        // Reflejar el nombre en la marca de inmediato.
        const company = this.authStore.company();
        this.authStore.setSession(
          this.authStore.user(),
          this.authStore.accessToken()!,
          this.authStore.refreshToken()!,
          { id: company?.id ?? 0, name: response.data.companyName, businessType: response.data.businessType },
        );
        this.notifications.success(
          "Negocio actualizado",
          "Cierra sesión y vuelve a entrar para aplicar el nuevo modo.",
        );
      },
      error: () => this.savingBusiness.set(false),
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
      .put("/profile/password", {
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
