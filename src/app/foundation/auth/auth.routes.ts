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
  {
    path: "verify-email",
    loadComponent: () =>
      import("./verify-email/verify-email.component").then(
        (module) => module.VerifyEmailComponent,
      ),
  },
  {
    path: "employee/login",
    loadComponent: () =>
      import("./employee-login/employee-login.component").then(
        (module) => module.EmployeeLoginComponent,
      ),
  },
];
