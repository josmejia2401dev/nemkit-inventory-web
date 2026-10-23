import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";

@Component({
  selector: "app-courier-shell",
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout
    [navItems]="navItems"
    [dashboardPath]="'/courier/dashboard'"
    [profilePath]="'/courier/profile'"
    [mobilePaths]="['/courier/dashboard', '/courier/deliveries']"
  />`,
})
export class CourierShellComponent {
  navItems: NavItem[] = [
    { path: "/courier/dashboard", label: "Mis entregas", icon: "pi pi-chart-pie" },
    { path: "/courier/deliveries", label: "Domicilios", icon: "pi pi-send" },
  ];
}
