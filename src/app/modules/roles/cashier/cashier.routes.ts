import { Routes } from "@angular/router";
import { CashierShellComponent } from "./shell/cashier-shell.component";
import { roleGuard } from "@nemkit/foundation-web";
import { foundationProfileRoutes } from "@nemkit/foundation-web";
import { foundationFeedbackRoutes } from "@nemkit/foundation-web";
import { productCatalogRoute } from "../../inventory/products/products.routes";
import { customerDirectoryRoute } from "../../inventory/contacts/contacts.routes";
import { salesRoute } from "../../inventory/documents/documents.routes";
import { deliveryOperationsRoute } from "../../inventory/deliveries/deliveries.routes";
import { layawaysRoute } from "../../inventory/layaways/layaways.routes";

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
      layawaysRoute,
      deliveryOperationsRoute,
      customerDirectoryRoute,
      productCatalogRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
