import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";

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
  navItems: NavItem[] = [
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
}
