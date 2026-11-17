import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input, output, signal, untracked } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  CustomerProfile,
  InventoryContact,
  InventoryEmployee,
  InventoryProduct,
  InventoryTable,
} from "../../../../core/services/inventory.service";
import { NotificationService } from "../../../../core/services/notification.service";
import { AuthStore } from "../../../../core/store/auth.store";
import { LimitsService } from "../../../../core/services/limits.service";
import { BarcodeScanToolsComponent } from "../../../../shared/barcode/barcode-scan-tools/barcode-scan-tools.component";
import { EMPTY_SCAN, ScanRequest } from "../../../../shared/barcode/scan-request";
import { formatCurrency } from "../../../../shared/utils/currency.util";
import { CustomerSaleSummaryComponent } from "../customer-sale-summary/customer-sale-summary.component";
import { CustomerCreateFormComponent, CustomerDraft } from "../customer-create-form/customer-create-form.component";
import { DocumentsApi } from "../documents.api";
import { ProductBarcodeService } from "../../products/product-barcode.service";
import { ProductQuickCreateDialogComponent } from "../../products/product-quick-create-dialog/product-quick-create-dialog.component";
import type { DocumentKind } from "../document.types";

interface DraftItem {
  productId: number | "";
  quantity: number;
  amount: number;
}

@Component({
  selector: "app-document-draft-form",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BarcodeScanToolsComponent,
    CustomerSaleSummaryComponent,
    CustomerCreateFormComponent,
    ProductQuickCreateDialogComponent,
  ],
  templateUrl: "./document-draft-form.component.html",
  styleUrl: "./document-draft-form.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentDraftFormComponent implements OnInit {
  private readonly api = inject(DocumentsApi);
  private readonly notifications = inject(NotificationService);
  private readonly limits = inject(LimitsService);
  private readonly barcode = inject(ProductBarcodeService);
  private readonly store = inject(AuthStore);

  readonly kind = input.required<DocumentKind>();
  readonly saving = input(false);
  readonly scan = input<ScanRequest>(EMPTY_SCAN);
  /** Cuerpo ya validado: la pantalla hace el `POST` y refresca el historial. */
  readonly submitted = output<Record<string, unknown>>();
  readonly closed = output<void>();

  readonly products = signal<InventoryProduct[]>([]);
  readonly contacts = signal<InventoryContact[]>([]);
  readonly employees = signal<InventoryEmployee[]>([]);
  readonly tables = signal<InventoryTable[]>([]);
  readonly couriers = signal<InventoryEmployee[]>([]);
  readonly customerProfile = signal<CustomerProfile | null>(null);
  readonly customerProfileLoading = signal(false);
  readonly customerFormOpen = signal(false);
  readonly customerSaving = signal(false);
  readonly quickCreateBarcode = signal<string | null>(null);

  selectedContactId: number | "" = "";
  selectedEmployeeId: number | "" = "";
  tableNumber = "";
  isDelivery = false;
  selectedCourierId: number | "" = "";
  deliveryAddress = "";
  deliveryLat: number | "" = "";
  deliveryLng: number | "" = "";
  date = new Date().toISOString().slice(0, 10);
  notes = "";
  items: DraftItem[] = [this.emptyItem()];
  productSearch = "";
  contactSearch = "";

  constructor() {
    effect(() => {
      const request = this.scan();
      if (request.seq > 0 && request.code) {
        untracked(() => this.applyBarcode(request.code));
      }
    });
  }

  get isSale(): boolean {
    return this.kind() === "sales";
  }

  get isRestaurant(): boolean {
    return this.store.company()?.businessType === "restaurant";
  }

  get singular(): string {
    return this.isSale ? "venta" : "compra";
  }

  get employeeLabel(): string {
    return this.isSale ? "Vendedor" : "Quién recibe";
  }

  ngOnInit(): void {
    this.limits.load().subscribe({ error: () => undefined });
    this.loadProducts();
    this.loadContacts();
    this.loadEmployees();
    if (this.isSale) {
      this.loadCouriers();
      if (this.isRestaurant) this.loadTables();
    }
  }

  loadTables(): void {
    this.api.tablesOccupancy()
      .subscribe({ next: (response) => this.tables.set(response.data ?? []) });
  }

  loadProducts(search = ""): void {
    this.productSearch = search;
    this.api.products(this.kind(), search).subscribe({
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

  /**
   * Resuelve el código exacto y agrega la línea. Si no existe ofrece crearlo
   * dentro del mismo diálogo para no perder el documento en curso.
   */
  applyBarcode(code: string): void {
    const value = code.trim();
    if (!value) return;
    if (this.quickCreateBarcode()) return;

    this.barcode
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
    if (!this.barcode.canManageProducts(roles)) {
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
    this.contactSearch = search;
    this.api.contacts(this.kind(), search).subscribe({
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
    this.api.employees().subscribe({
      next: (response) => this.employees.set(response.data ?? []),
    });
  }

  loadCouriers(): void {
    this.api.employees("courier").subscribe({
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
        this.api.customerProfile(customerId).subscribe({
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

  close(): void {
    this.closed.emit();
  }

  toggleCustomerForm(): void {
    this.customerFormOpen.update((isOpen) => !isOpen);
  }

  createCustomer(draft: CustomerDraft): void {
    this.customerSaving.set(true);
    this.api.createCustomer(draft).subscribe({
      next: (response) => {
        this.customerSaving.set(false);
        this.contacts.update((contacts) => [...contacts, response.data]);
        this.selectedContactId = response.data.id ?? response.data._id ?? "";
        this.contactChanged();
        this.customerFormOpen.set(false);
        this.notifications.success(
          "Cliente creado",
          "Ya quedó seleccionado para esta venta.",
        );
      },
      error: () => this.customerSaving.set(false),
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

    this.submitted.emit(body);
  }

  private emptyItem(): DraftItem {
    return { productId: "", quantity: 1, amount: 0 };
  }
}
