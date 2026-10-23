import { Component, inject } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";
import { AuthStore } from "../../../core/store/auth.store";

@Component({
  selector: "app-admin-shell",
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout
    [navItems]="navItems"
    [dashboardPath]="'/admin/dashboard'"
    [profilePath]="'/admin/profile'"
    [alertsPath]="'/admin/alerts'"
    [showAlerts]="true"
    [mobilePaths]="['/admin/dashboard', '/admin/products', '/admin/sales', '/admin/deliveries']"
  />`,
})
export class AdminShellComponent {
  private store = inject(AuthStore);

  private baseNav: NavItem[] = [
    { path: "/admin/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/admin/alerts", label: "Alertas", icon: "pi pi-bell" },
    { path: "/admin/reports", label: "Reportes", icon: "pi pi-chart-bar" },
    { path: "/admin/products", label: "Productos", icon: "pi pi-box" },
    { path: "/admin/purchases", label: "Compras", icon: "pi pi-truck" },
    { path: "/admin/sales", label: "Ventas", icon: "pi pi-receipt" },
    { path: "/admin/deliveries", label: "Domicilios", icon: "pi pi-send" },
    { path: "/admin/categories", label: "Categorías", icon: "pi pi-tag" },
    { path: "/admin/movements", label: "Movimientos", icon: "pi pi-arrow-right-arrow-left" },
    { path: "/admin/suppliers", label: "Proveedores", icon: "pi pi-building" },
    { path: "/admin/customers", label: "Clientes", icon: "pi pi-users" },
    { path: "/admin/employees", label: "Empleados", icon: "pi pi-id-card" },
  ];

  private get isSuperAdmin(): boolean {
    const roles: string[] = this.store.user()?.roles ?? [];
    return roles.includes("SUPERADMIN");
  }

  navItems: NavItem[] = this.buildNav();

  private buildNav(): NavItem[] {
    const items = [...this.baseNav];
    // "Mesas" solo tiene sentido en restaurantes.
    if (this.store.company()?.businessType === "restaurant") {
      items.push({ path: "/admin/tables", label: "Mesas", icon: "pi pi-stop" });
    }
    // Bandeja global de reportes de usuarios: exclusiva del super admin.
    if (this.isSuperAdmin) {
      items.push({ path: "/admin/feedback-inbox", label: "Reportes de usuarios", icon: "pi pi-inbox" });
    }
    return items;
  }
}
