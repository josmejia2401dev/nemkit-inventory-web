import { ChangeDetectionStrategy, Component, computed, inject, OnInit, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LayawaysApi } from "../layaways.api";
import { ContactsApi } from "../../contacts/contacts.api";
import { ProductCatalogService } from "../../products/product-catalog.service";
import { NotificationService } from "../../../../core/services/notification.service";
import {
  InventoryContact,
  InventoryProduct,
  LayawayFrequency,
  LayawayHandoverMode,
  LayawayPaymentMethod,
  LayawaySettings,
} from "../../../../core/models/inventory";
import { formatCurrency } from "../../../../shared/utils/currency.util";

interface DraftItem {
  product: InventoryProduct;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: "app-layaway-create-dialog",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./layaway-create-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayawayCreateDialogComponent implements OnInit {
  private readonly api = inject(LayawaysApi);
  private readonly contacts = inject(ContactsApi);
  private readonly catalog = inject(ProductCatalogService);
  private readonly notifications = inject(NotificationService);

  readonly created = output<void>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  readonly settings = signal<LayawaySettings | null>(null);
  readonly customers = signal<InventoryContact[]>([]);
  readonly products = signal<InventoryProduct[]>([]);
  readonly selectedCustomer = signal<InventoryContact | null>(null);
  readonly items = signal<DraftItem[]>([]);
  readonly showNewCustomer = signal(false);
  readonly customerSearch = signal("");
  readonly productSearch = signal("");

  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  readonly balance = computed(() => Math.max(0, this.total() - Number(this.form.initialPayment || 0)));

  form = {
    initialPayment: 0,
    initialPaymentMethod: "cash" as LayawayPaymentMethod,
    installmentAmount: 0,
    frequency: "monthly" as LayawayFrequency,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    handoverMode: "pickup" as LayawayHandoverMode,
    deliveryAddress: "",
    notes: "",
  };

  newCustomer = { name: "", document: "", phone: "", email: "" };

  ngOnInit(): void {
    this.api.settings().subscribe({
      next: (response) => {
        this.settings.set(response.data);
        this.form.frequency = response.data.defaultFrequency;
      },
      error: () => this.settings.set(null),
    });
    this.searchCustomers();
    this.searchProducts();
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  searchCustomers(): void {
    this.contacts.list("customers", {
      page: 1,
      limit: 20,
      search: this.customerSearch().trim() || undefined,
    }).subscribe({
      next: (response) => this.customers.set(response.data ?? []),
      error: () => this.customers.set([]),
    });
  }

  searchProducts(): void {
    this.catalog.lookup({
      types: "simple",
      search: this.productSearch().trim() || undefined,
    }).subscribe({
      next: (response) => this.products.set((response.data ?? []).filter((product) => product.stock > 0)),
      error: () => this.products.set([]),
    });
  }

  selectCustomer(customer: InventoryContact): void {
    this.selectedCustomer.set(customer);
  }

  createCustomer(): void {
    if (this.newCustomer.name.trim().length < 2) {
      this.notifications.warn("Falta el nombre", "Escribe al menos dos caracteres.");
      return;
    }
    this.contacts.create("customers", {
      name: this.newCustomer.name.trim(),
      document: this.newCustomer.document.trim(),
      phone: this.newCustomer.phone.trim(),
      email: this.newCustomer.email.trim(),
    }).subscribe({
      next: (response) => {
        this.selectedCustomer.set(response.data);
        this.customers.update((list) => [response.data, ...list]);
        this.showNewCustomer.set(false);
        this.newCustomer = { name: "", document: "", phone: "", email: "" };
        this.notifications.success("Cliente creado", "Quedó seleccionado para el plan separe.");
      },
    });
  }

  addProduct(product: InventoryProduct): void {
    if (this.items().some((item) => item.product.id === product.id)) {
      this.notifications.info("Ya está en el plan", product.name);
      return;
    }
    this.items.update((list) => [...list, { product, quantity: 1, unitPrice: product.salePrice }]);
  }

  removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  updateQuantity(index: number, quantity: number): void {
    const next = Math.max(1, Math.floor(Number(quantity) || 1));
    this.items.update((list) => list.map((item, i) => (i === index ? { ...item, quantity: next } : item)));
  }

  updatePrice(index: number, unitPrice: number): void {
    const next = Math.max(0, Number(unitPrice) || 0);
    this.items.update((list) => list.map((item, i) => (i === index ? { ...item, unitPrice: next } : item)));
  }

  submit(): void {
    const customer = this.selectedCustomer();
    if (!customer?.id) {
      this.notifications.warn("Falta el cliente", "Selecciona o crea un cliente.");
      return;
    }
    if (!this.items().length) {
      this.notifications.warn("Falta el producto", "Agrega al menos un producto.");
      return;
    }
    const initialPayment = Number(this.form.initialPayment) || 0;
    if (initialPayment > this.total()) {
      this.notifications.warn("Abono inválido", "El abono no puede superar el total.");
      return;
    }

    this.saving.set(true);
    this.api.create({
      customerId: customer.id,
      items: this.items().map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      initialPayment,
      initialPaymentMethod: this.form.initialPaymentMethod,
      installmentAmount: Number(this.form.installmentAmount) || 0,
      frequency: this.form.frequency,
      dueDate: this.form.dueDate,
      handoverMode: this.form.handoverMode,
      delivery: this.form.handoverMode === "delivery"
        ? { address: this.form.deliveryAddress.trim() }
        : null,
      notes: this.form.notes.trim(),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success("Plan separe creado", "El stock quedó reservado.");
        this.created.emit();
      },
      error: (error) => {
        this.saving.set(false);
        this.notifications.error("No se pudo crear el plan", error?.error?.message || "Intenta nuevamente.");
      },
    });
  }
}
