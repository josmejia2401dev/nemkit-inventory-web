import { Routes } from "@angular/router";
import { CashierShellComponent } from "./shell/cashier-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";
import { productCatalogRoute } from "../../inventory/products/products.routes";
import { customerDirectoryRoute } from "../../inventory/contacts/contacts.routes";
import { salesRoute } from "../../inventory/documents/documents.routes";
import { deliveryOperationsRoute } from "../../inventory/deliveries/deliveries.routes";

export const cashierRoutes: Routes = [
  {
    path: "cashier",
    canActivate: [roleGuard(["CASHIER"])],
    component: CashierShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./dashboard/cashier-dashboard.component").then((m) => m.CashierDashboardComponent),
      },
      salesRoute,
      deliveryOperationsRoute,
      customerDirectoryRoute,
      productCatalogRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
