import { ApiEndpointConfig } from "../app/core/http/backend-endpoint.policy";

const LOCAL_ORIGIN = "http://localhost:4000";

const apiEndpoints: ApiEndpointConfig[] = [
  {
    name: "local",
    baseUrl: `${LOCAL_ORIGIN}/api/v1`,
    readyUrl: `${LOCAL_ORIGIN}/ready`,
    priority: 1,
  },
];

export const environment = {
  production: false,
  apiEndpoints,
  /** Corte corto del primario: red local o Tailscale. */
  probeTimeoutMs: 2_500,
  /** Render free duerme; su primer request puede tardar ~90 s. */
  coldStartTimeoutMs: 90_000,
  /** Cada 30 s se revisa el primario (2 probes sanos ⇒ vuelve en ≤ 60 s). */
  primaryRecheckMs: 30_000,
  appName: "Nemkit Inventory",
  tokenRefreshThresholdMs: 2 * 60 * 1000,

  /** @deprecated usar `apiEndpoints`. */
  get apiUrl(): string {
    return apiEndpoints[0].baseUrl;
  },
  /** @deprecated usar `apiEndpoints`. */
  healthUrl: `${LOCAL_ORIGIN}/health`,
};
