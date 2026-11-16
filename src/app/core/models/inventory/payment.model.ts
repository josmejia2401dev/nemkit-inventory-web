export interface InventoryEmployeePayment {
  id: number;
  employeeId: number;
  employeeSnapshot: { name: string; documentType?: string; documentNumber?: string };
  paymentDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  type: "salary" | "advance" | "commission" | "bonus" | "other";
  amount: number;
  method: "cash" | "bank_transfer" | "other";
  reference?: string;
  notes?: string;
  recordedBySnapshot?: { name?: string };
}

export interface InventoryEmployeePaymentSummary {
  generatedAt: string;
  totals: { employeeCount: number; paymentCount: number; totalPaid: number };
  employees: Array<{ employeeId: number; employeeName: string; paymentCount: number; totalPaid: number }>;
}
