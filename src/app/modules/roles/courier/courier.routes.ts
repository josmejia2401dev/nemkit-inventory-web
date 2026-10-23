import { Routes } from "@angular/router";
import { CourierShellComponent } from "./courier-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";

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
          import("./courier-dashboard.component").then((m) => m.CourierDashboardComponent),
      },
      {
        path: "deliveries",
        data: { scope: "mine" },
        loadComponent: () =>
          import("../../inventory/deliveries/deliveries.component").then((m) => m.DeliveriesComponent),
      },
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
