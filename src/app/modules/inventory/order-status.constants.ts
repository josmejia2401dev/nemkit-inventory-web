export const ORDER_STATUS_LABELS = Object.freeze({
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Listo",
  on_route: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
} as const);

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS;
export type KitchenStatus = Extract<OrderStatus, "pending" | "preparing" | "ready">;
export type DeliveryStatus = OrderStatus;
