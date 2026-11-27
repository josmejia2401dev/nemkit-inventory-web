export const ORDER_STATUS_LABELS = Object.freeze({
  pending: "Pendiente",
  on_route: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
} as const);

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS;
export type DeliveryStatus = OrderStatus;
