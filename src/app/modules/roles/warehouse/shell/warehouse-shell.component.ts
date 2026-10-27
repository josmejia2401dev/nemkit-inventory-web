import { Component } from "@angular/core";
import { LayoutComponent, NavItem } from "../../../inventory/layout/layout.component";

@Component({
  selector: "app-warehouse-shell",
  standalone: true,
  imports: [LayoutComponent],
  templateUrl: "./warehouse-shell.component.html",
})
export class WarehouseShellComponent {
  navItems: NavItem[] = [
    { path: "/warehouse/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/warehouse/alerts", label: "Alertas", icon: "pi pi-bell" },
    { path: "/warehouse/products", label: "Productos", icon: "pi pi-box" },
    { path: "/warehouse/categories", label: "Categorías", icon: "pi pi-tag" },
    { path: "/warehouse/movements", label: "Movimientos", icon: "pi pi-arrow-right-arrow-left" },
    { path: "/warehouse/purchases", label: "Compras", icon: "pi pi-truck" },
    { path: "/warehouse/suppliers", label: "Proveedores", icon: "pi pi-building" },
  ];
}
