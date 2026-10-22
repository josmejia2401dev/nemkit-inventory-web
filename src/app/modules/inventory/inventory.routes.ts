import { Routes } from "@angular/router";

export const inventoryRoutes: Routes = [
  {
    path: "alerts",
    loadComponent: () =>
      import("./alerts/alerts.component").then(
        (module) => module.AlertsComponent,
      ),
  },
  {
    path: "reports",
    loadComponent: () =>
      import("./reports/reports.component").then(
        (module) => module.ReportsComponent,
      ),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (module) => module.DashboardComponent,
      ),
  },
  {
    path: "products",
    loadComponent: () =>
      import("./products/products.component").then(
        (module) => module.ProductsComponent,
      ),
  },
  {
    path: "categories",
    loadComponent: () =>
      import("./categories/categories.component").then(
        (module) => module.CategoriesComponent,
      ),
  },
  {
    path: "movements",
    loadComponent: () =>
      import("./movements/movements.component").then(
        (module) => module.MovementsComponent,
      ),
  },
  {
    path: "suppliers",
    data: { kind: "suppliers" },
    loadComponent: () =>
      import("./contacts/contacts.component").then(
        (module) => module.ContactsComponent,
      ),
  },
  {
    path: "customers",
    data: { kind: "customers" },
    loadComponent: () =>
      import("./contacts/contacts.component").then(
        (module) => module.ContactsComponent,
      ),
  },
  {
    path: "purchases",
    data: { kind: "purchases" },
    loadComponent: () =>
      import("./documents/documents.component").then(
        (module) => module.DocumentsComponent,
      ),
  },
  {
    path: "sales",
    data: { kind: "sales" },
    loadComponent: () =>
      import("./documents/documents.component").then(
        (module) => module.DocumentsComponent,
      ),
  },
];
