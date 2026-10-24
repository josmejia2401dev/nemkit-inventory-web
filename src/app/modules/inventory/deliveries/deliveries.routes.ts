import { Route } from "@angular/router";

export const deliveryOperationsRoute: Route = {
  path: "deliveries",
  loadComponent: () =>
    import("./delivery-operations-page.component").then(
      (module) => module.DeliveryOperationsPageComponent,
    ),
};

export const courierDeliveriesRoute: Route = {
  path: "deliveries",
  loadComponent: () =>
    import("./courier-deliveries-page.component").then(
      (module) => module.CourierDeliveriesPageComponent,
    ),
};
