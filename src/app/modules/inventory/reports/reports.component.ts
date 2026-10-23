import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import * as XLSX from "xlsx";
import {
  InventoryProduct,
  InventoryReportMovement,
  InventoryReportProduct,
  InventorySalesByEmployeeReport,
  InventorySalesReport,
  InventoryService,
  PageResult,
} from "../../../core/services/inventory.service";
import { formatCurrency } from "../../../shared/utils/currency.util";

type ReportKind = "inventory" | "movements" | "sales" | "employees";
interface InventoryReport {
  generatedAt: string;
  totals: { productCount: number; units: number; inventoryCost: number; potentialSales: number };
  items: InventoryReportProduct[];
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Compra",
  manual_adjustment: "Ajuste manual",
  sale: "Venta",
  damage: "Daño",
  loss: "Pérdida",
  internal_use: "Consumo interno",
};

@Component({
  selector: "app-inventory-reports",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./reports.component.html",
})
export class ReportsComponent implements OnInit {
  private inventory = inject(InventoryService);

  kind: ReportKind = "inventory";
  loading = signal(false);
  inventoryReport = signal<InventoryReport | null>(null);
  movements = signal<InventoryReportMovement[]>([]);
  salesReport = signal<InventorySalesReport | null>(null);
  employeesReport = signal<InventorySalesByEmployeeReport | null>(null);
  products = signal<InventoryProduct[]>([]);
  page = signal(1);
  pageCount = signal(1);
  movementCount = signal(0);
  dateError = signal(false);
  from = this.localDate(-29);
  to = this.localDate(0);
  groupBy: "day" | "week" | "month" = "day";
  movementType = "";
  productId = "";
  productSearch = "";

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
    this.load();
  }

  load(): void {
    if (this.kind === "inventory") {
      this.loading.set(true);
      this.inventory.get<InventoryReport>("/reports/inventory").subscribe({
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
      this.inventory.list<InventoryReportMovement>("/reports/movements", {
        ...range,
        page: this.page(),
        limit: 100,
        type: this.movementType || undefined,
        productId: this.productId || undefined,
      }).subscribe({
        next: (response: PageResult<InventoryReportMovement>) => {
          this.movements.set(response.data ?? []);
          this.movementCount.set(response.pagination?.total ?? response.data.length);
          this.pageCount.set(response.pagination?.totalPages ?? 1);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    if (this.kind === "employees") {
      this.inventory.get<InventorySalesByEmployeeReport>("/reports/sales-by-employee", {
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

    this.inventory.get<InventorySalesReport>("/reports/sales", {
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

  changePage(direction: -1 | 1): void {
    const nextPage = this.page() + direction;
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
