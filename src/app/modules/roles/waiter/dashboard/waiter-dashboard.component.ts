import { Component } from "@angular/core";
import { RoleDashboardComponent, RoleShortcut } from "../../shared/role-dashboard/role-dashboard.component";

@Component({
  selector: "app-waiter-dashboard",
  standalone: true,
  imports: [RoleDashboardComponent],
  templateUrl: "./waiter-dashboard.component.html",
})
export class WaiterDashboardComponent {
  shortcuts: RoleShortcut[] = [
    { path: "/waiter/sales", label: "Nuevo pedido", description: "Registrar pedido en mesa o a domicilio", icon: "pi pi-receipt" },
    { path: "/waiter/deliveries", label: "Domicilios", description: "Seguimiento de entregas", icon: "pi pi-send" },
    { path: "/waiter/customers", label: "Clientes", description: "Buscar y registrar clientes", icon: "pi pi-users" },
  ];
}
