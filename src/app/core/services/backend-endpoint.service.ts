import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { exhaustMap, filter, from, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EndpointBalancer,
  EndpointSnapshot,
  EndpointStatus,
} from '../http/backend-endpoint.policy';
import { probeEndpoint } from '../http/backend-probe';

/**
 * Adaptador Angular del balanceador: expone el nodo activo como signals y
 * entrega `apiUrl` como getter para que cada request se construya contra el
 * nodo vigente en ese instante. Un cambio de nodo nunca afecta al request que
 * ya está en vuelo.
 */
@Injectable({ providedIn: 'root' })
export class BackendEndpointService {
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<EndpointStatus>('checking');
  readonly activeName = signal('');
  readonly isFallback = signal(false);
  readonly nodeName = signal<string | null>(null);
  readonly failovers = signal(0);
  readonly lastCheckedAt = signal<number | null>(null);

  private readonly balancer = new EndpointBalancer(
    environment.apiEndpoints,
    probeEndpoint,
    {
      probeTimeoutMs: environment.probeTimeoutMs,
      coldStartTimeoutMs: environment.coldStartTimeoutMs,
      onChange: (snapshot) => this.apply(snapshot),
    },
  );

  constructor() {
    this.apply(this.balancer.snapshot());
  }

  /** URL base vigente; se lee en cada request. */
  get apiUrl(): string {
    return this.balancer.apiUrl;
  }

  /** Base conocida que encabeza una URL, o `null` si no pertenece a la API. */
  resolveBase(url: string): string | null {
    return this.balancer.resolveBase(url);
  }

  async initialize(): Promise<void> {
    await this.balancer.initialize();
    this.watchPrimary();
  }

  /**
   * Reacciona a un fallo de red/proxy. Devuelve la base contra la que se puede
   * reintentar una vez, o `null` si no hubo cambio de nodo.
   */
  async failover(failedBaseUrl: string): Promise<string | null> {
    // Otro request ya movió el nodo: reintentar contra el actual es seguro.
    if (this.balancer.apiUrl !== failedBaseUrl) return this.balancer.apiUrl;

    await this.balancer.handleFailure();
    const nextBaseUrl = this.balancer.apiUrl;
    return nextBaseUrl === failedBaseUrl ? null : nextBaseUrl;
  }

  /** Revisa el primario mientras se opera con el respaldo. Idempotente. */
  private watchPrimary(): void {
    if (this.balancer.endpoints.length < 2) return;

    timer(environment.primaryRecheckMs, environment.primaryRecheckMs)
      .pipe(
        filter(() => this.isFallback()),
        exhaustMap(() => from(this.balancer.recheckPrimary())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private apply(snapshot: EndpointSnapshot): void {
    this.status.set(snapshot.status);
    this.activeName.set(snapshot.activeName);
    this.isFallback.set(snapshot.isFallback);
    this.nodeName.set(snapshot.nodeName);
    this.failovers.set(snapshot.failovers);
    this.lastCheckedAt.set(snapshot.lastCheckedAt);
  }
}
