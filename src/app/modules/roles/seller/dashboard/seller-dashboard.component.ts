import { Component } from "@angular/core";
import { RoleDashboardComponent, RoleShortcut } from "../../shared/role-dashboard/role-dashboard.component";

@Component({
  selector: "app-seller-dashboard",
  standalone: true,
  imports: [RoleDashboardComponent],
  templateUrl: "./seller-dashboard.component.html",
})
export class SellerDashboardComponent {
  shortcuts: RoleShortcut[] = [
    { path: "/seller/sales", label: "Nueva venta", description: "Registrar venta en sitio o a domicilio", icon: "pi pi-receipt" },
    { path: "/seller/deliveries", label: "Domicilios", description: "Seguimiento de entregas", icon: "pi pi-send" },
    { path: "/seller/customers", label: "Clientes", description: "Buscar y registrar clientes", icon: "pi pi-users" },
  ];
}
