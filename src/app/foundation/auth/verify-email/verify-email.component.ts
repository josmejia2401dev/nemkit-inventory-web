import { Component, OnDestroy, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { ApiService } from "../../../core/services/api.service";
import { AuthStore } from "../../../core/store/auth.store";
import { homeForRoles } from "../../../core/guards/role-home";

@Component({
  selector: "app-verify-email",
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule, RouterLink],
  templateUrl: "./verify-email.component.html",
})
export class VerifyEmailComponent implements OnDestroy {
  private api = inject(ApiService);
  private store = inject(AuthStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = this.route.snapshot.queryParamMap.get("email") ?? "";
  code = "";
  error = signal<string | null>(null);
  notice = signal<string | null>(
    this.route.snapshot.queryParamMap.get("sent") === "0"
      ? "La cuenta se creó, pero el correo no pudo enviarse. Reenvía el código."
      : null,
  );
  loading = signal(false);
  resendLoading = signal(false);
  cooldown = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  submit(): void {
    this.error.set(null);
    this.notice.set(null);
    if (!this.email) {
      this.error.set("No encontramos el correo de la cuenta. Vuelve a registrarte.");
      return;
    }
    if (!/^\d{4,8}$/.test(this.code.trim())) {
      this.error.set("Escribe el código de 6 dígitos que enviamos a tu correo.");
      return;
    }

    this.loading.set(true);
    this.api
      .post<any>("/foundation/auth/users/verify-email", {
        email: this.email,
        code: this.code.trim(),
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          const data = response.data ?? {};
          if (data.accessToken && data.refreshToken) {
            this.store.setSession(
              data.user,
              data.accessToken,
              data.refreshToken,
              data.company,
              "company",
            );
            this.router.navigateByUrl(homeForRoles(data.user?.roles));
            return;
          }
          this.router.navigateByUrl("/login");
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(this.messageFor(err));
        },
      });
  }

  resend(): void {
    if (this.cooldown() > 0 || this.resendLoading()) return;
    this.error.set(null);
    this.notice.set(null);
    if (!this.email) {
      this.error.set("No encontramos el correo de la cuenta.");
      return;
    }

    this.resendLoading.set(true);
    this.api
      .post<any>("/foundation/auth/users/resend-verification", { email: this.email })
      .subscribe({
        next: () => {
          this.resendLoading.set(false);
          this.notice.set(
            "Código reenviado. Revisa tu correo y la carpeta de spam.",
          );
          this.startCooldown(60);
        },
        error: (err) => {
          this.resendLoading.set(false);
          if (err?.error?.code === "OTP_RESEND_TOO_SOON") {
            this.error.set("Espera un momento antes de pedir otro código.");
            return;
          }
          this.error.set(this.messageFor(err));
        },
      });
  }

  private startCooldown(seconds: number): void {
    this.cooldown.set(seconds);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.cooldown() <= 1) {
        this.cooldown.set(0);
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        return;
      }
      this.cooldown.update((value) => value - 1);
    }, 1000);
  }

  private messageFor(error: any): string {
    const code = error?.error?.code;
    if (code === "OTP_EXPIRED") return "El código venció. Pide uno nuevo.";
    if (code === "OTP_INVALID") return "El código no es correcto. Revísalo e intenta de nuevo.";
    if (code === "OTP_ATTEMPTS_EXCEEDED") return "Demasiados intentos. Pide un código nuevo.";
    if (code === "EMAIL_ALREADY_VERIFIED") return "Esta cuenta ya está verificada. Inicia sesión.";
    if (code === "EMAIL_NOT_CONFIGURED") return "El envío de correos no está configurado. Intenta más tarde.";
    if (code === "EMAIL_SEND_FAILED") return "No pudimos enviar el correo. Intenta reenviar el código.";
    return error?.error?.message ?? "No pudimos verificar el código. Intenta de nuevo.";
  }
}
