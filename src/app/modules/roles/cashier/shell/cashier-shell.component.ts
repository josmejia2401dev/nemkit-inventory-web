import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../../inventory/layout/layout.component";

@Component({
  selector: "app-cashier-shell",
  standalone: true,
  imports: [LayoutComponent],
  templateUrl: "./cashier-shell.component.html",
})
export class CashierShellComponent {
  navItems: NavItem[] = [
    { path: "/cashier/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/cashier/sales", label: "Ventas", icon: "pi pi-receipt" },
    { path: "/cashier/products", label: "Productos", icon: "pi pi-box" },
    { path: "/cashier/deliveries", label: "Domicilios", icon: "pi pi-send" },
    { path: "/cashier/customers", label: "Clientes", icon: "pi pi-users" },
  ];
}
