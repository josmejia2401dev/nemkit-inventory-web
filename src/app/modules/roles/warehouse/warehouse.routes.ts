import { Routes } from "@angular/router";
import { WarehouseShellComponent } from "./warehouse-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";
import { productManagementRoute } from "../../inventory/products/products.routes";
import { supplierDirectoryRoute } from "../../inventory/contacts/contacts.routes";
import { purchasesRoute } from "../../inventory/documents/documents.routes";

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
      productManagementRoute,
      {
        path: "categories",
        loadComponent: () => import("../../inventory/categories/categories.component").then((m) => m.CategoriesComponent),
      },
      {
        path: "movements",
        loadComponent: () => import("../../inventory/movements/movements.component").then((m) => m.MovementsComponent),
      },
      purchasesRoute,
      supplierDirectoryRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
