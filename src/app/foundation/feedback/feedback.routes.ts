import { Routes } from "@angular/router";

/**
 * Ruta transversal del formulario de reporte. Se monta en el shell de cada rol
 * para que cualquier usuario pueda reportar desde su espacio de trabajo.
 */
export const foundationFeedbackRoutes: Routes = [
  {
    path: "feedback",
    loadComponent: () =>
      import("./feedback.component").then((module) => module.FeedbackComponent),
  },
];
