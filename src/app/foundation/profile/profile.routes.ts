import { Routes } from "@angular/router";

export const foundationProfileRoutes: Routes = [
  {
    path: "profile",
    loadComponent: () =>
      import("./profile.component").then((module) => module.ProfileComponent),
  },
];
