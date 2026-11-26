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
import { definePreset } from "@primeng/themes";
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

/** Base oscura transversal + acento petróleo de Inventory. */
const NemkitPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#EAF4EF",
      100: "#D2E8DE",
      200: "#A6D2C0",
      300: "#7BBCA2",
      400: "#4F9E7F",
      500: "#276650",
      600: "#1F5644",
      700: "#184538",
      800: "#12352B",
      900: "#0C261F",
      950: "#061812",
    },
    colorScheme: {
      dark: {
        primary: {
          color: "#276650",
          contrastColor: "#F3F6F4",
          hoverColor: "#327A60",
          activeColor: "#1C5140",
        },
        surface: {
          0: "#F4F7F5",
          50: "#E3E9E5",
          100: "#BCC7C1",
          200: "#93A39A",
          300: "#6E8077",
          400: "#4B5E54",
          500: "#35463D",
          600: "#25332C",
          700: "#1A241F",
          800: "#121A15",
          900: "#0E1411",
          950: "#0A0F0C",
        },
      },
    },
  },
});

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
      theme: {
        preset: NemkitPreset,
        options: { darkModeSelector: ".nk-dark", cssLayer: false },
      },
      translation: primengSpanish,
    }),
  ],
};
