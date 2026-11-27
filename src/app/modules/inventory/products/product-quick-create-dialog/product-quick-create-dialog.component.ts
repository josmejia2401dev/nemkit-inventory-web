import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryCategory,
  InventoryProduct,
} from "../../../../core/services/inventory.service";
import { NotificationService } from "@nemkit/foundation-web";
import { ProductCatalogService } from "../product-catalog.service";

interface QuickProductForm {
  name: string;
  sku: string;
  categoryId: number | "";
  salePrice: number;
  purchasePrice: number;
}

/**
 * Creación mínima de un producto desde un escaneo, sin salir del documento o
 * movimiento en curso. Reutiliza el endpoint y las validaciones del catálogo.
 */
@Component({
  selector: "app-product-quick-create-dialog",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./product-quick-create-dialog.component.html",
  styleUrl: "./product-quick-create-dialog.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductQuickCreateDialogComponent implements OnInit {
  private readonly catalog = inject(ProductCatalogService);
  private readonly notifications = inject(NotificationService);

  readonly barcode = input.required<string>();
  readonly contextLabel = input("documento");

  readonly created = output<InventoryProduct>();
  readonly cancelled = output<void>();

  readonly categories = signal<InventoryCategory[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  form: QuickProductForm = {
    name: "",
    sku: "",
    categoryId: "",
    salePrice: 0,
    purchasePrice: 0,
  };

  ngOnInit(): void {
    const code = this.barcode();
    this.form.sku = code;
    this.catalog.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  save(): void {
    const name = this.form.name.trim();
    const sku = this.form.sku.trim();
    if (!name || !sku || !this.form.categoryId) {
      this.notifications.warn(
        "Faltan datos",
        "Completa el nombre, el SKU y la categoría para crear el producto.",
      );
      return;
    }
    if (!Number.isFinite(Number(this.form.salePrice)) || Number(this.form.salePrice) < 0) {
      this.notifications.warn("Precio inválido", "El precio de venta debe ser cero o mayor.");
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.catalog
      .create({
        categoryId: Number(this.form.categoryId),
        type: "simple",
        sku,
        barcode: this.barcode(),
        name,
        purchasePrice: Number(this.form.purchasePrice) || 0,
        salePrice: Number(this.form.salePrice) || 0,
        minimumStock: 0,
        status: "active",
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.created.emit(response.data);
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(this.messageFor(error));
        },
      });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private messageFor(error: unknown): string {
    const payload = (error as { error?: { message?: string } } | null)?.error;
    return payload?.message || "Revisa los datos e intenta de nuevo.";
  }
}
