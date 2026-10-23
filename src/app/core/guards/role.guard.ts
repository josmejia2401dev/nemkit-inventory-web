import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthStore } from "../store/auth.store";
import { homeForRoles } from "./role-home";

/**
 * Guard de acceso por rol. Protege un bloque de rutas de un rol concreto.
 * - Si no hay sesión → /login.
 * - Si el usuario no tiene ninguno de los roles permitidos → se le redirige a
 *   SU propio home (no a login), evitando el acceso cruzado por URL.
 *
 * ADMIN y SUPERADMIN tienen acceso a cualquier bloque.
 *
 * @param allowed roles de usuario (MAYÚSCULAS) autorizados para el bloque.
 */
export function roleGuard(allowed: string[]): CanActivateFn {
  return () => {
    const store = inject(AuthStore);
    const router = inject(Router);

    if (!store.isLoggedIn()) {
      router.navigate(["/login"]);
      return false;
    }

    const roles: string[] = store.user()?.roles ?? [];
    const privileged = roles.includes("ADMIN") || roles.includes("SUPERADMIN");
    const ok = privileged || allowed.some((role) => roles.includes(role));

    if (!ok) {
      router.navigateByUrl(homeForRoles(roles));
      return false;
    }
    return true;
  };
}
