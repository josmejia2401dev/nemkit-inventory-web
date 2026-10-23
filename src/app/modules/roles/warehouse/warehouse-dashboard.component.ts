import { Component } from "@angular/core";
import { RoleDashboardComponent, RoleShortcut } from "../shared/role-dashboard.component";

@Component({
  selector: "app-warehouse-dashboard",
  standalone: true,
  imports: [RoleDashboardComponent],
  template: `<app-role-dashboard
    eyebrow="BODEGA"
    subtitle="Controla existencias, entradas y compras."
    [shortcuts]="shortcuts"
  />`,
})
export class WarehouseDashboardComponent {
  shortcuts: RoleShortcut[] = [
    { path: "/warehouse/products", label: "Productos", description: "Crear y editar el catálogo", icon: "pi pi-box" },
    { path: "/warehouse/movements", label: "Movimientos", description: "Entradas, ajustes, daños y pérdidas", icon: "pi pi-arrow-right-arrow-left" },
    { path: "/warehouse/purchases", label: "Compras", description: "Registrar compras a proveedores", icon: "pi pi-truck" },
    { path: "/warehouse/alerts", label: "Alertas", description: "Productos agotados o con stock bajo", icon: "pi pi-bell" },
  ];
}
