import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthStore } from "../../core/store/auth.store";
import { homeForRoles } from "../../core/guards/role-home";

/**
 * Guard EXCLUSIVO del super administrador. A diferencia de `roleGuard`, NO deja
 * pasar a un ADMIN de empresa: el espacio de plataforma es solo para SUPERADMIN.
 * - Sin sesión → /login.
 * - Con sesión pero sin rol SUPERADMIN → a su propio home.
 */
export const superadminGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.isLoggedIn()) {
    router.navigateByUrl(store.loginPath());
    return false;
  }

  const roles: string[] = store.user()?.roles ?? [];
  if (!roles.includes("SUPERADMIN")) {
    router.navigateByUrl(homeForRoles(roles));
    return false;
  }
  return true;
};
