import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  InventoryCategory,
  InventoryProduct,
  ProductType,
} from "../../../../../core/services/inventory.service";
import { ProductCatalogService } from "../../product-catalog.service";
import { NotificationService } from "../../../../../core/services/notification.service";
import { BarcodeCameraBarComponent } from "../../../../../shared/barcode/barcode-camera-bar/barcode-camera-bar.component";
import { ProductBarcodeService } from "../../product-barcode.service";
import { ScanRequest } from "../../../../../shared/barcode/scan-request";

/** Cuerpo ya validado que la pantalla envía a `POST` o `PUT /products`. */
export interface ProductDraft {
  body: Record<string, unknown>;
  isCreate: boolean;
}

@Component({
  selector: "app-product-form-dialog",
  standalone: true,
  imports: [FormsModule, BarcodeCameraBarComponent],
  templateUrl: "./product-form-dialog.component.html",
  styleUrl: "./product-form-dialog.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormDialogComponent implements OnInit {
  private readonly catalog = inject(ProductCatalogService);
  private readonly notifications = inject(NotificationService);
  private readonly productBarcode = inject(ProductBarcodeService);

  readonly product = input<InventoryProduct | null>(null);
  readonly categories = input<InventoryCategory[]>([]);
  readonly saving = input(false);
  readonly scan = input<ScanRequest>({ code: "", seq: 0 });
  readonly submitted = output<ProductDraft>();
  readonly closed = output<void>();

  readonly ingredients = signal<InventoryProduct[]>([]);
  readonly typeOptions: Array<{ value: ProductType; label: string; hint: string }> = [
    { value: "simple", label: "Simple", hint: "Se compra y se vende" },
  ];

  form = this.emptyForm();

  constructor() {
    effect(() => {
      const request = this.scan();
      if (request.seq > 0 && request.code) {
        untracked(() => this.fillBarcode(request.code));
      }
    });
  }

  ngOnInit(): void {
    const product = this.product();
    if (product) this.form = this.fromProduct(product);
    this.loadIngredients();
  }

  get isEditing(): boolean {
    return !!this.product();
  }

  get isPrepared(): boolean {
    return this.form.type === "prepared";
  }

  private loadIngredients(): void {
    // Insumos y simples activos, aptos para formar parte de una receta.
    this.catalog
      .lookupAll({ types: "ingredient,simple" })
      .subscribe({ next: (products) => this.ingredients.set(products) });
  }

  /** El lector llena el campo y avisa si el código ya pertenece a otro producto. */
  fillBarcode(code: string): void {
    const value = code.trim();
    if (!value) return;
    this.form.barcode = value;

    this.productBarcode.resolveForScan(value, "catalog").subscribe({
      next: (outcome) => {
        if (outcome.status !== "found") return;
        this.notifications.warn(
          "Código ya registrado",
          `"${value}" pertenece a ${outcome.product.name}.`,
        );
      },
      error: () => undefined,
    });
  }

  addRecipeItem(): void {
    this.form.recipe = [...this.form.recipe, { ingredientId: "", quantity: 1 }];
  }

  removeRecipeItem(index: number): void {
    this.form.recipe = this.form.recipe.filter((_item, itemIndex) => itemIndex !== index);
  }

  save(): void {
    if (!this.form.categoryId || !this.form.sku.trim() || !this.form.name.trim()) {
      this.notifications.warn("Faltan datos", "Completa el nombre, SKU y categoría.");
      return;
    }

    let recipe: Array<{ ingredientId: number; quantity: number }> | undefined;
    if (this.isPrepared) {
      // La receta es opcional: si el restaurante no define insumos, el plato se
      // guarda igual (la venta no descontará insumos). Solo enviamos los válidos.
      recipe = this.form.recipe
        .filter((item) => item.ingredientId && Number(item.quantity) > 0)
        .map((item) => ({ ingredientId: Number(item.ingredientId), quantity: Number(item.quantity) }));
    }

    const body: Record<string, unknown> = {
      categoryId: Number(this.form.categoryId),
      type: this.form.type,
      sku: this.form.sku.trim(),
      barcode: this.form.barcode.trim(),
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      // Precio de compra opcional: si queda vacío, se envía 0.
      purchasePrice: Number(this.form.purchasePrice) || 0,
      salePrice: Number(this.form.salePrice),
      minimumStock: Number(this.form.minimumStock),
      status: this.form.status,
      image: this.form.image.trim() ? { url: this.form.image.trim() } : undefined,
    };
    if (this.isPrepared) body["recipe"] = recipe;

    this.submitted.emit({ body, isCreate: !this.isEditing });
  }

  private fromProduct(product: InventoryProduct) {
    return {
      categoryId: product.categoryId as number | "",
      type: product.type ?? "simple",
      sku: product.sku,
      barcode: product.barcode ?? "",
      name: product.name,
      description: product.description ?? "",
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      minimumStock: product.minimumStock ?? 0,
      status: product.status,
      image: product.image?.url ?? "",
      recipe: (product.recipe ?? []).map((item) => ({
        ingredientId: item.ingredientId as number | "",
        quantity: item.quantity,
      })),
    };
  }

  private emptyForm() {
    return {
      categoryId: "" as number | "",
      type: "simple" as ProductType,
      sku: "",
      barcode: "",
      name: "",
      description: "",
      purchasePrice: 0,
      salePrice: 0,
      minimumStock: 0,
      status: "active" as "active" | "inactive",
      image: "",
      recipe: [] as Array<{ ingredientId: number | ""; quantity: number }>,
    };
  }
}
