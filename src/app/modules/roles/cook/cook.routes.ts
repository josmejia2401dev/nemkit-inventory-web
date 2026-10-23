import { Routes } from "@angular/router";
import { CookShellComponent } from "./cook-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";

export const cookRoutes: Routes = [
  {
    path: "cook",
    canActivate: [roleGuard(["COOK"])],
    component: CookShellComponent,
    children: [
      { path: "", redirectTo: "kitchen", pathMatch: "full" },
      {
        path: "kitchen",
        loadComponent: () =>
          import("../../inventory/kitchen/kitchen-board.component").then((m) => m.KitchenBoardComponent),
      },
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
