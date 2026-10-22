import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { InventoryService, InventoryStockAlerts } from "../../../core/services/inventory.service";

@Component({
  selector: "app-inventory-alerts",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./alerts.component.html",
})
export class AlertsComponent implements OnInit {
  private inventory = inject(InventoryService);

  alerts = signal<InventoryStockAlerts | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.inventory.get<InventoryStockAlerts>("/dashboard/alerts").subscribe({
      next: (response) => {
        this.alerts.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
