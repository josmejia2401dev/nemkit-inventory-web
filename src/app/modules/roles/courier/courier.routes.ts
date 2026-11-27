import { Routes } from "@angular/router";
import { CourierShellComponent } from "./shell/courier-shell.component";
import { roleGuard } from "@nemkit/foundation-web";
import { foundationProfileRoutes } from "@nemkit/foundation-web";
import { foundationFeedbackRoutes } from "@nemkit/foundation-web";
import { courierDeliveriesRoute } from "../../inventory/deliveries/deliveries.routes";

export const courierRoutes: Routes = [
  {
    path: "courier",
    canActivate: [roleGuard(["COURIER"])],
    component: CourierShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () =>
          import("./dashboard/courier-dashboard.component").then((m) => m.CourierDashboardComponent),
      },
      courierDeliveriesRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
