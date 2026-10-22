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
import { InventoryStatusMessageComponent } from "../components/inventory-status-message/inventory-status-message.component";
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
    InventoryStatusMessageComponent,
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

  navItems = [
    { path: "/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/alerts", label: "Alertas", icon: "pi pi-bell" },
    { path: "/reports", label: "Reportes", icon: "pi pi-chart-bar" },
    { path: "/products", label: "Productos", icon: "pi pi-box" },
    { path: "/purchases", label: "Compras", icon: "pi pi-truck" },
    { path: "/sales", label: "Ventas", icon: "pi pi-receipt" },
    { path: "/categories", label: "Categorías", icon: "pi pi-tag" },
    {
      path: "/movements",
      label: "Movimientos",
      icon: "pi pi-arrow-right-arrow-left",
    },
    { path: "/suppliers", label: "Proveedores", icon: "pi pi-building" },
    { path: "/customers", label: "Clientes", icon: "pi pi-users" },
  ];

  mobileNavItems = this.navItems.filter((item) =>
    ["/dashboard", "/products", "/purchases", "/sales"].includes(item.path),
  );

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
