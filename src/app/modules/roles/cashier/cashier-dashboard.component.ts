import { Component } from "@angular/core";
import { RoleDashboardComponent, RoleShortcut } from "../shared/role-dashboard.component";

@Component({
  selector: "app-cashier-dashboard",
  standalone: true,
  imports: [RoleDashboardComponent],
  template: `<app-role-dashboard
    eyebrow="CAJA"
    subtitle="Registra ventas y atiende a tus clientes."
    [shortcuts]="shortcuts"
  />`,
})
export class CashierDashboardComponent {
  shortcuts: RoleShortcut[] = [
    { path: "/cashier/sales", label: "Nueva venta", description: "Registrar venta en caja o a domicilio", icon: "pi pi-receipt" },
    { path: "/cashier/deliveries", label: "Domicilios", description: "Seguimiento de entregas", icon: "pi pi-send" },
    { path: "/cashier/customers", label: "Clientes", description: "Buscar y registrar clientes", icon: "pi pi-users" },
  ];
}
