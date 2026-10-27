import { Routes } from "@angular/router";
import { SuperadminShellComponent } from "./shell/superadmin-shell.component";
import { superadminGuard } from "./platform.guard";
import { foundationProfileRoutes } from "../profile/profile.routes";
import { foundationFeedbackRoutes } from "../feedback/feedback.routes";

export const platformRoutes: Routes = [
  {
    path: "superadmin",
    canActivate: [superadminGuard],
    component: SuperadminShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./dashboard/superadmin-dashboard.component").then((m) => m.SuperadminDashboardComponent),
      },
      {
        path: "users",
        loadComponent: () => import("./users/superadmin-users.component").then((m) => m.SuperadminUsersComponent),
      },
      {
        path: "employees",
        loadComponent: () => import("./employees/superadmin-employees.component").then((m) => m.SuperadminEmployeesComponent),
      },
      {
        path: "users/:id",
        loadComponent: () => import("./user-detail/superadmin-user-detail.component").then((m) => m.SuperadminUserDetailComponent),
      },
      {
        path: "companies",
        loadComponent: () => import("./companies/superadmin-companies.component").then((m) => m.SuperadminCompaniesComponent),
      },
      {
        path: "companies/:id",
        loadComponent: () => import("./company-detail/superadmin-company-detail.component").then((m) => m.SuperadminCompanyDetailComponent),
      },
      {
        path: "feedback-inbox",
        loadComponent: () => import("./reports/feedback-inbox.component").then((m) => m.FeedbackInboxComponent),
      },
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
