import { Routes } from "@angular/router";
import { WaiterShellComponent } from "./waiter-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";
import { productCatalogRoute } from "../../inventory/products/products.routes";
import { customerDirectoryRoute } from "../../inventory/contacts/contacts.routes";
import { salesRoute } from "../../inventory/documents/documents.routes";
import { deliveryOperationsRoute } from "../../inventory/deliveries/deliveries.routes";
import { kitchenServiceRoute } from "../../inventory/kitchen/kitchen.routes";

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
      salesRoute,
      kitchenServiceRoute,
      deliveryOperationsRoute,
      customerDirectoryRoute,
      productCatalogRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
