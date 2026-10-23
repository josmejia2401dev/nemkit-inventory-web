import { Routes } from "@angular/router";
import { WarehouseShellComponent } from "./warehouse-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";

export const warehouseRoutes: Routes = [
  {
    path: "warehouse",
    canActivate: [roleGuard(["WAREHOUSE"])],
    component: WarehouseShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./warehouse-dashboard.component").then((m) => m.WarehouseDashboardComponent),
      },
      {
        path: "alerts",
        loadComponent: () => import("../../inventory/alerts/alerts.component").then((m) => m.AlertsComponent),
      },
      {
        path: "products",
        loadComponent: () => import("../../inventory/products/products.component").then((m) => m.ProductsComponent),
      },
      {
        path: "categories",
        loadComponent: () => import("../../inventory/categories/categories.component").then((m) => m.CategoriesComponent),
      },
      {
        path: "movements",
        loadComponent: () => import("../../inventory/movements/movements.component").then((m) => m.MovementsComponent),
      },
      {
        path: "purchases",
        data: { kind: "purchases" },
        loadComponent: () => import("../../inventory/documents/documents.component").then((m) => m.DocumentsComponent),
      },
      {
        path: "suppliers",
        data: { kind: "suppliers" },
        loadComponent: () => import("../../inventory/contacts/contacts.component").then((m) => m.ContactsComponent),
      },
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
