import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";

@Component({
  selector: "app-cook-shell",
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout
    [navItems]="navItems"
    [dashboardPath]="'/cook/kitchen'"
    [profilePath]="'/cook/profile'"
    [mobilePaths]="['/cook/kitchen']"
  />`,
})
export class CookShellComponent {
  navItems: NavItem[] = [
    { path: "/cook/kitchen", label: "Cocina", icon: "pi pi-stopwatch" },
  ];
}
