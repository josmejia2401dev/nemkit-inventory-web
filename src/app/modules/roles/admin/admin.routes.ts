import { Routes } from "@angular/router";
import { AdminShellComponent } from "./admin-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";
import { productManagementRoute } from "../../inventory/products/products.routes";
import { customerDirectoryRoute, supplierDirectoryRoute } from "../../inventory/contacts/contacts.routes";
import { purchasesRoute, salesRoute } from "../../inventory/documents/documents.routes";
import { deliveryOperationsRoute } from "../../inventory/deliveries/deliveries.routes";
import { kitchenServiceRoute } from "../../inventory/kitchen/kitchen.routes";

export const adminRoutes: Routes = [
  {
    path: "admin",
    canActivate: [roleGuard(["ADMIN"])],
    component: AdminShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("../../inventory/dashboard/dashboard.component").then((m) => m.DashboardComponent),
      },
      {
        path: "alerts",
        loadComponent: () => import("../../inventory/alerts/alerts.component").then((m) => m.AlertsComponent),
      },
      {
        path: "reports",
        loadComponent: () => import("../../inventory/reports/reports.component").then((m) => m.ReportsComponent),
      },
      productManagementRoute,
      {
        path: "business",
        loadComponent: () =>
          import("../../../foundation/business-settings/business-settings.component").then(
            (module) => module.BusinessSettingsComponent,
          ),
      },
      {
        path: "categories",
        loadComponent: () => import("../../inventory/categories/categories.component").then((m) => m.CategoriesComponent),
      },
      {
        path: "movements",
        loadComponent: () => import("../../inventory/movements/movements.component").then((m) => m.MovementsComponent),
      },
      purchasesRoute,
      salesRoute,
      deliveryOperationsRoute,
      supplierDirectoryRoute,
      customerDirectoryRoute,
      {
        path: "employees",
        loadComponent: () => import("../../inventory/employees/employees.component").then((m) => m.EmployeesComponent),
      },
      {
        path: "tables",
        loadComponent: () => import("../../inventory/tables/tables.component").then((m) => m.TablesComponent),
      },
      kitchenServiceRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
