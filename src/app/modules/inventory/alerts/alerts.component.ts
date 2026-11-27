import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { InventoryStockAlerts } from "../../../core/services/inventory.service";
import { DashboardApi } from "../dashboard/dashboard.api";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

@Component({
  selector: "app-inventory-alerts",
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationComponent],
  templateUrl: "./alerts.component.html",
})
export class AlertsComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private dashboard = inject(DashboardApi);
  private router = inject(Router);

  alerts = signal<InventoryStockAlerts | null>(null);
  loading = signal(true);
  page = signal(1);

  visibleProducts(): InventoryStockAlerts["products"] {
    const products = this.alerts()?.products ?? [];
    const start = (this.page() - 1) * this.pageSize;
    return products.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.alerts()?.products.length ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
  }

  get productsPath(): string {
    const rolePath = this.router.url.split("/").filter(Boolean)[0];
    const productRoles = ["admin"];
    return productRoles.includes(rolePath) ? `/${rolePath}/products` : "/products";
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.page.set(1);
    this.dashboard.alerts().subscribe({
      next: (response) => {
        this.alerts.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
