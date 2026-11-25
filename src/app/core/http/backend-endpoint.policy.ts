/**
 * Política de selección de nodo (primario de casa vs respaldo de Render).
 *
 * Sin dependencias de Angular ni de `fetch`: aquí vive solo la máquina de
 * estados, de modo que el comportamiento se pueda validar de forma aislada y
 * el servicio Angular quede como un adaptador reactivo.
 */

export interface ApiEndpointConfig {
  name: string;
  /** Base de la API, incluyendo el prefijo (`.../api/v1/inventory`). */
  baseUrl: string;
  /** Endpoint de disponibilidad real; en la API es `/ready`, no `/health`. */
  readyUrl: string;
  /** Menor número = mayor prioridad (1 = primario). */
  priority: number;
}

export type EndpointStatus = 'checking' | 'online' | 'waking' | 'offline';

/**
 * `data-unavailable` = el nodo responde 503 porque su Mongo no está listo.
 * Como ambos nodos comparten Atlas, cambiar de nodo no ayuda: no se hace failover.
 */
export type ProbeClassification =
  | 'ready'
  | 'unreachable'
  | 'data-unavailable'
  | 'error';

export interface ProbeResult {
  ok: boolean;
  classification: ProbeClassification;
  /** Nombre del nodo reportado por `/ready`, si la API lo expone. */
  nodeName: string | null;
}

export type EndpointProbe = (
  endpoint: ApiEndpointConfig,
  timeoutMs: number,
) => Promise<ProbeResult>;

export interface BalancerOptions {
  /** Corte corto para el primario (red/Tailscale). */
  probeTimeoutMs: number;
  /** Corte largo para el respaldo en frío (Render free duerme). */
  coldStartTimeoutMs: number;
  /** Notifica cambios de estado; el adaptador Angular los convierte en signals. */
  onChange?: (snapshot: EndpointSnapshot) => void;
}

export interface EndpointSnapshot {
  activeName: string;
  activeBaseUrl: string;
  isFallback: boolean;
  nodeName: string | null;
  status: EndpointStatus;
  failovers: number;
  lastCheckedAt: number | null;
}

/** Probes sanos consecutivos del primario antes de volver desde el respaldo. */
export const PROBES_TO_RETURN = 2;

const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);
/** Fallos de red o de proxy; un 5xx con el sobre de la API no es del nodo. */
const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);

/**
 * Decide si un request se puede reintentar contra el otro nodo. Las escrituras
 * nunca se reintentan (un POST duplicado es peor que un error visible).
 */
export function shouldRetryOnOtherNode(
  method: string,
  status: number,
  body: unknown,
): boolean {
  if (!RETRYABLE_METHODS.has(method.toUpperCase())) return false;
  if (!RETRYABLE_STATUSES.has(status)) return false;
  // 503 emitido por la propia API (Mongo no listo): el otro nodo comparte Atlas.
  if (status === 503 && typeof body === 'object' && body !== null && 'success' in body) {
    return false;
  }
  return true;
}

export class EndpointBalancer {
  readonly #endpoints: ApiEndpointConfig[];
  readonly #probe: EndpointProbe;
  readonly #options: BalancerOptions;

  #activeIndex = 0;
  #status: EndpointStatus = 'checking';
  #failovers = 0;
  #lastCheckedAt: number | null = null;
  #nodeName: string | null = null;
  #primaryStreak = 0;
  #wake: Promise<void> | null = null;

  constructor(
    endpoints: ApiEndpointConfig[],
    probe: EndpointProbe,
    options: BalancerOptions,
  ) {
    this.#endpoints = [...endpoints].sort((a, b) => a.priority - b.priority);
    if (this.#endpoints.length === 0) {
      throw new Error('EndpointBalancer requiere al menos un endpoint');
    }
    this.#probe = probe;
    this.#options = options;
  }

  get endpoints(): ApiEndpointConfig[] {
    return this.#endpoints;
  }

  get current(): ApiEndpointConfig {
    return this.#endpoints[this.#activeIndex];
  }

  get status(): EndpointStatus {
    return this.#status;
  }

  /** Base de la API contra la que se construyen las peticiones nuevas. */
  get apiUrl(): string {
    return this.current.baseUrl;
  }

  /**
   * Devuelve la base conocida que encabeza la URL de una petición, para poder
   * reescribirla al nodo alterno sin tocar peticiones ajenas a la API.
   */
  resolveBase(url: string): string | null {
    const matches = this.#endpoints
      .map((endpoint) => endpoint.baseUrl)
      .filter((baseUrl) => url.startsWith(baseUrl))
      .sort((a, b) => b.length - a.length);
    return matches[0] ?? null;
  }

  snapshot(): EndpointSnapshot {
    return {
      activeName: this.current.name,
      activeBaseUrl: this.current.baseUrl,
      isFallback: this.#activeIndex > 0,
      nodeName: this.#nodeName,
      status: this.#status,
      failovers: this.#failovers,
      lastCheckedAt: this.#lastCheckedAt,
    };
  }

  /**
   * Arranque: prueba el primario con corte corto. Si no responde, empieza a
   * operar contra el respaldo y lo despierta en segundo plano para no bloquear
   * el bootstrap de la aplicación durante el cold start.
   */
  async initialize(): Promise<void> {
    const primary = this.#endpoints[0];

    if (this.#endpoints.length === 1) {
      const result = await this.#probe(primary, this.#options.probeTimeoutMs);
      this.#lastCheckedAt = Date.now();
      this.#nodeName = result.nodeName;
      this.#status = result.ok ? 'online' : 'offline';
      this.#emit();
      return;
    }

    const result = await this.#probe(primary, this.#options.probeTimeoutMs);
    this.#lastCheckedAt = Date.now();
    this.#nodeName = result.ok ? result.nodeName : null;

    if (result.ok) {
      this.#activeIndex = 0;
      this.#status = 'online';
      this.#primaryStreak = 0;
      this.#emit();
      return;
    }

    // El primario responde pero su base de datos no: cambiar de nodo no ayuda.
    if (result.classification === 'data-unavailable') {
      this.#activeIndex = 0;
      this.#status = 'offline';
      this.#emit();
      return;
    }

    this.#moveToFallback();
  }

  /**
   * Una petición falló por red/proxy. Devuelve `true` si el nodo activo cambió.
   * Con el respaldo activo se prueba el primario de inmediato: un fallo real de
   * request es evidencia más fuerte que el anti-flapping del recheck periódico.
   */
  async handleFailure(): Promise<boolean> {
    if (this.#endpoints.length === 1) {
      this.#status = 'offline';
      this.#lastCheckedAt = Date.now();
      this.#emit();
      return false;
    }

    if (this.#activeIndex === 0) {
      this.#moveToFallback();
      return true;
    }

    // El nodo activo (respaldo) acaba de fallar un request real y el primario
    // tampoco responde: no hay a dónde ir.
    const returned = await this.#probePrimaryForReturn({ force: true });
    if (!returned) {
      this.#status = 'offline';
      this.#emit();
    }
    return returned;
  }

  /**
   * Recheck periódico mientras se opera con el respaldo. Vuelve al primario
   * solo tras `PROBES_TO_RETURN` probes sanos consecutivos (anti-flapping).
   */
  async recheckPrimary(): Promise<boolean> {
    if (this.#endpoints.length < 2 || this.#activeIndex === 0) {
      this.#primaryStreak = 0;
      return false;
    }
    return this.#probePrimaryForReturn({ force: false });
  }

  #moveToFallback(): void {
    this.#activeIndex = 1;
    this.#failovers += 1;
    this.#status = 'waking';
    this.#lastCheckedAt = Date.now();
    this.#nodeName = null;
    this.#primaryStreak = 0;
    this.#emit();
    void this.#wakeFallback();
  }

  async #probePrimaryForReturn({ force }: { force: boolean }): Promise<boolean> {
    const result = await this.#probe(this.#endpoints[0], this.#options.probeTimeoutMs);
    this.#lastCheckedAt = Date.now();

    if (!result.ok) {
      this.#primaryStreak = 0;
      this.#emit();
      return false;
    }

    this.#primaryStreak += 1;
    if (!force && this.#primaryStreak < PROBES_TO_RETURN) {
      this.#emit();
      return false;
    }

    this.#activeIndex = 0;
    this.#primaryStreak = 0;
    this.#status = 'online';
    this.#nodeName = result.nodeName;
    this.#emit();
    return true;
  }

  /** Despierta el respaldo sin bloquear; publica el resultado cuando llega. */
  #wakeFallback(): Promise<void> {
    if (this.#wake) return this.#wake;

    const fallback = this.#endpoints[1];
    this.#wake = this.#probe(fallback, this.#options.coldStartTimeoutMs)
      .then((result) => {
        if (this.#activeIndex !== 1 || this.#status !== 'waking') return;
        this.#status = result.ok ? 'online' : 'offline';
        this.#nodeName = result.ok ? result.nodeName : null;
        this.#lastCheckedAt = Date.now();
        this.#emit();
      })
      .finally(() => {
        this.#wake = null;
      });

    return this.#wake;
  }

  #emit(): void {
    this.#options.onChange?.(this.snapshot());
  }
}
