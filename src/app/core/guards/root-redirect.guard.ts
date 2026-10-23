import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthStore } from "../store/auth.store";
import { homeForRoles } from "./role-home";

/**
 * Redirige la ruta raíz al espacio del rol del usuario autenticado.
 * Sin sesión → /login.
 */
export const rootRedirectGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.isLoggedIn()) {
    router.navigate(["/login"]);
    return false;
  }
  router.navigateByUrl(homeForRoles(store.user()?.roles));
  return false;
};
