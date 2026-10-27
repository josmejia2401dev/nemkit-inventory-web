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
  selector: "app-employee-login",
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    RouterLink,
  ],
  templateUrl: "./employee-login.component.html",
})
export class EmployeeLoginComponent {
  private api = inject(ApiService);
  private store = inject(AuthStore);
  private router = inject(Router);

  email = "";
  password = "";
  error = signal<string | null>(null);
  loading = signal(false);

  onSubmit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.api
      .post<any>("/auth/employees/login", { email: this.email, password: this.password })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.store.setSession(
            res.data.user,
            res.data.accessToken,
            res.data.refreshToken,
            res.data.company,
            "employee",
          );
          this.router.navigateByUrl(homeForRoles(res.data.user?.roles));
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err.error?.message ?? "No pudimos iniciar sesión. Revisa tus datos.",
          );
        },
      });
  }
}
