import { Routes } from "@angular/router";
import { CookShellComponent } from "./shell/cook-shell.component";
import { roleGuard } from "../../../core/guards/role.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";
import { kitchenPreparationRoute } from "../../inventory/kitchen/kitchen.routes";

export const cookRoutes: Routes = [
  {
    path: "cook",
    canActivate: [roleGuard(["COOK"])],
    component: CookShellComponent,
    children: [
      { path: "", redirectTo: "kitchen", pathMatch: "full" },
      kitchenPreparationRoute,
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
