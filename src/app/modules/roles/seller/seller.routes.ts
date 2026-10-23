import { Routes } from "@angular/router";
import { SellerShellComponent } from "./seller-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";

export const sellerRoutes: Routes = [
  {
    path: "seller",
    canActivate: [roleGuard(["SELLER"])],
    component: SellerShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./seller-dashboard.component").then((m) => m.SellerDashboardComponent),
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
      ...foundationFeedbackRoutes,
    ],
  },
];
