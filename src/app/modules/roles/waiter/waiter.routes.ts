import { Routes } from "@angular/router";
import { WaiterShellComponent } from "./waiter-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";

export const waiterRoutes: Routes = [
  {
    path: "waiter",
    canActivate: [roleGuard(["WAITER"])],
    component: WaiterShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./waiter-dashboard.component").then((m) => m.WaiterDashboardComponent),
      },
      {
        path: "sales",
        data: { kind: "sales" },
        loadComponent: () => import("../../inventory/documents/documents.component").then((m) => m.DocumentsComponent),
      },
      {
        path: "kitchen",
        loadComponent: () => import("../../inventory/kitchen/kitchen-board.component").then((m) => m.KitchenBoardComponent),
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
      ...foundationFeedbackRoutes,
    ],
  },
];
