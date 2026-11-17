import { Component, DestroyRef, inject, Input, OnInit, signal } from "@angular/core";
import { InventoryDocument, InventoryService } from "../../../../core/services/inventory.service";
import { NotificationService } from "../../../../core/services/notification.service";
import { ConfirmService } from "../../../../core/services/confirm.service";
import { AuthStore } from "../../../../core/store/auth.store";
import { BarcodeDispatcherService } from "../../../../core/barcode/barcode-dispatcher.service";
import { BarcodeScan } from "../../../../core/barcode/barcode.types";
import { EMPTY_SCAN, ScanRequest, nextScan } from "../../../../shared/barcode/scan-request";
import { DEFAULT_PAGE_SIZE } from "../../../../shared/components/pagination/pagination.component";
import {
  CancelOrderDialogComponent,
  CancelOrderResult,
} from "../../../../shared/components/cancel-order-dialog/cancel-order-dialog.component";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { ORDER_STATUS_LABELS } from "../../order-status.constants";
import { DocumentAdvanceEvent, DocumentListComponent } from "../document-list/document-list.component";
import { DocumentDraftFormComponent } from "../document-draft-form/document-draft-form.component";
import { DocumentReceiptComponent } from "../document-receipt/document-receipt.component";
import type { DocumentKind } from "../document.types";

@Component({
  selector: "app-inventory-documents",
  standalone: true,
  imports: [
    DocumentListComponent,
    DocumentDraftFormComponent,
    DocumentReceiptComponent,
    CancelOrderDialogComponent,
  ],
  templateUrl: "./document-workbench.component.html",
  styleUrls: ["./document-workbench.component.css"],
})
export class DocumentWorkbenchComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private readonly inventory = inject(InventoryService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly store = inject(AuthStore);
  private readonly barcodeDispatcher = inject(BarcodeDispatcherService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) kind!: DocumentKind;
  readonly documents = signal<InventoryDocument[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly pageCount = signal(1);
  readonly documentCount = signal(0);
  readonly saving = signal(false);
  readonly dialogOpen = signal(false);
  readonly previewDocument = signal<InventoryDocument | null>(null);
  readonly cancellingDocument = signal<InventoryDocument | null>(null);
  readonly scanRequest = signal<ScanRequest>(EMPTY_SCAN);

  /** Modo restaurante: habilita el campo de mesa en la venta. */
  get isRestaurant(): boolean {
    return this.store.company()?.businessType === "restaurant";
  }

  get isSale(): boolean {
    return this.kind === "sales";
  }

  get canRegisterPayment(): boolean {
    const roles = this.store.user()?.roles ?? [];
    return roles.includes("ADMIN") || roles.includes("SELLER");
  }

  get title(): string {
    return this.isSale ? "Ventas" : "Compras";
  }

  get singular(): string {
    return this.isSale ? "venta" : "compra";
  }

  get contactLabel(): string {
    return this.isSale ? "Cliente" : "Proveedor";
  }

  get employeeLabel(): string {
    return this.isSale ? "Vendedor" : "Quién recibe";
  }

  get canAdvanceOnSiteOrders(): boolean {
    if (this.isRestaurant || !this.isSale) return false;
    const roles = this.store.user()?.roles ?? [];
    return roles.includes("ADMIN") || roles.includes("SELLER");
  }

  ngOnInit(): void {
    const unregister = this.barcodeDispatcher.register((scan) => this.onBarcodeScan(scan));
    this.destroyRef.onDestroy(unregister);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.inventory.list<InventoryDocument>(`/${this.kind}`, {
      page: this.page(),
      limit: this.pageSize,
    }).subscribe({
      next: (response) => {
        const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
        this.documents.set(response.data ?? []);
        this.pageCount.set(totalPages);
        this.documentCount.set(response.pagination?.total ?? response.data.length);
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

  private onBarcodeScan(scan: BarcodeScan): void {
    this.applyBarcode(scan.code);
  }

  /** Abre la hoja de registro (si hace falta) y le reenvía el código escaneado. */
  applyBarcode(code: string): void {
    const value = code.trim();
    if (!value) return;
    if (!this.dialogOpen()) {
      this.scanRequest.set(EMPTY_SCAN);
      this.dialogOpen.set(true);
    }
    this.scanRequest.update((current) => nextScan(current, value));
  }

  openCreate(): void {
    this.scanRequest.set(EMPTY_SCAN);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  advanceOnSiteOrder({ document, orderStatus }: DocumentAdvanceEvent): void {
    this.inventory.put(`/sales/${document.id || document._id}/status`, { orderStatus }).subscribe({
      next: () => {
        this.notifications.success(`Pedido #${document.id || document._id}`, `Estado actualizado: ${ORDER_STATUS_LABELS[orderStatus]}.`);
        this.load();
      },
      error: (err) => this.notifications.error("No se pudo actualizar", err?.error?.message || "Intenta nuevamente."),
    });
  }

  openDocument(document: InventoryDocument): void {
    this.previewDocument.set(document);
  }

  closeDocument(): void {
    this.previewDocument.set(null);
  }

  /** Registra el cobro de una venta pendiente. */
  async pay(document: InventoryDocument): Promise<void> {
    if (!this.canRegisterPayment) return;
    const ok = await this.confirm.ask({
      title: "Cobrar venta",
      message: `¿Registrar el cobro de la venta #${document.id || document._id} por ${this.formatMoney(document.total)}?`,
      confirmLabel: "Cobrar",
      cancelLabel: "Volver",
      severity: "info",
    });
    if (!ok) return;
    this.inventory.put<InventoryDocument>(`/sales/${document.id || document._id}/pay`, {}).subscribe({
      next: () => {
        this.notifications.success("Venta cobrada", "El pago quedó registrado.");
        this.load();
      },
    });
  }

  openCancel(document: InventoryDocument): void {
    this.cancellingDocument.set(document);
  }

  confirmCancel(result: CancelOrderResult): void {
    const document = this.cancellingDocument();
    if (!document) return;
    this.inventory.put<InventoryDocument>(`/sales/${document.id || document._id}/cancel`, result).subscribe({
      next: () => {
        this.notifications.success("Pedido cancelado", "El pedido quedó cancelado y el stock se repuso.");
        this.cancellingDocument.set(null);
        this.load();
      },
      error: (err) => {
        const detail = err?.error?.message || "No se pudo cancelar el pedido.";
        this.notifications.error("No se pudo cancelar", detail);
      },
    });
  }

  save(body: Record<string, unknown>): void {
    this.saving.set(true);
    this.inventory.post<InventoryDocument>(`/${this.kind}`, body).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.previewDocument.set(response.data);
        this.notifications.success(this.isSale ? "Venta registrada" : "Compra registrada", "Las existencias se actualizaron correctamente.");
        this.page.set(1);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }
}
