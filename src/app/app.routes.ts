import { Routes } from "@angular/router";
import { foundationAuthRoutes } from "./foundation/auth/auth.routes";
import { rootRedirectGuard } from "./core/guards/root-redirect.guard";
import { adminRoutes } from "./modules/roles/admin/admin.routes";
import { cashierRoutes } from "./modules/roles/cashier/cashier.routes";
import { sellerRoutes } from "./modules/roles/seller/seller.routes";
import { warehouseRoutes } from "./modules/roles/warehouse/warehouse.routes";
import { courierRoutes } from "./modules/roles/courier/courier.routes";
import { waiterRoutes } from "./modules/roles/waiter/waiter.routes";
import { cookRoutes } from "./modules/roles/cook/cook.routes";

export const routes: Routes = [
  ...foundationAuthRoutes,
  // Cada bloque de rol vive bajo su propio prefijo y está protegido por roleGuard.
  ...adminRoutes,
  ...cashierRoutes,
  ...sellerRoutes,
  ...warehouseRoutes,
  ...courierRoutes,
  ...waiterRoutes,
  ...cookRoutes,
  // Raíz: redirige al espacio del rol del usuario.
  { path: "", canActivate: [rootRedirectGuard], children: [] },
  { path: "**", redirectTo: "" },
];
