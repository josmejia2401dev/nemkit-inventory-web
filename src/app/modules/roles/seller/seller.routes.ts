import { Routes } from "@angular/router";
import { SellerShellComponent } from "./seller-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";
import { productCatalogRoute } from "../../inventory/products/products.routes";
import { customerDirectoryRoute } from "../../inventory/contacts/contacts.routes";
import { salesRoute } from "../../inventory/documents/documents.routes";
import { deliveryOperationsRoute } from "../../inventory/deliveries/deliveries.routes";

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
      salesRoute,
      deliveryOperationsRoute,
      customerDirectoryRoute,
      productCatalogRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
