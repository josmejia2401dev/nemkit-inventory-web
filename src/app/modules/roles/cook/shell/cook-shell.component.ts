import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../../inventory/layout/layout.component";

@Component({
  selector: "app-cook-shell",
  standalone: true,
  imports: [LayoutComponent],
  templateUrl: "./cook-shell.component.html",
})
export class CookShellComponent {
  navItems: NavItem[] = [
    { path: "/cook/kitchen", label: "Cocina", icon: "pi pi-stopwatch" },
  ];
}
