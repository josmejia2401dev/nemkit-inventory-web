import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { InventoryService, PageResult } from "./inventory.service";

export type CashWithdrawalReason =
  | "owner_withdrawal"
  | "petty_cash"
  | "operating_expense"
  | "other";

export type CashWithdrawalMethod = "cash" | "transfer" | "other";

export interface CashWithdrawal {
  id: number;
  date: string;
  amount: number;
  reason: CashWithdrawalReason;
  beneficiary: string;
  method: CashWithdrawalMethod;
  reference: string;
  notes: string;
  recordedById?: number;
  recordedBySnapshot?: { name?: string };
  createdAt?: string;
}

export interface CashWithdrawalSummary {
  totals: { count: number; total: number; average: number };
  byReason: Array<{
    reason: CashWithdrawalReason;
    label: string;
    count: number;
    total: number;
  }>;
}

export interface CashFlowReport {
  range: { from: string; to: string };
  inflows: {
    sales: number;
    salesCount: number;
    layawayPayments: number;
    layawayPaymentsCount: number;
    total: number;
  };
  outflows: {
    purchases: number;
    purchasesCount: number;
    withdrawals: number;
    withdrawalsCount: number;
    layawayRefunds: number;
    layawayRefundsCount: number;
    total: number;
  };
  net: number;
  withdrawalsByReason: Array<{
    reason: CashWithdrawalReason;
    label: string;
    count: number;
    total: number;
  }>;
}

export interface CashWithdrawalFilters {
  from?: string;
  to?: string;
  reason?: CashWithdrawalReason | "";
  page?: number;
  limit?: number;
}

export interface CashWithdrawalPayload {
  date: string;
  amount: number;
  reason: CashWithdrawalReason;
  beneficiary?: string;
  method?: CashWithdrawalMethod;
  reference?: string;
  notes?: string;
}

export const CASH_WITHDRAWAL_REASONS: Array<{
  value: CashWithdrawalReason;
  label: string;
}> = [
  { value: "owner_withdrawal", label: "Retiro del dueño" },
  { value: "petty_cash", label: "Caja menor" },
  { value: "operating_expense", label: "Gasto operativo" },
  { value: "other", label: "Otro" },
];

export const CASH_WITHDRAWAL_METHODS: Array<{
  value: CashWithdrawalMethod;
  label: string;
}> = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
];

/**
 * Puente tipado hacia el dominio de retiros de caja. Mantiene la lógica de
 * URLs fuera del componente y no engorda InventoryService.
 */
@Injectable({ providedIn: "root" })
export class CashWithdrawalsService {
  private readonly inventory = inject(InventoryService);

  list(filters: CashWithdrawalFilters): Observable<PageResult<CashWithdrawal>> {
    return this.inventory.list<CashWithdrawal>("/cash-withdrawals", {
      from: filters.from,
      to: filters.to,
      reason: filters.reason || undefined,
      page: filters.page,
      limit: filters.limit,
    });
  }

  summary(from: string, to: string): Observable<{ success: boolean; data: CashWithdrawalSummary }> {
    return this.inventory.get<CashWithdrawalSummary>("/cash-withdrawals/summary", { from, to });
  }

  create(payload: CashWithdrawalPayload): Observable<{ success: boolean; data: CashWithdrawal }> {
    return this.inventory.post<CashWithdrawal>("/cash-withdrawals", payload);
  }

  remove(id: number): Observable<{ success: boolean; data: unknown }> {
    return this.inventory.delete(`/cash-withdrawals/${id}`);
  }
}
