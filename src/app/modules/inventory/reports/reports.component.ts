import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import * as XLSX from "xlsx";
import {
  InventoryProduct,
  InventoryCancelledSalesReport,
  InventoryReportMovement,
  InventoryReportProduct,
  InventorySalesByEmployeeReport,
  InventorySalesReport,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";
import { formatCurrency } from "../../../shared/utils/currency.util";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

type ReportKind = "inventory" | "movements" | "sales" | "employees" | "cancellations";
interface InventoryReport {
  generatedAt: string;
  totals: { productCount: number; units: number; inventoryCost: number; potentialSales: number };
  items: InventoryReportProduct[];
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Compra",
  manual_adjustment: "Ajuste manual",
  sale: "Venta",
  sale_void: "Anulación de venta",
  damage: "Daño",
  loss: "Pérdida",
  internal_use: "Consumo interno",
};

@Component({
  selector: "app-inventory-reports",
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: "./reports.component.html",
  styleUrl: "./reports.component.css",
})
export class ReportsComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);

  kind: ReportKind = "inventory";
  loading = signal(false);
  inventoryReport = signal<InventoryReport | null>(null);
  movements = signal<InventoryReportMovement[]>([]);
  salesReport = signal<InventorySalesReport | null>(null);
  employeesReport = signal<InventorySalesByEmployeeReport | null>(null);
  cancellationsReport = signal<InventoryCancelledSalesReport | null>(null);
  products = signal<InventoryProduct[]>([]);
  page = signal(1);
  pageCount = signal(1);
  movementCount = signal(0);
  movementError = signal(false);
  cancellationError = signal(false);
  inventoryPage = signal(1);
  salesPage = signal(1);
  employeesPage = signal(1);
  dateError = signal(false);
  from = this.localDate(-364);
  to = this.localDate(0);
  groupBy: "day" | "week" | "month" = "day";
  movementType = "";
  productId = "";
  productSearch = "";
  periodPreset = "custom";

  ngOnInit(): void {
    this.searchProducts();
    this.load();
  }

  searchProducts(): void {
    this.inventory.list<InventoryProduct>("/products", {
      limit: 100,
      status: "active",
      search: this.productSearch.trim() || undefined,
    }).subscribe({
      next: (response) => {
        const selected = this.products().find((product) => (product.id ?? product._id) === Number(this.productId));
        const productsById = new Map<number, InventoryProduct>();
        for (const product of [selected, ...(response.data ?? [])]) {
          if (product) productsById.set(product.id ?? product._id ?? 0, product);
        }
        this.products.set([...productsById.values()]);
      },
    });
  }

  selectReport(kind: ReportKind): void {
    this.kind = kind;
    this.page.set(1);
    this.inventoryPage.set(1);
    this.salesPage.set(1);
    this.employeesPage.set(1);
    this.cancellationsReport.set(null);
    this.load();
  }

  setPeriodPreset(preset: string): void {
    this.periodPreset = preset;
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let start = currentMonthStart;
    let end = currentMonthEnd;

    if (preset === "this-week" || preset === "last-week") {
      const mondayOffset = (today.getDay() + 6) % 7;
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
      if (preset === "last-week") start.setDate(start.getDate() - 7);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    } else if (preset === "previous-month") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === "first-half") {
      start = currentMonthStart;
      end = new Date(today.getFullYear(), today.getMonth(), 15);
    } else if (preset === "second-half") {
      start = new Date(today.getFullYear(), today.getMonth(), 16);
      end = currentMonthEnd;
    }

    this.from = this.dateString(start);
    this.to = this.dateString(end);
  }

  inventoryItems(items: InventoryReportProduct[]): InventoryReportProduct[] {
    const start = (this.inventoryPage() - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  salesPeriods(periods: InventorySalesReport["periods"]): InventorySalesReport["periods"] {
    const start = (this.salesPage() - 1) * this.pageSize;
    return periods.slice(start, start + this.pageSize);
  }

  employeesRows(rows: InventorySalesByEmployeeReport["employees"]): InventorySalesByEmployeeReport["employees"] {
    const start = (this.employeesPage() - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  setInventoryPage(page: number, total: number): void {
    if (page < 1 || page > Math.max(1, Math.ceil(total / this.pageSize))) return;
    this.inventoryPage.set(page);
  }

  setSalesPage(page: number, total: number): void {
    if (page < 1 || page > Math.max(1, Math.ceil(total / this.pageSize))) return;
    this.salesPage.set(page);
  }

  setEmployeesPage(page: number, total: number): void {
    if (page < 1 || page > Math.max(1, Math.ceil(total / this.pageSize))) return;
    this.employeesPage.set(page);
  }

  load(): void {
    if (this.kind === "inventory") {
      this.loading.set(true);
      this.inventory.get<InventoryReport>("/statistics/reports/inventory").subscribe({
        next: (response) => {
          this.inventoryReport.set(response.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    if (!this.validDates()) {
      this.dateError.set(true);
      return;
    }
    this.dateError.set(false);
    this.loading.set(true);
    const range = { from: this.from, to: this.to };
    if (this.kind === "movements") {
      this.movementError.set(false);
      this.inventory.list<InventoryReportMovement>("/statistics/reports/movements", {
        ...range,
        page: this.page(),
        limit: this.pageSize,
        type: this.movementType || undefined,
        productId: this.productId || undefined,
      }).subscribe({
        next: (response: PageResult<InventoryReportMovement>) => {
          const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          if (this.page() > totalPages) {
            this.page.set(totalPages);
            this.load();
            return;
          }
          this.movements.set(response.data ?? []);
          this.movementCount.set(response.pagination?.total ?? response.data.length);
          this.pageCount.set(totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.movementError.set(true);
          this.loading.set(false);
        },
      });
      return;
    }

    if (this.kind === "employees") {
      this.inventory.get<InventorySalesByEmployeeReport>("/statistics/employees/sales", {
        ...range,
      }).subscribe({
        next: (response) => {
          this.employeesReport.set(response.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    if (this.kind === "cancellations") {
      this.cancellationError.set(false);
      this.inventory.get<InventoryCancelledSalesReport>("/statistics/reports/cancelled-sales", {
        ...range,
        page: this.page(),
        limit: this.pageSize,
      }).subscribe({
        next: (response) => {
          const report = response.data;
          const totalPages = Math.max(1, report.pagination?.totalPages ?? 1);
          if (this.page() > totalPages) {
            this.page.set(totalPages);
            this.load();
            return;
          }
          this.cancellationsReport.set(report);
          this.movementCount.set(report.pagination?.total ?? report.cancellations.length);
          this.pageCount.set(totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.cancellationError.set(true);
          this.loading.set(false);
        },
      });
      return;
    }

    this.inventory.get<InventorySalesReport>("/statistics/reports/sales", {
      ...range,
      groupBy: this.groupBy,
    }).subscribe({
      next: (response) => {
        this.salesReport.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pageCount()) return;
    this.page.set(nextPage);
    this.load();
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  movementLabel(type: string): string {
    return MOVEMENT_LABELS[type] ?? type;
  }

  cancellationReason(reason: string | undefined): string {
    const labels: Record<string, string> = {
      customer_left: "Cliente se retiró",
      order_error: "Error al tomar el pedido",
      out_of_stock: "Sin insumos o stock",
      customer_changed: "Cliente cambió de opinión",
      other: "Otro",
    };
    return reason ? labels[reason] ?? reason : "Sin motivo registrado";
  }

  movementQuantity(movement: InventoryReportMovement): number {
    return movement.items.reduce((total, item) => total + item.quantity, 0);
  }

  exportInventoryExcel(): void {
    const report = this.inventoryReport();
    if (!report) return;
    const rows = report.items.map((item) => ({
      SKU: item.sku,
      Producto: item.name,
      Categoría: item.categoryName,
      Estado: item.status === "active" ? "Activo" : "Inactivo",
      Existencias: item.stock,
      "Stock mínimo": item.minimumStock,
      "Costo unitario": item.purchasePrice,
      "Precio de venta": item.salePrice,
      "Valor al costo": item.inventoryCost,
      "Venta potencial": item.potentialSales,
    }));
    rows.push({
      SKU: "TOTALES",
      Producto: "",
      Categoría: "",
      Estado: "",
      Existencias: report.totals.units,
      "Stock mínimo": 0,
      "Costo unitario": 0,
      "Precio de venta": 0,
      "Valor al costo": report.totals.inventoryCost,
      "Venta potencial": report.totals.potentialSales,
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 18 }, { wch: 32 }, { wch: 24 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, `inventario-${this.to}.xlsx`);
  }

  exportEmployeesExcel(): void {
    const report = this.employeesReport();
    if (!report) return;
    const rows = report.employees.map((employee) => ({
      Empleado: employee.employeeName,
      Ventas: employee.salesCount,
      "Unidades vendidas": employee.unitsSold,
      "Valor vendido": employee.revenue,
      "Pendiente por cobrar": employee.pendingValue,
      "Recaudado en el período": employee.collectedInPeriod,
      Cancelaciones: employee.cancellationCount,
      "Valor cancelado": employee.cancelledValue,
      "Utilidad bruta estimada": employee.grossProfit,
      "Pagos registrados": employee.paymentCount,
      "Total pagado al empleado": employee.paymentsMade,
    }));
    rows.push({
      Empleado: "TOTALES",
      Ventas: report.totals.salesCount,
      "Unidades vendidas": report.totals.unitsSold,
      "Valor vendido": report.totals.revenue,
      "Pendiente por cobrar": report.totals.pendingValue,
      "Recaudado en el período": report.totals.collectedInPeriod,
      Cancelaciones: report.totals.cancellationCount,
      "Valor cancelado": report.totals.cancelledValue,
      "Utilidad bruta estimada": report.totals.grossProfit,
      "Pagos registrados": report.totals.paymentCount,
      "Total pagado al empleado": report.totals.paymentsMade,
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 25 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas y pagos");
    XLSX.writeFile(workbook, `ventas-pagos-empleados-${this.from}-${this.to}.xlsx`);
  }

  exportInventoryPdf(): void {
    const report = this.inventoryReport();
    if (!report) return;
    const popup = window.open("", "_blank");
    if (!popup) return;
    const rows = report.items.map((item) => `
      <tr><td>${this.escapeHtml(item.sku)}</td><td>${this.escapeHtml(item.name)}</td>
      <td>${this.escapeHtml(item.categoryName)}</td><td>${item.stock}</td>
      <td>${item.minimumStock}</td><td>${this.formatMoney(item.purchasePrice)}</td>
      <td>${this.formatMoney(item.salePrice)}</td><td>${this.formatMoney(item.inventoryCost)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Inventario actual</title>
      <style>@page{size:landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#24382d}h1{font-size:22px;margin:0 0 6px}p{color:#64756a;margin:0 0 18px}.totals{display:flex;gap:24px;margin-bottom:16px}.totals b{display:block;margin-top:4px}table{width:100%;border-collapse:collapse}th,td{padding:7px 6px;border-bottom:1px solid #dce4dc;text-align:left;font-size:10px}th{background:#edf3ed;text-transform:uppercase;font-size:9px}td:nth-child(n+4){text-align:right;white-space:nowrap}tr{break-inside:avoid}</style>
      </head><body><h1>Inventario actual</h1><p>Generado ${new Date(report.generatedAt).toLocaleString("es-CO")}</p>
      <div class="totals"><span>Productos<b>${report.totals.productCount}</b></span><span>Unidades<b>${report.totals.units}</b></span><span>Valor al costo<b>${this.formatMoney(report.totals.inventoryCost)}</b></span><span>Venta potencial<b>${this.formatMoney(report.totals.potentialSales)}</b></span></div>
      <table><thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th>Costo unitario</th><th>Precio venta</th><th>Valor al costo</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
  }

  private validDates(): boolean {
    return Boolean(this.from && this.to && this.from <= this.to);
  }

  private localDate(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  private dateString(date: Date): string {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character] ?? character);
  }
}
