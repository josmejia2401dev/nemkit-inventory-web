import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  InventoryService,
  InventoryDashboardSummary,
} from "../../../core/services/inventory.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./dashboard.component.html",
})
export class DashboardComponent implements OnInit {
  private inventory = inject(InventoryService);

  summary = signal<InventoryDashboardSummary | null>(null);
  loading = signal(true);
  greeting = this.getGreeting();
  currency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.inventory.get<InventoryDashboardSummary>("/dashboard/summary").subscribe({
      next: (response) => {
        this.summary.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  movementLabel(type: string): string {
    const labels: Record<string, string> = {
      purchase: "Compra",
      manual_adjustment: "Ajuste manual",
      sale: "Venta",
      damage: "Daño",
      loss: "Pérdida",
      internal_use: "Consumo interno",
    };

    return labels[type] ?? type;
  }

  private getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";

    return "Buenas noches";
  }
}
