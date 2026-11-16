import { ApiEndpointConfig, ProbeResult } from './backend-endpoint.policy';

interface ReadyBody {
  status?: unknown;
  node?: unknown;
  probes?: { mongo?: { ok?: unknown } };
}

/**
 * Probe de disponibilidad real contra `/ready`.
 *
 * Usa `fetch` + `AbortController` a propósito: no pasa por interceptores, ni
 * por el spinner, ni por los toasts, y permite un timeout real por nodo. Al ser
 * un GET simple con `Accept: application/json` no dispara preflight CORS.
 */
export async function probeEndpoint(
  endpoint: ApiEndpointConfig,
  timeoutMs: number,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint.readyUrl, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    const body = (await readJson(response)) as ReadyBody | null;
    const nodeName = typeof body?.node === 'string' ? body.node : null;

    if (response.ok) {
      const reported = typeof body?.status === 'string' ? body.status : null;
      if (reported !== null && reported !== 'ready' && reported !== 'ok') {
        return { ok: false, classification: 'error', nodeName };
      }
      return { ok: true, classification: 'ready', nodeName };
    }

    // 503 emitido por la API porque su Mongo no está listo. Ambos nodos
    // comparten Atlas: cambiar de nodo no resuelve nada y no debe provocar failover.
    if (response.status === 503 && body?.probes?.mongo?.ok === false) {
      return { ok: false, classification: 'data-unavailable', nodeName };
    }

    return { ok: false, classification: 'unreachable', nodeName };
  } catch {
    // Red caída, DNS, TLS, timeout del AbortController o CORS mal configurado.
    return { ok: false, classification: 'unreachable', nodeName: null };
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    // Proxies y páginas de error devuelven HTML: no es un nodo listo.
    return null;
  }
}
