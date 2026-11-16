import type { InventoryDocumentItem } from "./document.model";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface InventoryLoyaltyRule {
  tier: LoyaltyTier;
  minSpent: number;
  minPurchases: number;
}

export interface InventoryContact {
  id?: number;
  _id?: number;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: string | null;
  loyaltyTier?: LoyaltyTier;
  stats?: {
    totalSpent?: number;
    purchaseCount?: number;
    firstPurchaseAt?: string | null;
    lastPurchaseAt?: string | null;
  };
}

export interface CustomerProfile {
  customer: InventoryContact;
  loyaltyRules: InventoryLoyaltyRule[];
  analytics: {
    totalOrders: number;
    cancelledOrders: number;
    paidOrders: number;
    deliveryOrders: number;
    onSiteOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    averageDaysBetweenPurchases: number | null;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  history: {
    data: Array<{
      id: number;
      date: string;
      total: number;
      items: InventoryDocumentItem[];
      employeeSnapshot?: { name?: string };
      paymentStatus?: "paid" | "pending";
      orderStatus?: string | null;
      kitchenStatus?: string | null;
      tableNumber?: string;
      status?: "completed" | "void";
      voidReason?: string;
      voidNote?: string;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}
