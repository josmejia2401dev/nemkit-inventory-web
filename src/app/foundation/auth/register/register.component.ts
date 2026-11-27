import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { MessageModule } from "primeng/message";
import { ApiService } from "../../../core/services/api.service";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    RouterLink,
  ],
  templateUrl: "./register.component.html",
})
export class RegisterComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  fullName = "";
  companyName = "";
  email = "";
  password = "";
  error = signal<string | null>(null);
  loading = signal(false);

  onSubmit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.api
      .post<any>("/foundation/auth/users/register", {
        fullName: this.fullName,
        companyName: this.companyName,
        email: this.email,
        password: this.password,
        businessType: "retail",
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.router.navigate(["/verify-email"], {
            queryParams: {
              email: this.email,
              sent: response.data?.verificationEmailSent === false ? "0" : "1",
            },
          });
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(
            error.error?.message ??
              "No pudimos crear tu cuenta. Inténtalo de nuevo.",
          );
        },
      });
  }
}
