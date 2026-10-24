import { Route } from "@angular/router";

export const kitchenServiceRoute: Route = {
  path: "kitchen",
  loadComponent: () =>
    import("./kitchen-service-page.component").then(
      (module) => module.KitchenServicePageComponent,
    ),
};

export const kitchenPreparationRoute: Route = {
  path: "kitchen",
  loadComponent: () =>
    import("./kitchen-preparation-page.component").then(
      (module) => module.KitchenPreparationPageComponent,
    ),
};
