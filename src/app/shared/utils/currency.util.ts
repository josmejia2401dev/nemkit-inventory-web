const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null | undefined): string {
  return COP_FORMATTER.format(Number.isFinite(value) ? Number(value) : 0);
}
