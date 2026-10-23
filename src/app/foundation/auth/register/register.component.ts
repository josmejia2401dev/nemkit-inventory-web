import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { MessageModule } from "primeng/message";
import { ApiService } from "../../../core/services/api.service";
import { AuthStore } from "../../../core/store/auth.store";
import { homeForRoles } from "../../../core/guards/role-home";

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
  companyName = "";
  businessType: "retail" | "restaurant" = "retail";
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
        companyName: this.companyName,
        businessType: this.businessType,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          this.store.setSession(
            response.data.user,
            response.data.accessToken,
            response.data.refreshToken,
            response.data.company,
          );
          this.loading.set(false);
          this.router.navigateByUrl(homeForRoles(response.data.user?.roles));
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
