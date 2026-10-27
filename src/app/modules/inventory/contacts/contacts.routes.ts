import { Route } from "@angular/router";

export const customerDirectoryRoute: Route = {
  path: "customers",
  loadComponent: () =>
    import("../customers/customers-page/customers-page.component").then(
      (module) => module.CustomersPageComponent,
    ),
};

export const supplierDirectoryRoute: Route = {
  path: "suppliers",
  loadComponent: () =>
    import("../suppliers/suppliers-page.component").then(
      (module) => module.SuppliersPageComponent,
    ),
};
