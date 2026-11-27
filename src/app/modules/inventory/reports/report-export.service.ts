import { Injectable } from "@angular/core";
import * as XLSX from "xlsx";
import type { InventorySalesByEmployeeReport } from "../../../core/models/inventory";
import { formatCurrency } from "@nemkit/foundation-web";
import type { InventoryReport } from "./report.types";

/** Exportación de reportes a Excel y a PDF (impresión del navegador). */
@Injectable({ providedIn: "root" })
export class ReportExportService {
  inventoryExcel(report: InventoryReport, to: string): void {
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
    XLSX.writeFile(workbook, `inventario-${to}.xlsx`);
  }

  employeesExcel(report: InventorySalesByEmployeeReport, from: string, to: string): void {
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
      { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 22 },
      { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 25 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas y pagos");
    XLSX.writeFile(workbook, `ventas-pagos-empleados-${from}-${to}.xlsx`);
  }

  inventoryPdf(report: InventoryReport): void {
    const popup = window.open("", "_blank");
    if (!popup) return;

    const rows = report.items
      .map(
        (item) => `
      <tr><td>${this.escapeHtml(item.sku)}</td><td>${this.escapeHtml(item.name)}</td>
      <td>${this.escapeHtml(item.categoryName)}</td><td>${item.stock}</td>
      <td>${item.minimumStock}</td><td>${formatCurrency(item.purchasePrice)}</td>
      <td>${formatCurrency(item.salePrice)}</td><td>${formatCurrency(item.inventoryCost)}</td></tr>`,
      )
      .join("");

    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Inventario actual</title>
      <style>@page{size:landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#24382d}h1{font-size:22px;margin:0 0 6px}p{color:#64756a;margin:0 0 18px}.totals{display:flex;gap:24px;margin-bottom:16px}.totals b{display:block;margin-top:4px}table{width:100%;border-collapse:collapse}th,td{padding:7px 6px;border-bottom:1px solid #dce4dc;text-align:left;font-size:10px}th{background:#edf3ed;text-transform:uppercase;font-size:9px}td:nth-child(n+4){text-align:right;white-space:nowrap}tr{break-inside:avoid}</style>
      </head><body><h1>Inventario actual</h1><p>Generado ${new Date(report.generatedAt).toLocaleString("es-CO")}</p>
      <div class="totals"><span>Productos<b>${report.totals.productCount}</b></span><span>Unidades<b>${report.totals.units}</b></span><span>Valor al costo<b>${formatCurrency(report.totals.inventoryCost)}</b></span><span>Venta potencial<b>${formatCurrency(report.totals.potentialSales)}</b></span></div>
      <table><thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th>Costo unitario</th><th>Precio venta</th><th>Valor al costo</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
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
