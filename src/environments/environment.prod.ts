import { ApiEndpointConfig } from "../app/core/http/backend-endpoint.policy";

/**
 * Servidor de casa expuesto por Tailscale Funnel.
 * Mientras esté vacío, la app usa solo Render y el failover queda inactivo:
 * así nunca se prueba un host inexistente en producción. Configúralo en el
 * despliegue con el dominio real, por ejemplo:
 *   "https://nemkit-casa.tailXXXX.ts.net"
 */
const HOME_API_ORIGIN = "https://gateway.tail224652.ts.net";

const RENDER_ORIGIN = "https://nemkit-inventory-api.onrender.com";

const homeEndpoints: ApiEndpointConfig[] = HOME_API_ORIGIN
  ? [
      {
        name: "casa",
        baseUrl: `${HOME_API_ORIGIN}/api/v1`,
        readyUrl: `${HOME_API_ORIGIN}/ready`,
        priority: 1,
      },
    ]
  : [];

const apiEndpoints: ApiEndpointConfig[] = [
  ...homeEndpoints,
  {
    name: "render",
    baseUrl: `${RENDER_ORIGIN}/api/v1`,
    readyUrl: `${RENDER_ORIGIN}/ready`,
    // Si hay servidor de casa es el respaldo; si no, es el único nodo.
    priority: homeEndpoints.length ? 2 : 1,
  },
];

export const environment = {
  production: true,
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
