import { Route } from "@angular/router";

export const layawaysRoute: Route = {
  path: "layaways",
  loadComponent: () =>
    import("./layaways-page/layaways-page.component").then(
      (module) => module.LayawaysPageComponent,
    ),
};
