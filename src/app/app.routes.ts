import { Routes } from "@angular/router";
import { foundationAuthRoutes } from "./foundation/auth/auth.routes";
import { rootRedirectGuard } from "./core/guards/root-redirect.guard";
import { platformRoutes } from "./foundation/platform/platform.routes";
import { adminRoutes } from "./modules/roles/admin/admin.routes";
import { cashierRoutes } from "./modules/roles/cashier/cashier.routes";
import { sellerRoutes } from "./modules/roles/seller/seller.routes";
import { courierRoutes } from "./modules/roles/courier/courier.routes";

export const routes: Routes = [
  ...foundationAuthRoutes,
  // Cada bloque de rol vive bajo su propio prefijo y está protegido por roleGuard.
  ...platformRoutes,
  ...adminRoutes,
  ...cashierRoutes,
  ...sellerRoutes,
  ...courierRoutes,
  // Raíz: redirige al espacio del rol del usuario.
  { path: "", canActivate: [rootRedirectGuard], children: [] },
  { path: "**", redirectTo: "" },
];
