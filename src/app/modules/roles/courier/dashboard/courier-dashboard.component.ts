import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DeliveriesApi } from "../../../inventory/deliveries/deliveries.api";

@Component({
  selector: "app-courier-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./courier-dashboard.component.html",
})
export class CourierDashboardComponent implements OnInit {
  private deliveriesApi = inject(DeliveriesApi);

  loading = signal(true);
  name = signal("");
  counts = signal({ pending: 0, preparing: 0, on_route: 0, delivered: 0 });

  ngOnInit(): void {
    this.deliveriesApi.list({ limit: 100 }).subscribe({
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
