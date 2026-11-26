import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";
import {
  Layaway,
  LayawayAuthorizationResult,
  LayawayCancelDraft,
  LayawayDraft,
  LayawayPaymentDraft,
  LayawaySettings,
  LayawaySummary,
} from "../../../core/models/inventory";

export interface LayawayQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: number;
  overdue?: boolean;
}

type ApiResponse<T> = Observable<{ success: boolean; data: T }>;
type LayawayPage = PageResult<Layaway> & {
  metadata?: { summary?: LayawaySummary; pagination?: PageResult<Layaway>["pagination"] };
};

/** Rutas del módulo Plan separe; los componentes no conocen endpoints. */
@Injectable({ providedIn: "root" })
export class LayawaysApi {
  private readonly inventory = inject(InventoryService);

  list(query: LayawayQuery = {}): Observable<LayawayPage> {
    return this.inventory.list<Layaway>("/layaways", {
      page: query.page,
      limit: query.limit,
      search: query.search?.trim() || undefined,
      status: query.status || undefined,
      customerId: query.customerId,
      overdue: query.overdue ? "true" : undefined,
    }) as Observable<LayawayPage>;
  }

  get(id: number): ApiResponse<Layaway> {
    return this.inventory.get<Layaway>(`/layaways/${id}`);
  }

  create(body: LayawayDraft): ApiResponse<Layaway> {
    return this.inventory.post<Layaway>("/layaways", body);
  }

  update(id: number, body: Partial<LayawayDraft>): ApiResponse<Layaway> {
    return this.inventory.put<Layaway>(`/layaways/${id}`, body);
  }

  addPayment(id: number, body: LayawayPaymentDraft): ApiResponse<Layaway> {
    return this.inventory.post<Layaway>(`/layaways/${id}/payments`, body);
  }

  deliver(id: number, body: { date?: string; notes?: string } = {}): ApiResponse<Layaway> {
    return this.inventory.post<Layaway>(`/layaways/${id}/deliver`, body);
  }

  cancel(id: number, body: LayawayCancelDraft): ApiResponse<Layaway> {
    return this.inventory.post<Layaway>(`/layaways/${id}/cancel`, body);
  }

  authorize(body: {
    adminEmail: string;
    adminPassword: string;
    customerId: number;
    total: number;
    reason?: string;
  }): ApiResponse<LayawayAuthorizationResult> {
    return this.inventory.post<LayawayAuthorizationResult>("/layaways/authorizations", body);
  }

  settings(): ApiResponse<LayawaySettings> {
    return this.inventory.get<LayawaySettings>("/layaways/settings");
  }

  updateSettings(body: Partial<LayawaySettings>): ApiResponse<LayawaySettings> {
    return this.inventory.put<LayawaySettings>("/layaways/settings", body);
  }
}
