import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { MessageModule } from "primeng/message";
import { ApiService } from "../../../core/services/api.service";
import { AuthStore } from "../../../core/store/auth.store";

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
  private store = inject(AuthStore);
  private router = inject(Router);

  fullName = "";
  email = "";
  password = "";
  error = signal<string | null>(null);
  loading = signal(false);

  onSubmit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.api
      .post<any>("/auth/register", {
        fullName: this.fullName,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          this.store.setSession(
            response.data.user,
            response.data.accessToken,
            response.data.refreshToken,
          );
          this.loading.set(false);
          this.router.navigate(["/dashboard"]);
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
