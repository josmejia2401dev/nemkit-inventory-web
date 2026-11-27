export type EmployeeRole =
  | "admin"
  | "cashier"
  | "seller"
  | "courier";

export type DocumentType = "CC" | "CE" | "NIT" | "PAS" | "TI";

export interface InventoryEmployee {
  id?: number;
  _id?: number;
  name: string;
  documentType?: DocumentType;
  documentNumber?: string;
  phone?: string;
  email?: string;
  role: EmployeeRole;
  hireDate?: string;
  status?: "active" | "inactive";
  photo?: { url?: string; storageKey?: string };
  linkedUserId?: number | null;
}
