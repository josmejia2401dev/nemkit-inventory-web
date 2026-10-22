import {
  ApplicationConfig,
  LOCALE_ID,
  provideZoneChangeDetection,
} from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { providePrimeNG } from "primeng/config";
import Aura from "@primeng/themes/aura";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { loadingInterceptor } from "./core/interceptors/loading.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";

registerLocaleData(localeEs, "es-CO");

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: "es-CO" },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor]),
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: false } },
    }),
  ],
};
