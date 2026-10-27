import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef } from "@angular/core";
import { InventoryCategory, InventoryProduct } from "../../../../../core/services/inventory.service";
import { formatCurrency } from "../../../../../shared/utils/currency.util";

@Component({
  selector: "app-product-table",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./product-table.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTableComponent {
  @Input() products: InventoryProduct[] = [];
  @Input() categories: InventoryCategory[] = [];

  @ContentChild(TemplateRef)
  rowActions?: TemplateRef<{ $implicit: InventoryProduct }>;

  categoryName(categoryId: number): string {
    return this.categories.find((category) => (category.id ?? category._id) === categoryId)?.name ?? "Sin categoría";
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }
}
