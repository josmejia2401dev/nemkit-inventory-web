import { Routes } from "@angular/router";
import { SellerShellComponent } from "./shell/seller-shell.component";
import { roleGuard } from "@nemkit/foundation-web";
import { foundationProfileRoutes } from "@nemkit/foundation-web";
import { foundationFeedbackRoutes } from "@nemkit/foundation-web";
import { productCatalogRoute } from "../../inventory/products/products.routes";
import { customerDirectoryRoute } from "../../inventory/contacts/contacts.routes";
import { salesRoute } from "../../inventory/documents/documents.routes";
import { deliveryOperationsRoute } from "../../inventory/deliveries/deliveries.routes";
import { layawaysRoute } from "../../inventory/layaways/layaways.routes";

export const sellerRoutes: Routes = [
  {
    path: "seller",
    canActivate: [roleGuard(["SELLER"])],
    component: SellerShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./dashboard/seller-dashboard.component").then((m) => m.SellerDashboardComponent),
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
