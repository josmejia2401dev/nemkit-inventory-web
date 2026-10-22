import { Routes } from "@angular/router";

export const foundationAuthRoutes: Routes = [
  {
    path: "login",
    loadComponent: () =>
      import("./login/login.component").then((module) => module.LoginComponent),
  },
  {
    path: "register",
    loadComponent: () =>
      import("./register/register.component").then(
        (module) => module.RegisterComponent,
      ),
  },
];
