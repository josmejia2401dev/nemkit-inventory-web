import { Routes } from "@angular/router";

export const inventoryRoutes: Routes = [
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
];
