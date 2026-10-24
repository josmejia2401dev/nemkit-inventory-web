import { Route } from "@angular/router";

export const salesRoute: Route = {
  path: "sales",
  loadComponent: () =>
    import("../sales/sales-page.component").then(
      (module) => module.SalesPageComponent,
    ),
};

export const purchasesRoute: Route = {
  path: "purchases",
  loadComponent: () =>
    import("../purchases/purchases-page.component").then(
      (module) => module.PurchasesPageComponent,
    ),
};
