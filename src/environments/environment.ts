import { ApiEndpointConfig } from "../app/core/http/backend-endpoint.policy";

const LOCAL_ORIGIN = "http://localhost:4000";

/**
 * Prueba local del failover: los dos nodos apuntan al mismo proceso.
 * Ejercita selección, probes y estado sin depender de Render/Tailscale.
 * Para probar el cambio real de nodo, levanta el respaldo en otro puerto y
 * cambia `FALLBACK_ORIGIN`.
 */
const FALLBACK_ORIGIN = LOCAL_ORIGIN;

const apiEndpoints: ApiEndpointConfig[] = [
  {
    name: "casa",
    baseUrl: `${LOCAL_ORIGIN}/api/v1`,
    readyUrl: `${LOCAL_ORIGIN}/ready`,
    priority: 1,
  },
  {
    name: "render",
    baseUrl: `${FALLBACK_ORIGIN}/api/v1`,
    readyUrl: `${FALLBACK_ORIGIN}/ready`,
    priority: 2,
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
};
