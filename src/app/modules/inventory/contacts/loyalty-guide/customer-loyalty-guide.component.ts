import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { InventoryLoyaltyRule, LoyaltyTier } from "../../../../core/services/inventory.service";
import { formatCurrency } from "../../../../shared/utils/currency.util";

@Component({
  selector: "app-customer-loyalty-guide",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./customer-loyalty-guide.component.html",
  styleUrls: ["./customer-loyalty-guide.component.css"],
})
export class CustomerLoyaltyGuideComponent {
  @Input() rules: InventoryLoyaltyRule[] = [];
  @Input() expanded = false;

  readonly tierLabels: Record<LoyaltyTier, string> = {
    bronze: "Bronce",
    silver: "Plata",
    gold: "Oro",
    platinum: "Platino",
  };

  get displayRules(): InventoryLoyaltyRule[] {
    return [...this.rules].reverse();
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  threshold(rule: InventoryLoyaltyRule): string {
    if (rule.tier === "bronze") return "Nivel inicial";
    return `${rule.minPurchases} compras pagadas o ${this.formatMoney(rule.minSpent)} gastados`;
  }
}
