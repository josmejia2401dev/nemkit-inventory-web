/** Motivos de cancelación de un pedido (deben coincidir con el backend). */
export type CancelReason =
  | "customer_left"
  | "order_error"
  | "out_of_stock"
  | "customer_changed"
  | "other";

export const CANCEL_REASONS: Array<{ value: CancelReason; label: string }> = [
  { value: "customer_left", label: "El cliente abandonó el lugar" },
  { value: "order_error", label: "Error al tomar el pedido" },
  { value: "out_of_stock", label: "Sin insumos para prepararlo" },
  { value: "customer_changed", label: "El cliente cambió de opinión" },
  { value: "other", label: "Otro motivo" },
];

export function cancelReasonLabel(value: string | undefined | null): string {
  return CANCEL_REASONS.find((r) => r.value === value)?.label ?? "";
}
