import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";

@Component({
  selector: "app-seller-shell",
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout
    [navItems]="navItems"
    [dashboardPath]="'/seller/dashboard'"
    [profilePath]="'/seller/profile'"
    [mobilePaths]="['/seller/dashboard', '/seller/sales', '/seller/products', '/seller/deliveries']"
  />`,
})
export class SellerShellComponent {
  navItems: NavItem[] = [
    { path: "/seller/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/seller/sales", label: "Ventas", icon: "pi pi-receipt" },
    { path: "/seller/products", label: "Productos", icon: "pi pi-box" },
    { path: "/seller/deliveries", label: "Domicilios", icon: "pi pi-send" },
    { path: "/seller/customers", label: "Clientes", icon: "pi pi-users" },
  ];
}
