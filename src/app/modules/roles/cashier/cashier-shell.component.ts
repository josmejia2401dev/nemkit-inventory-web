import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";

@Component({
  selector: "app-cashier-shell",
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout
    [navItems]="navItems"
    [dashboardPath]="'/cashier/dashboard'"
    [profilePath]="'/cashier/profile'"
    [mobilePaths]="['/cashier/dashboard', '/cashier/sales', '/cashier/deliveries', '/cashier/customers']"
  />`,
})
export class CashierShellComponent {
  navItems: NavItem[] = [
    { path: "/cashier/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/cashier/sales", label: "Ventas", icon: "pi pi-receipt" },
    { path: "/cashier/deliveries", label: "Domicilios", icon: "pi pi-send" },
    { path: "/cashier/customers", label: "Clientes", icon: "pi pi-users" },
  ];
}
