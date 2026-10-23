import { Routes } from "@angular/router";
import { CashierShellComponent } from "./cashier-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";

export const cashierRoutes: Routes = [
  {
    path: "cashier",
    canActivate: [roleGuard(["CASHIER"])],
    component: CashierShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./cashier-dashboard.component").then((m) => m.CashierDashboardComponent),
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
        path: "customers",
        data: { kind: "customers" },
        loadComponent: () => import("../../inventory/contacts/contacts.component").then((m) => m.ContactsComponent),
      },
      ...foundationProfileRoutes,
    ],
  },
];
