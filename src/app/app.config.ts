import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
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
import { failoverInterceptor } from "./core/interceptors/failover.interceptor";
import { BackendEndpointService } from "./core/services/backend-endpoint.service";
import { primengSpanish } from "./core/ui/primeng-es";

registerLocaleData(localeEs, "es-CO");

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: "es-CO" },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // El failover va al final para reintentar solo cuando los demás
    // interceptores ya terminaron (y solo si el reintento también falla se
    // muestra el toast de error).
    provideHttpClient(
      withInterceptors([
        loadingInterceptor,
        authInterceptor,
        errorInterceptor,
        failoverInterceptor,
      ]),
    ),
    provideAppInitializer(() => inject(BackendEndpointService).initialize()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: false } },
      translation: primengSpanish,
    }),
  ],
};
