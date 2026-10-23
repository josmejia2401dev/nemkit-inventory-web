import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
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

  sidebarOpen = signal(false);
  alertCount = signal(0);
  user = this.store.user;
  company = this.store.company;
  today = new Date();

  ngOnInit(): void {
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

  get currentPage(): string {
    const path = this.router.url.split("/")[1];
    if (path === "profile") return "Mi perfil";

    return (
      this.navItems.find((item) => item.path.endsWith(path))?.label ?? "Resumen"
    );
  }

  // ADMIN y SUPERADMIN ven todo. Los demás roles ven solo lo relevante a su cargo.
  // El backend es quien autoriza de verdad; esto es únicamente UX.
  private allNavItems = [
    { path: "/dashboard", label: "Resumen", icon: "pi pi-chart-pie", roles: ["ADMIN", "CASHIER", "SELLER", "COURIER", "WAREHOUSE", "WAITER"] },
    { path: "/alerts", label: "Alertas", icon: "pi pi-bell", roles: ["ADMIN", "WAREHOUSE"] },
    { path: "/reports", label: "Reportes", icon: "pi pi-chart-bar", roles: ["ADMIN"] },
    { path: "/products", label: "Productos", icon: "pi pi-box", roles: ["ADMIN", "CASHIER", "SELLER", "WAREHOUSE"] },
    { path: "/purchases", label: "Compras", icon: "pi pi-truck", roles: ["ADMIN", "WAREHOUSE"] },
    { path: "/sales", label: "Ventas", icon: "pi pi-receipt", roles: ["ADMIN", "CASHIER", "SELLER", "WAITER"] },
    { path: "/deliveries", label: "Domicilios", icon: "pi pi-send", roles: ["ADMIN", "CASHIER", "SELLER", "COURIER", "WAITER"] },
    { path: "/categories", label: "Categorías", icon: "pi pi-tag", roles: ["ADMIN", "WAREHOUSE"] },
    { path: "/movements", label: "Movimientos", icon: "pi pi-arrow-right-arrow-left", roles: ["ADMIN", "WAREHOUSE"] },
    { path: "/suppliers", label: "Proveedores", icon: "pi pi-building", roles: ["ADMIN", "WAREHOUSE"] },
    { path: "/customers", label: "Clientes", icon: "pi pi-users", roles: ["ADMIN", "CASHIER", "SELLER", "WAITER"] },
    { path: "/employees", label: "Empleados", icon: "pi pi-id-card", roles: ["ADMIN"] },
  ];

  navItems = this.allNavItems.filter((item) => this.canSee(item.roles));

  mobileNavItems = this.navItems
    .filter((item) => ["/dashboard", "/products", "/sales", "/deliveries"].includes(item.path))
    .slice(0, 4);

  private canSee(allowedRoles: string[]): boolean {
    const roles: string[] = this.store.user()?.roles ?? [];
    if (roles.includes("SUPERADMIN") || roles.includes("ADMIN")) return true;
    return allowedRoles.some((role) => roles.includes(role));
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
