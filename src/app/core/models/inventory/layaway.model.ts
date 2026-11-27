export type LayawayStatus = "active" | "ready" | "completed" | "cancelled";
export type LayawayPaymentStatus = "pending" | "paid";
export type LayawayFrequency = "weekly" | "biweekly" | "monthly" | "custom";
export type LayawayHandoverMode = "pickup" | "delivery" | "immediate";
export type LayawayHandoverStatus = "pending" | "delivered";
export type LayawayPaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "nequi"
  | "daviplata"
  | "other";
export type LayawayCancellationPolicy = "refund_all" | "retain_percent" | "manual";
export type LayawayReturnCondition = "resellable" | "damaged" | "not_returned";

export interface LayawayItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}

export interface LayawayPayment {
  id: number;
  _id?: number;
  layawayId: number;
  type: "initial" | "installment";
  date: string;
  amount: number;
  method: LayawayPaymentMethod;
  reference?: string;
  notes?: string;
  employeeId?: number | null;
  employeeSnapshot?: { name?: string };
}

export interface LayawayDelivery {
  address: string;
  location?: { lat?: number | null; lng?: number | null };
  courierId?: number | null;
  courierSnapshot?: { name?: string };
}

export interface LayawaySettings {
  minInitialPercent: number;
  maxTermMonths: number;
  defaultFrequency: LayawayFrequency;
  cancellationPolicy: LayawayCancellationPolicy;
  retentionPercent: number;
  allowImmediateHandover: boolean;
}

export interface LayawaySummary {
  activeCount: number;
  activeBalance: number;
  overdueCount: number;
  overdueBalance: number;
  readyCount: number;
}

export interface Layaway {
  id: number;
  _id?: number;
  customerId: number;
  customerSnapshot: { name: string; document?: string; phone?: string; email?: string };
  items: LayawayItem[];
  total: number;
  initialPayment: number;
  paidAmount: number;
  balance: number;
  installmentAmount: number;
  frequency: LayawayFrequency;
  startDate: string;
  dueDate: string;
  nextDueDate?: string | null;
  status: LayawayStatus;
  paymentStatus: LayawayPaymentStatus;
  overdue: boolean;
  progressPercent: number;
  daysOverdue: number;
  handoverMode: LayawayHandoverMode;
  handoverStatus: LayawayHandoverStatus;
  deliveredAt?: string | null;
  delivery?: LayawayDelivery | null;
  saleId?: number | null;
  notes?: string;
  payments?: LayawayPayment[];
  cancellation?: {
    reason: string;
    note?: string;
    productReturned: boolean;
    returnCondition: LayawayReturnCondition;
    restock: boolean;
    refundAmount: number;
    refundMethod: LayawayPaymentMethod;
    retainedAmount: number;
    writeOffAmount: number;
  } | null;
}

export interface LayawayDraft {
  customerId: number;
  items: Array<{ productId: number; quantity: number; unitPrice?: number }>;
  initialPayment: number;
  initialPaymentMethod?: LayawayPaymentMethod;
  initialPaymentReference?: string;
  installmentAmount?: number;
  frequency: LayawayFrequency;
  dueDate: string;
  handoverMode: LayawayHandoverMode;
  delivery?: LayawayDelivery | null;
  notes?: string;
  employeeId?: number;
}

export interface LayawayPaymentDraft {
  amount: number;
  method: LayawayPaymentMethod;
  date?: string;
  reference?: string;
  notes?: string;
  employeeId?: number;
}

export interface LayawayCancelDraft {
  reason: string;
  note?: string;
  productReturned?: boolean;
  returnCondition?: LayawayReturnCondition;
  refundAmount?: number;
  refundMethod?: LayawayPaymentMethod;
}
