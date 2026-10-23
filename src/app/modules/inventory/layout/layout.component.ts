import { Component, DestroyRef, inject, Input, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd,
} from "@angular/router";
import { filter } from "rxjs";
import { AuthStore } from "../../../core/store/auth.store";
import { BackendStatusTagComponent } from "../../../shared/components/backend-status-tag/backend-status-tag.component";
import { InventoryService, InventoryStockAlerts } from "../../../core/services/inventory.service";

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

/**
 * Shell de la aplicación (sidebar + topbar + outlet). Es agnóstico al rol: cada
 * espacio de rol le pasa su propio menú (`navItems`), las rutas destacadas del
 * tab-bar móvil (`mobilePaths`) y si debe mostrar el contador de alertas.
 */
@Component({
  selector: "app-layout",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BackendStatusTagComponent,
  ],
  templateUrl: "./layout.component.html",
})
export class LayoutComponent implements OnInit {
  private store = inject(AuthStore);
  private router = inject(Router);
  private inventory = inject(InventoryService);
  private destroyRef = inject(DestroyRef);

  /** Menú del rol. Rutas absolutas (p. ej. "/cashier/sales"). */
  @Input({ required: true }) navItems: NavItem[] = [];
  /** Rutas destacadas en el tab-bar móvil. */
  @Input() mobilePaths: string[] = [];
  /** Muestra el contador de alertas de stock (bodeguero/admin). */
  @Input() showAlerts = false;
  /** Ruta del dashboard del rol (para la marca). */
  @Input() dashboardPath = "/dashboard";
  /** Ruta de alertas del rol (si aplica). */
  @Input() alertsPath = "/alerts";
  /** Ruta del perfil del rol. */
  @Input() profilePath = "/profile";
  /** Ruta del formulario para reportar un problema (transversal). */
  @Input() reportPath = "/feedback";

  sidebarOpen = signal(false);
  alertCount = signal(0);
  user = this.store.user;
  company = this.store.company;
  today = new Date();

  ngOnInit(): void {
    if (this.showAlerts) {
      this.refreshAlertCount();
      this.inventory.changes
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.refreshAlertCount());
      this.router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => this.refreshAlertCount());
    }
  }

  get mobileNavItems(): NavItem[] {
    const paths = this.mobilePaths.length ? this.mobilePaths : this.navItems.map((item) => item.path);
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

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.store.clear();
    this.router.navigate(["/login"]);
  }

  private refreshAlertCount(): void {
    this.inventory.get<InventoryStockAlerts>("/dashboard/alerts").subscribe({
      next: (response) => this.alertCount.set(response.data.outOfStock + response.data.lowStock),
      error: () => this.alertCount.set(0),
    });
  }
}
