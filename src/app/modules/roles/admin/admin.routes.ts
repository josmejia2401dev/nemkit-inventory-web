import { Routes } from "@angular/router";
import { AdminShellComponent } from "./admin-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";

export const adminRoutes: Routes = [
  {
    path: "admin",
    canActivate: [roleGuard(["ADMIN", "SUPERADMIN"])],
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
        path: "sales",
        data: { kind: "sales" },
        loadComponent: () => import("../../inventory/documents/documents.component").then((m) => m.DocumentsComponent),
      },
      {
        path: "deliveries",
        loadComponent: () => import("../../inventory/deliveries/deliveries.component").then((m) => m.DeliveriesComponent),
      },
      {
        path: "suppliers",
        data: { kind: "suppliers" },
        loadComponent: () => import("../../inventory/contacts/contacts.component").then((m) => m.ContactsComponent),
      },
      {
        path: "customers",
        data: { kind: "customers" },
        loadComponent: () => import("../../inventory/contacts/contacts.component").then((m) => m.ContactsComponent),
      },
      {
        path: "employees",
        loadComponent: () => import("../../inventory/employees/employees.component").then((m) => m.EmployeesComponent),
      },
      ...foundationProfileRoutes,
    ],
  },
];
