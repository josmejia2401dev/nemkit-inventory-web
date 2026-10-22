import { Routes } from "@angular/router";
import { authGuard } from "./foundation/auth/guards/auth.guard";
import { foundationAuthRoutes } from "./foundation/auth/auth.routes";
import { foundationProfileRoutes } from "./foundation/profile/profile.routes";
import { LayoutComponent as InventoryLayoutComponent } from "./modules/inventory/layout/layout.component";
import { inventoryRoutes } from "./modules/inventory/inventory.routes";

export const routes: Routes = [
  ...foundationAuthRoutes,
  {
    path: "",
    canActivate: [authGuard],
    component: InventoryLayoutComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      ...inventoryRoutes,
      ...foundationProfileRoutes,
    ],
  },
  { path: "**", redirectTo: "login" },
];
