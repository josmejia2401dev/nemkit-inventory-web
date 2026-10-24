import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CustomerProfile, LoyaltyTier } from "../../../core/services/inventory.service";

@Component({
  selector: "app-customer-sale-summary",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./customer-sale-summary.component.html",
})
export class CustomerSaleSummaryComponent {
  @Input() profile: CustomerProfile | null = null;
  @Input() loading = false;

  tierLabel(tier?: LoyaltyTier): string {
    return {
      bronze: "Bronce",
      silver: "Plata",
      gold: "Oro",
      platinum: "Platino",
    }[tier ?? "bronze"];
  }

  tierStars(tier?: LoyaltyTier): number {
    return {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
    }[tier ?? "bronze"];
  }

  purchaseFrequency(days: number | null | undefined): string {
    if (days == null) return "Primera compra";
    if (days < 2) return "Compra con frecuencia diaria";
    if (days < 7) return `Cada ${Math.round(days)} días`;
    if (days < 14) return "Aproximadamente cada semana";
    if (days < 45) return "Aproximadamente cada mes";
    return `Cada ${Math.round(days)} días en promedio`;
  }
}
