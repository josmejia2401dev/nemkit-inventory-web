import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, Input, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  CustomerProfile,
  InventoryContact,
  InventoryDocument,
  InventoryEmployee,
  InventoryProduct,
  InventoryService,
} from "../../../../core/services/inventory.service";
import { NotificationService } from "../../../../core/services/notification.service";
import { ConfirmService } from "../../../../core/services/confirm.service";
import { AuthStore } from "../../../../core/store/auth.store";
import { LimitsService } from "../../../../core/services/limits.service";
import { BarcodeDispatcherService } from "../../../../core/barcode/barcode-dispatcher.service";
import { BarcodeScan } from "../../../../core/barcode/barcode.types";
import { BarcodeScanToolsComponent } from "../../../../shared/barcode/barcode-scan-tools/barcode-scan-tools.component";
import { ProductBarcodeService } from "../../products/product-barcode.service";
import { ProductQuickCreateDialogComponent } from "../../products/product-quick-create-dialog/product-quick-create-dialog.component";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { DEFAULT_PAGE_SIZE } from "../../../../shared/components/pagination/pagination.component";
import {
  CancelOrderDialogComponent,
  CancelOrderResult,
} from "../../../../shared/components/cancel-order-dialog/cancel-order-dialog.component";
import { ORDER_STATUS_LABELS } from "../../order-status.constants";
import { DocumentListComponent, DocumentAdvanceEvent } from "../document-list/document-list.component";
import { CustomerSaleSummaryComponent } from "../customer-sale-summary/customer-sale-summary.component";
import { DocumentReceiptComponent } from "../document-receipt/document-receipt.component";
import type { DocumentKind } from "../document.types";

interface DraftItem {
  productId: number | "";
  quantity: number;
  amount: number;
}

@Component({
  selector: "app-inventory-documents",
  standalone: true,
  imports: [CommonModule, FormsModule, CancelOrderDialogComponent, CustomerSaleSummaryComponent, DocumentReceiptComponent, DocumentListComponent, BarcodeScanToolsComponent, ProductQuickCreateDialogComponent],
  templateUrl: "./document-workbench.component.html",
  styleUrls: ["./document-workbench.component.css"],
})
export class DocumentWorkbenchComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private store = inject(AuthStore);
  private limits = inject(LimitsService);
  private barcodeDispatcher = inject(BarcodeDispatcherService);
  private productBarcode = inject(ProductBarcodeService);
  private destroyRef = inject(DestroyRef);

  /** Modo restaurante: habilita el campo de mesa en la venta. */
  get isRestaurant(): boolean {
    return this.store.company()?.businessType === "restaurant";
  }

  @Input({ required: true }) kind!: DocumentKind;
  documents = signal<InventoryDocument[]>([]);
  products = signal<InventoryProduct[]>([]);
  contacts = signal<InventoryContact[]>([]);
  employees = signal<InventoryEmployee[]>([]);
  tables = signal<import("../../../../core/services/inventory.service").InventoryTable[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  documentCount = signal(0);
  saving = signal(false);
  dialogOpen = signal(false);
  previewDocument = signal<InventoryDocument | null>(null);
  cancellingDocument = signal<InventoryDocument | null>(null);
  customerFormOpen = signal(false);
  customerSaving = signal(false);
  customerProfile = signal<CustomerProfile | null>(null);
  customerProfileLoading = signal(false);
  selectedContactId: number | "" = "";
  selectedEmployeeId: number | "" = "";
  tableNumber = "";
  // Entrega a domicilio (solo ventas)
  isDelivery = false;
  couriers = signal<InventoryEmployee[]>([]);
  selectedCourierId: number | "" = "";
  deliveryAddress = "";
  deliveryLat: number | "" = "";
  deliveryLng: number | "" = "";
  date = new Date().toISOString().slice(0, 10);
  notes = "";
  items: DraftItem[] = [this.emptyItem()];
  customerForm = this.emptyCustomerForm();
  productSearch = "";
  contactSearch = "";
  quickCreateBarcode = signal<string | null>(null);

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

  get canAdvanceOnSiteOrders(): boolean {
    if (this.isRestaurant || !this.isSale) return false;
    const roles = this.store.user()?.roles ?? [];
    return roles.includes("ADMIN") || roles.includes("SELLER");
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

  get employeeLabel(): string {
    return this.isSale ? "Vendedor" : "Quién recibe";
  }

  ngOnInit(): void {
    this.limits.load().subscribe({ error: () => undefined });
    const unregister = this.barcodeDispatcher.register((scan) => this.onBarcodeScan(scan));
    this.destroyRef.onDestroy(unregister);
    this.loadProducts();
    this.selectedContactId = "";
    this.dialogOpen.set(false);
    this.customerFormOpen.set(false);
    this.previewDocument.set(null);
    this.page.set(1);
    this.load();
    this.loadContacts();
    this.loadEmployees();
    if (this.kind === "sales") {
      this.loadCouriers();
      if (this.isRestaurant) this.loadTables();
    }
  }

  loadTables(): void {
    this.inventory.get<import("../../../../core/services/inventory.service").InventoryTable[]>("/tables/occupancy")
      .subscribe({ next: (response) => this.tables.set(response.data ?? []) });
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

  loadProducts(search = ""): void {
    this.productSearch = search;
    // Ventas: vendibles (simple + plato). Compras: comprables (simple + insumo).
    const types = this.isSale ? "simple,prepared" : "simple,ingredient";
    this.inventory.list<InventoryProduct>("/products", {
      limit: 100,
      status: "active",
      types,
      search: search.trim() || undefined,
    }).subscribe({
      next: (response) => {
        const selectedIds = new Set(this.items.map((item) => Number(item.productId)).filter(Boolean));
        const selectedProducts = this.products().filter((product) => selectedIds.has(product.id ?? product._id ?? 0));
        const productsById = new Map<number, InventoryProduct>();
        for (const product of [...selectedProducts, ...(response.data ?? [])]) {
          productsById.set(product.id ?? product._id ?? 0, product);
        }
        this.products.set([...productsById.values()]);
      },
    });
  }

  searchProducts(): void {
    this.loadProducts(this.productSearch);
  }

  private onBarcodeScan(scan: BarcodeScan): void {
    this.applyBarcode(scan.code);
  }

  /**
   * Resuelve el código exacto y agrega la línea. Si no existe ofrece crearlo
   * dentro del mismo diálogo para no perder el documento en curso.
   */
  applyBarcode(code: string): void {
    const value = code.trim();
    if (!value) return;
    if (this.quickCreateBarcode()) return;

    if (!this.dialogOpen()) this.openCreate();

    this.productBarcode
      .resolveForScan(value, this.isSale ? "sale" : "purchase")
      .subscribe({
        next: (outcome) => {
          switch (outcome.status) {
            case "found":
              this.addScannedProduct(outcome.product);
              break;
            case "not-found":
              this.offerQuickCreate(outcome.code);
              break;
            case "inactive":
              this.notifications.warn(
                "Producto inactivo",
                `"${outcome.product.name}" está inactivo. Actívalo en el catálogo para usarlo.`,
              );
              break;
            case "not-sellable":
              this.notifications.warn(
                "Producto no disponible",
                `"${outcome.product.name}" es un insumo y no se vende suelto.`,
              );
              break;
            case "not-purchasable":
              this.notifications.warn(
                "Producto no disponible",
                `"${outcome.product.name}" es un plato y no se compra.`,
              );
              break;
          }
        },
        error: () => {
          this.notifications.error(
            "No se pudo buscar el código",
            "Revisa tu conexión e intenta de nuevo.",
          );
        },
      });
  }

  private offerQuickCreate(barcode: string): void {
    const roles = this.store.user()?.roles ?? [];
    if (!this.productBarcode.canManageProducts(roles)) {
      this.notifications.warn(
        "Código no registrado",
        `"${barcode}" no está registrado. Pide a un administrador o bodeguero que cree el producto.`,
      );
      return;
    }

    if (!this.limits.canCreate("products")) {
      this.notifications.warn(
        "Límite del plan alcanzado",
        "No puedes crear más productos con tu plan actual.",
      );
      return;
    }

    this.quickCreateBarcode.set(barcode);
  }

  onProductCreated(product: InventoryProduct): void {
    this.quickCreateBarcode.set(null);
    this.addScannedProduct(product);
  }

  private addScannedProduct(product: InventoryProduct): void {
    const id = product.id ?? product._id;
    if (!id) return;

    this.products.update((list) =>
      list.some((candidate) => (candidate.id ?? candidate._id) === id)
        ? list
        : [...list, product],
    );

    const price = this.isSale ? product.salePrice : product.purchasePrice;
    const existingIndex = this.items.findIndex(
      (item) => Number(item.productId) === id,
    );

    if (existingIndex >= 0) {
      this.items = this.items.map((item, index) =>
        index === existingIndex
          ? {
              ...item,
              quantity: Number(item.quantity) + 1,
              amount: Number(item.amount) || price,
            }
          : item,
      );
    } else {
      const emptyIndex = this.items.findIndex((item) => !item.productId);
      const nextItem: DraftItem = { productId: id, quantity: 1, amount: price };
      this.items = emptyIndex >= 0
        ? this.items.map((item, index) => (index === emptyIndex ? nextItem : item))
        : [...this.items, nextItem];
    }

    if (this.isSale && product.type !== "prepared" && product.stock < 1) {
      this.notifications.warn(
        "Producto sin stock",
        `${product.name} se agregó con 0 unidades. Registra una entrada antes de cobrar.`,
      );
      return;
    }

    this.notifications.success("Producto agregado", `${product.name} · ${product.sku}`);
  }

  loadContacts(search = ""): void {
    const endpoint = this.isSale ? "/customers" : "/suppliers";
    this.contactSearch = search;
    this.inventory.list<InventoryContact>(endpoint, {
      limit: 100,
      search: search.trim() || undefined,
    }).subscribe({
      next: (response) => {
        const selectedContact = this.contacts().find((contact) => (contact.id ?? contact._id) === Number(this.selectedContactId));
        const contactsById = new Map<number, InventoryContact>();
        for (const contact of [selectedContact, ...(response.data ?? [])]) {
          if (contact) contactsById.set(contact.id ?? contact._id ?? 0, contact);
        }
        this.contacts.set([...contactsById.values()]);
      },
    });
  }

  searchContacts(): void {
    this.loadContacts(this.contactSearch);
  }

  loadEmployees(): void {
    this.inventory.get<InventoryEmployee[]>("/employee-options").subscribe({
      next: (response) => this.employees.set(response.data ?? []),
    });
  }

  loadCouriers(): void {
    this.inventory.get<InventoryEmployee[]>("/employee-options", { role: "courier" }).subscribe({
      next: (response) => this.couriers.set(response.data ?? []),
    });
  }

  contactChanged(): void {
    if (!this.isSale) return;
    const customer = this.contacts().find(
      (candidate) => (candidate.id ?? candidate._id) === Number(this.selectedContactId),
    );
    this.customerProfile.set(null);
    if (customer && this.selectedContactId) {
      const customerId = customer.id ?? customer._id;
      if (customerId) {
        this.customerProfileLoading.set(true);
        this.inventory.get<CustomerProfile>(`/statistics/customers/${customerId}/profile`, { limit: 1 }).subscribe({
          next: (response) => {
            if (Number(this.selectedContactId) === customerId) {
              this.customerProfile.set(response.data);
            }
            this.customerProfileLoading.set(false);
          },
          error: () => this.customerProfileLoading.set(false),
        });
      }
    }
    if (customer?.address && !this.deliveryAddress.trim()) {
      this.deliveryAddress = customer.address;
    }
  }

  openCreate(): void {
    this.quickCreateBarcode.set(null);
    this.customerFormOpen.set(false);
    this.customerForm = this.emptyCustomerForm();
    this.selectedContactId = "";
    this.customerProfile.set(null);
    this.customerProfileLoading.set(false);
    this.selectedEmployeeId = "";
    this.tableNumber = "";
    this.isDelivery = false;
    this.selectedCourierId = "";
    this.deliveryAddress = "";
    this.deliveryLat = "";
    this.deliveryLng = "";
    this.date = new Date().toISOString().slice(0, 10);
    this.notes = "";
    this.items = [this.emptyItem()];
    this.productSearch = "";
    this.contactSearch = "";
    this.loadProducts();
    this.loadContacts();
    this.dialogOpen.set(true);
  }

  addItem(): void {
    this.items = [...this.items, this.emptyItem()];
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items = this.items.filter((_item, itemIndex) => itemIndex !== index);
  }

  productChanged(item: DraftItem): void {
    const product = this.products().find((candidate) => (candidate.id ?? candidate._id) === Number(item.productId));
    if (product) item.amount = this.isSale ? product.salePrice : product.purchasePrice;
  }

  productName(id: number): string {
    return this.products().find((product) => (product.id ?? product._id) === id)?.name ?? `Producto #${id}`;
  }

  openDocument(document: InventoryDocument): void {
    this.previewDocument.set(document);
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

  lineTotal(item: DraftItem): number {
    return Math.round((Number(item.amount) * Number(item.quantity) + Number.EPSILON) * 100) / 100;
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  productFor(item: DraftItem): InventoryProduct | undefined {
    return this.products().find(
      (product) => (product.id ?? product._id) === Number(item.productId),
    );
  }

  maxSaleQuantity(item: DraftItem): number | null {
    const product = this.productFor(item);
    return this.isSale && product && product.type !== "prepared" ? product.stock : null;
  }

  margin(item: DraftItem): number | null {
    const product = this.productFor(item);
    return product && this.isSale ? Number(item.amount) - product.purchasePrice : null;
  }

  marginPercent(item: DraftItem): number | null {
    const product = this.productFor(item);
    if (!product || !this.isSale || Number(item.amount) <= 0) return null;
    return ((Number(item.amount) - product.purchasePrice) / Number(item.amount)) * 100;
  }

  toggleCustomerForm(): void {
    this.customerFormOpen.update((isOpen) => !isOpen);
  }

  createCustomer(): void {
    if (this.customerForm.name.trim().length < 2) {
      this.notifications.warn(
        "Falta el nombre",
        "Escribe al menos dos caracteres para el cliente.",
      );
      return;
    }

    this.customerSaving.set(true);
    this.inventory.post<InventoryContact>("/customers", {
      name: this.customerForm.name.trim(),
      document: this.customerForm.document.trim(),
      phone: this.customerForm.phone.trim(),
      email: this.customerForm.email.trim(),
    }).subscribe({
      next: (response) => {
        this.customerSaving.set(false);
        this.contacts.update((contacts) => [...contacts, response.data]);
        this.selectedContactId = response.data.id ?? response.data._id ?? "";
        this.contactChanged();
        this.customerForm = this.emptyCustomerForm();
        this.customerFormOpen.set(false);
        this.notifications.success(
          "Cliente creado",
          "Ya quedó seleccionado para esta venta.",
        );
      },
      error: () => this.customerSaving.set(false),
    });
  }

  draftTotal(): number {
    return this.items.reduce((sum, item) => sum + this.lineTotal(item), 0);
  }

  save(): void {
    if (this.isSale && this.customerFormOpen()) {
      this.notifications.warn(
        "Termina el registro del cliente",
        "Crea el cliente o cancela ese formulario antes de confirmar la venta.",
      );
      return;
    }

    if (!this.items.length || this.items.some((item) => !item.productId || !Number.isInteger(Number(item.quantity)) || item.quantity < 1 || !Number.isFinite(Number(item.amount)) || item.amount < 0)) {
      this.notifications.warn("Revisa los productos", "Selecciona productos y cantidades válidas para continuar.");
      return;
    }
    const itemExceedingStock = this.isSale && this.items.find((item) => {
      const product = this.productFor(item);
      return product && product.type !== "prepared" && Number(item.quantity) > product.stock;
    });
    if (itemExceedingStock) {
      const product = this.productFor(itemExceedingStock);
      this.notifications.warn(
        "Cantidad mayor al stock",
        `${product?.name ?? "El producto"} tiene ${product?.stock ?? 0} unidades disponibles.`,
      );
      return;
    }
    if (!this.selectedContactId) {
      this.notifications.warn(
        this.isSale ? "Falta el cliente" : "Falta el proveedor",
        `Selecciona ${this.isSale ? "un cliente" : "un proveedor"} para registrar ${this.isSale ? "la venta" : "la compra"}.`,
      );
      return;
    }

    const body: Record<string, unknown> = {
      date: new Date(`${this.date}T12:00:00`).toISOString(),
      notes: this.notes.trim(),
      items: this.items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        [this.isSale ? "unitPrice" : "unitCost"]: Number(item.amount),
      })),
    };
    body[this.isSale ? "customerId" : "supplierId"] = Number(this.selectedContactId);
    if (this.selectedEmployeeId) body["employeeId"] = Number(this.selectedEmployeeId);
    if (this.isSale && this.isRestaurant && this.tableNumber.trim()) {
      body["tableNumber"] = this.tableNumber.trim();
    }

    if (this.isSale && this.isDelivery) {
      if (!this.deliveryAddress.trim()) {
        this.notifications.warn("Falta la dirección", "Escribe la dirección de entrega del domicilio.");
        return;
      }
      const delivery: Record<string, unknown> = { address: this.deliveryAddress.trim() };
      if (this.selectedCourierId) delivery["courierId"] = Number(this.selectedCourierId);
      if (this.deliveryLat !== "" && this.deliveryLng !== "") {
        delivery["location"] = { lat: Number(this.deliveryLat), lng: Number(this.deliveryLng) };
      }
      body["delivery"] = delivery;
    }

    this.saving.set(true);
    this.inventory.post<InventoryDocument>(`/${this.kind}`, body).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.previewDocument.set(response.data);
        this.notifications.success(this.isSale ? "Venta registrada" : "Compra registrada", "Las existencias se actualizaron correctamente.");
        this.page.set(1);
        this.load();
        this.loadProducts();
      },
      error: () => this.saving.set(false),
    });
  }

  closeDocument(): void {
    this.previewDocument.set(null);
  }

  private emptyItem(): DraftItem {
    return { productId: "", quantity: 1, amount: 0 };
  }

  private emptyCustomerForm() {
    return { name: "", document: "", phone: "", email: "" };
  }
}
