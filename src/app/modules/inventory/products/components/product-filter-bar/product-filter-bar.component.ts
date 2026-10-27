import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InventoryCategory } from "../../../../../core/services/inventory.service";

@Component({
  selector: "app-product-filter-bar",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./product-filter-bar.component.html",
  styleUrls: ["./product-filter-bar.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFilterBarComponent {
  @Input() categories: InventoryCategory[] = [];
  @Input() search = "";
  @Input() categoryFilter: number | "" = "";
  @Input() stockState: "" | "out_of_stock" | "low_stock" = "";
  @Input() hasProductFocus = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() categoryFilterChange = new EventEmitter<number | "">();
  @Output() stockStateChange = new EventEmitter<"" | "out_of_stock" | "low_stock">();
  @Output() apply = new EventEmitter<void>();
  @Output() clearProductFocus = new EventEmitter<void>();
}
