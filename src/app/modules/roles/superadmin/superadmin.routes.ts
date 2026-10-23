import { Routes } from "@angular/router";
import { SuperadminShellComponent } from "./superadmin-shell.component";
import { superadminGuard } from "../../../core/guards/superadmin.guard";
import { foundationProfileRoutes } from "../../../foundation/profile/profile.routes";
import { foundationFeedbackRoutes } from "../../../foundation/feedback/feedback.routes";

export const superadminRoutes: Routes = [
  {
    path: "superadmin",
    canActivate: [superadminGuard],
    component: SuperadminShellComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./superadmin-dashboard.component").then((m) => m.SuperadminDashboardComponent),
      },
      {
        path: "users",
        loadComponent: () => import("./superadmin-users.component").then((m) => m.SuperadminUsersComponent),
      },
      {
        path: "users/:id",
        loadComponent: () => import("./superadmin-user-detail.component").then((m) => m.SuperadminUserDetailComponent),
      },
      {
        path: "companies",
        loadComponent: () => import("./superadmin-companies.component").then((m) => m.SuperadminCompaniesComponent),
      },
      {
        path: "companies/:id",
        loadComponent: () => import("./superadmin-company-detail.component").then((m) => m.SuperadminCompanyDetailComponent),
      },
      {
        path: "logs",
        loadComponent: () => import("./superadmin-logs.component").then((m) => m.SuperadminLogsComponent),
      },
      {
        path: "feedback-inbox",
        loadComponent: () => import("../../inventory/feedback/feedback-inbox.component").then((m) => m.FeedbackInboxComponent),
      },
      ...foundationProfileRoutes,
      ...foundationFeedbackRoutes,
    ],
  },
];
