import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  InventoryDelivery,
  InventoryService,
} from "../../../../core/services/inventory.service";

@Component({
  selector: "app-courier-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./courier-dashboard.component.html",
})
export class CourierDashboardComponent implements OnInit {
  private inventory = inject(InventoryService);

  loading = signal(true);
  name = signal("");
  counts = signal({ pending: 0, preparing: 0, on_route: 0, delivered: 0 });

  ngOnInit(): void {
    this.inventory.list<InventoryDelivery>("/deliveries", { limit: 100 }).subscribe({
      next: (response) => {
        const mine = response.data ?? [];
        const c = { pending: 0, preparing: 0, on_route: 0, delivered: 0 };
        for (const d of mine) {
          if (d.status in c) (c as Record<string, number>)[d.status]++;
        }
        this.counts.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
