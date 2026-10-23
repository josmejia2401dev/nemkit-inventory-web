import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";

@Component({
  selector: "app-waiter-shell",
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout
    [navItems]="navItems"
    [dashboardPath]="'/waiter/dashboard'"
    [profilePath]="'/waiter/profile'"
    [mobilePaths]="['/waiter/dashboard', '/waiter/sales', '/waiter/deliveries', '/waiter/customers']"
  />`,
})
export class WaiterShellComponent {
  navItems: NavItem[] = [
    { path: "/waiter/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/waiter/sales", label: "Pedidos", icon: "pi pi-receipt" },
    { path: "/waiter/kitchen", label: "Cocina", icon: "pi pi-stopwatch" },
    { path: "/waiter/deliveries", label: "Domicilios", icon: "pi pi-send" },
    { path: "/waiter/customers", label: "Clientes", icon: "pi pi-users" },
  ];
}
