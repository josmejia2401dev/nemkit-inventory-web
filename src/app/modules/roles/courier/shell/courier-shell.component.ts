import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../../inventory/layout/layout.component";

@Component({
  selector: "app-courier-shell",
  standalone: true,
  imports: [LayoutComponent],
  templateUrl: "./courier-shell.component.html",
})
export class CourierShellComponent {
  navItems: NavItem[] = [
    { path: "/courier/dashboard", label: "Mis entregas", icon: "pi pi-chart-pie" },
    { path: "/courier/deliveries", label: "Domicilios", icon: "pi pi-send" },
  ];
}
