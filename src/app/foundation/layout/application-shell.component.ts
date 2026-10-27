import { CommonModule } from "@angular/common";
import { Component, HostListener, inject, Input, signal } from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { AuthStore } from "../../core/store/auth.store";
import { BackendStatusTagComponent } from "../../shared/components/backend-status-tag/backend-status-tag.component";

export interface AppNavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: "app-application-shell",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BackendStatusTagComponent,
  ],
  templateUrl: "./application-shell.component.html",
})
export class ApplicationShellComponent {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  @Input({ required: true }) navItems: AppNavItem[] = [];
  @Input() mobilePaths: string[] = [];
  @Input() showAlerts = false;
  @Input() alertCount = 0;
  @Input() dashboardPath = "/dashboard";
  @Input() alertsPath = "/alerts";
  @Input() profilePath = "/profile";
  @Input() reportPath = "";
  @Input() workspaceLabel = "PLATAFORMA";

  sidebarOpen = signal(false);
  user = this.store.user;
  company = this.store.company;
  today = new Date();


  get mobileNavItems(): AppNavItem[] {
    const paths = this.mobilePaths.length
      ? this.mobilePaths
      : this.navItems.map((item) => item.path);
    return this.navItems.filter((item) => paths.includes(item.path)).slice(0, 4);
  }

  get currentPage(): string {
    const segments = this.router.url.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    if (last === "profile") return "Mi perfil";
    if (last === "feedback") return "Reportar un problema";
    if (last === "feedback-inbox") return "Reportes de usuarios";
    return this.navItems.find((item) => item.path.endsWith(last))?.label ?? "Resumen";
  }

  get currentRoleLabel(): string {
    const role = this.router.url.split("/").filter(Boolean)[0]?.toUpperCase();
    const labels: Record<string, string> = {
      SUPERADMIN: "Superadministrador",
      ADMIN: "Administrador",
      CASHIER: "Cajero",
      SELLER: "Vendedor",
      WAREHOUSE: "Bodeguero",
      COURIER: "Domiciliario",
      WAITER: "Mesero",
      COOK: "Cocinero",
    };
    return labels[role ?? ""] ?? "Usuario";
  }

  get effectiveReportPath(): string {
    if (this.reportPath) return this.reportPath;
    const rolePath = this.dashboardPath.split("/").filter(Boolean)[0];
    return rolePath ? `/${rolePath}/feedback` : "/feedback";
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((isOpen) => !isOpen);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  @HostListener("document:keydown.escape")
  closeSidebarWithEscape(): void {
    if (this.sidebarOpen()) this.closeSidebar();
  }

  logout(): void {
    const loginPath = this.store.loginPath();
    this.store.clear();
    this.router.navigateByUrl(loginPath);
  }
}
