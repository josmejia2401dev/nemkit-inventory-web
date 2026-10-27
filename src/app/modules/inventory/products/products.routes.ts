import { Route } from "@angular/router";

export const productCatalogRoute: Route = {
  path: "products",
  loadComponent: () =>
    import("./catalog/product-catalog.component").then(
      (module) => module.ProductCatalogComponent,
    ),
};

export const productManagementRoute: Route = {
  path: "products",
  loadComponent: () =>
    import("./management/product-management.component").then(
      (module) => module.ProductManagementComponent,
    ),
};
