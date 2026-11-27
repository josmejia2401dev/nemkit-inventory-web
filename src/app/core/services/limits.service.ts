import { Injectable, inject, signal } from "@angular/core";
import { Observable, map, of, tap } from "rxjs";
import { InventoryService } from "./inventory.service";

export type LimitKey = "employees" | "products" | "contacts";
export type LimitPeriod = "total" | "month";

export interface LimitStatus {
  max: number;
  used: number;
  remaining: number;
  period: LimitPeriod;
}

export interface PlanInfo {
  code: string;
  name: string;
  price: number;
  currency: string;
}

export interface PlanCatalogEntry extends PlanInfo {
  limits: Record<string, { max: number; period: LimitPeriod }>;
}

export interface LimitUsage {
  plan: PlanInfo;
  period: string;
  limits: Record<string, LimitStatus>;
}

@Injectable({ providedIn: "root" })
export class LimitsService {
  private inventory = inject(InventoryService);

  readonly usage = signal<LimitUsage | null>(null);
  readonly plans = signal<PlanCatalogEntry[]>([]);

  /**
   * Consulta los límites del tenant. Sin `force` reutiliza la caché en memoria;
   * tras crear un registro conviene refrescar con `load(true)`.
   */
  load(force = false): Observable<LimitUsage> {
    const cached = this.usage();
    if (cached && !force) return of(cached);

    return this.inventory
      .get<LimitUsage>("/foundation/limits")
      .pipe(
        map((response) => response.data),
        tap((usage) => this.usage.set(usage)),
      );
  }

  /** Catálogo de planes disponibles; precio y límites vienen del backend. */
  loadPlans(force = false): Observable<PlanCatalogEntry[]> {
    const cached = this.plans();
    if (cached.length && !force) return of(cached);

    return this.inventory
      .get<PlanCatalogEntry[]>("/foundation/limits/plans")
      .pipe(
        map((response) => response.data ?? []),
        tap((plans) => this.plans.set(plans)),
      );
  }

  status(key: LimitKey): LimitStatus | null {
    return this.usage()?.limits[key] ?? null;
  }

  canCreate(key: LimitKey): boolean {
    const status = this.status(key);
    return status ? status.remaining > 0 : true;
  }

  /** Limpia la caché al cerrar sesión para no filtrar datos entre cuentas. */
  clear(): void {
    this.usage.set(null);
    this.plans.set([]);
  }
}
