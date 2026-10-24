import { Route } from "@angular/router";

export const productCatalogRoute: Route = {
  path: "products",
  loadComponent: () =>
    import("./product-catalog.component").then(
      (module) => module.ProductCatalogComponent,
    ),
};

export const productManagementRoute: Route = {
  path: "products",
  loadComponent: () =>
    import("./product-management.component").then(
      (module) => module.ProductManagementComponent,
    ),
};
