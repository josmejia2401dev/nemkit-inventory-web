import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../inventory/layout/layout.component";

/**
 * Shell del super administrador de plataforma. Menú propio de operación de la
 * plataforma (usuarios, empresas, logs, reportes), sin las vistas de inventario.
 */
@Component({
  selector: "app-superadmin-shell",
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout
    [navItems]="navItems"
    [dashboardPath]="'/superadmin/dashboard'"
    [profilePath]="'/superadmin/profile'"
    [reportPath]="'/superadmin/feedback'"
    [showAlerts]="false"
    [mobilePaths]="['/superadmin/dashboard', '/superadmin/users', '/superadmin/companies', '/superadmin/feedback-inbox']"
  />`,
})
export class SuperadminShellComponent {
  navItems: NavItem[] = [
    { path: "/superadmin/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/superadmin/users", label: "Usuarios del sistema", icon: "pi pi-users" },
    { path: "/superadmin/companies", label: "Empresas", icon: "pi pi-building" },
    { path: "/superadmin/feedback-inbox", label: "Reportes de usuarios", icon: "pi pi-inbox" },
  ];
}
