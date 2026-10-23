import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import {
  InventoryContact,
  InventoryDocument,
  InventoryEmployee,
  InventoryProduct,
  InventoryService,
} from "../../../core/services/inventory.service";
import { NotificationService } from "../../../core/services/notification.service";
import { formatCurrency } from "../../../shared/utils/currency.util";

type DocumentKind = "purchases" | "sales";
interface DraftItem {
  productId: number | "";
  quantity: number;
  amount: number;
}

@Component({
  selector: "app-inventory-documents",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./documents.component.html",
})
export class DocumentsComponent implements OnInit {
  private inventory = inject(InventoryService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  kind: DocumentKind = "purchases";
  documents = signal<InventoryDocument[]>([]);
  products = signal<InventoryProduct[]>([]);
  contacts = signal<InventoryContact[]>([]);
  employees = signal<InventoryEmployee[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  documentCount = signal(0);
  saving = signal(false);
  dialogOpen = signal(false);
  previewDocument = signal<InventoryDocument | null>(null);
  customerFormOpen = signal(false);
  customerSaving = signal(false);
  selectedContactId: number | "" = "";
  selectedEmployeeId: number | "" = "";
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

  get isSale(): boolean {
    return this.kind === "sales";
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

  ngOnInit(): void {
    this.loadProducts();
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.kind = data["kind"] === "sales" ? "sales" : "purchases";
        this.selectedContactId = "";
        this.dialogOpen.set(false);
        this.customerFormOpen.set(false);
        this.previewDocument.set(null);
        this.page.set(1);
        this.load();
        this.loadContacts();
        this.loadEmployees();
        if (this.kind === "sales") this.loadCouriers();
      });
  }

  load(): void {
    this.loading.set(true);
    this.inventory.list<InventoryDocument>(`/${this.kind}`, {
      page: this.page(),
      limit: 20,
    }).subscribe({
      next: (response) => {
        this.documents.set(response.data ?? []);
        this.pageCount.set(response.pagination?.totalPages ?? 1);
        this.documentCount.set(response.pagination?.total ?? response.data.length);
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

  loadProducts(search = ""): void {
    this.productSearch = search;
    this.inventory.list<InventoryProduct>("/products", {
      limit: 100,
      status: "active",
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
    this.inventory.list<InventoryEmployee>("/employees", {
      limit: 100,
      status: "active",
    }).subscribe({
      next: (response) => this.employees.set(response.data ?? []),
    });
  }

  loadCouriers(): void {
    this.inventory.list<InventoryEmployee>("/employees", {
      limit: 100,
      status: "active",
      role: "courier",
    }).subscribe({
      next: (response) => this.couriers.set(response.data ?? []),
    });
  }

  contactChanged(): void {
    if (!this.isSale) return;
    const customer = this.contacts().find(
      (candidate) => (candidate.id ?? candidate._id) === Number(this.selectedContactId),
    );
    if (customer?.address && !this.deliveryAddress.trim()) {
      this.deliveryAddress = customer.address;
    }
  }

  openCreate(): void {
    this.customerFormOpen.set(false);
    this.customerForm = this.emptyCustomerForm();
    this.selectedContactId = "";
    this.selectedEmployeeId = "";
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

  documentContact(document: InventoryDocument): string {
    return this.isSale
      ? document.customerSnapshot?.name || "Cliente"
      : document.supplierSnapshot?.name || "Proveedor";
  }

  openDocument(document: InventoryDocument): void {
    this.previewDocument.set(document);
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

  printDocument(): void {
    const printContent = document.querySelector<HTMLElement>(".print-document");
    if (!printContent) {
      window.print();
      return;
    }

    const originalWidth = printContent.style.width;
    printContent.style.width = "72mm";
    const pageHeightMm = Math.max(
      60,
      Math.ceil((printContent.getBoundingClientRect().height * 25.4) / 96 + 4),
    );
    printContent.style.width = originalWidth;

    const printPageStyle = document.createElement("style");
    printPageStyle.id = "inventory-print-page-size";
    printPageStyle.textContent = `@page { size: 80mm ${pageHeightMm}mm; margin: 0; }`;
    document.head.appendChild(printPageStyle);

    window.addEventListener("afterprint", () => printPageStyle.remove(), { once: true });
    window.print();
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
