import type { DeliveryStatus, KitchenStatus, OrderStatus } from "../../../modules/inventory/order-status.constants";
import type { InventoryContact } from "./contact.model";

export interface InventoryDelivery {
  id: number;
  _id?: number;
  saleId?: number | null;
  // Restaurante: el pedido pasa por cocina (solo se recoge cuando está "listo").
  fromKitchen?: boolean;
  customerId: number;
  customerSnapshot: { name: string; phone?: string };
  address: string;
  location?: { lat?: number | null; lng?: number | null };
  items: Array<{
    productId: number;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
  notes?: string;
  status: DeliveryStatus;
  courierId?: number | null;
  courierSnapshot?: { name?: string };
  timeline?: {
    readyAt?: string | null;
    pickedUpAt?: string | null;
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
    cancelledAt?: string | null;
  };
  proof?: {
    photo?: { url?: string };
    signature?: { url?: string };
    observation?: string;
  };
  createdAt?: string;
}

export interface InventoryDocumentItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
  lineTotal: number;
}

export interface InventoryDocument {
  id: number;
  _id?: number;
  supplierId?: number;
  supplierSnapshot?: InventoryContact;
  customerId?: number | null;
  customerSnapshot?: InventoryContact;
  employeeId?: number | null;
  employeeSnapshot?: { name?: string };
  movementId: number;
  date: string;
  status: "completed" | "void";
  orderStatus?: OrderStatus | "served" | "picked_up" | null;
  orderChannel?: "delivery" | "on_site";
  deliveryStatus?: DeliveryStatus;
  deliveryCourierName?: string;
  // Estado de cobro de la venta: "paid" (pagada) o "pending" (por cobrar).
  paymentStatus?: "paid" | "pending";
  paidAt?: string | null;
  // Cancelación: motivo (código) y nota libre.
  voidReason?: string;
  voidNote?: string;
  voidedAt?: string | null;
  kitchenStatus?: KitchenStatus | "served" | null;
  tableNumber?: string;
  notes?: string;
  items: InventoryDocumentItem[];
  total: number;
}
