import {
  ApplicationConfig,
  provideZoneChangeDetection,
} from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { provideRouter } from "@angular/router";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import {
  provideFoundationHttp,
  provideFoundationLocale,
  provideFoundationWeb,
  provideNemkitPrimeNG,
} from "@nemkit/foundation-web";
import { routes } from "./app.routes";
import { environment } from "../environments/environment";

registerLocaleData(localeEs, "es-CO");

export const appConfig: ApplicationConfig = {
  providers: [
    provideFoundationLocale(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFoundationHttp(),
    provideFoundationWeb({
      product: { id: "inventory" },
      runtime: {
        endpoints: environment.apiEndpoints,
        probeTimeoutMs: environment.probeTimeoutMs,
        coldStartTimeoutMs: environment.coldStartTimeoutMs,
        primaryRecheckMs: environment.primaryRecheckMs,
        tokenRefreshThresholdMs: environment.tokenRefreshThresholdMs,
      },
    }),
    provideAnimationsAsync(),
    provideNemkitPrimeNG("green"),
  ],
};
