/**
 * Resolución del "home" (ruta inicial) según el rol principal del usuario.
 * El front enruta a cada usuario a su espacio de rol. El backend es quien
 * autoriza de verdad; esto es navegación/UX.
 */

export type AppRole =
  | "SUPERADMIN"
  | "ADMIN"
  | "CASHIER"
  | "SELLER"
  | "WAREHOUSE"
  | "COURIER"
  | "WAITER"
  | "COOK"
  | "USER";

const ROLE_HOME: Record<string, string> = {
  SUPERADMIN: "/superadmin",
  ADMIN: "/admin",
  CASHIER: "/cashier",
  SELLER: "/seller",
  WAREHOUSE: "/warehouse",
  COURIER: "/courier",
  WAITER: "/waiter",
  COOK: "/cook",
};

// Prioridad cuando un usuario tuviera varios roles (el más privilegiado gana).
const ROLE_PRIORITY: string[] = [
  "SUPERADMIN",
  "ADMIN",
  "WAREHOUSE",
  "CASHIER",
  "SELLER",
  "WAITER",
  "COOK",
  "COURIER",
];

/** Rol efectivo (el de mayor prioridad que tenga el usuario). */
export function primaryRole(roles: string[] | undefined | null): string | null {
  if (!roles || roles.length === 0) return null;
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return null;
}

/** Ruta home del usuario según su rol principal. `/login` si no hay rol conocido. */
export function homeForRoles(roles: string[] | undefined | null): string {
  const role = primaryRole(roles);
  return (role && ROLE_HOME[role]) || "/login";
}
