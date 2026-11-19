import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, Input, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";
import {
  AppNavItem,
  ApplicationShellComponent,
} from "../../../foundation/layout/application-shell.component";
import { InventoryService } from "../../../core/services/inventory.service";
import { DashboardApi } from "../dashboard/dashboard.api";

export type NavItem = AppNavItem;

@Component({
  selector: "app-layout",
  standalone: true,
  imports: [CommonModule, ApplicationShellComponent],
  templateUrl: "./layout.component.html",
})
export class LayoutComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly dashboard = inject(DashboardApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  @Input({ required: true }) navItems: NavItem[] = [];
  @Input() mobilePaths: string[] = [];
  @Input() showAlerts = false;
  @Input() dashboardPath = "/dashboard";
  @Input() alertsPath = "/alerts";
  @Input() profilePath = "/profile";
  @Input() reportPath = "";
  @Input() showBarcodeTools = true;

  readonly alertCount = signal(0);

  ngOnInit(): void {
    if (!this.showAlerts) return;

    this.refreshAlertCount();
    this.inventory.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshAlertCount());
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshAlertCount());
  }

  private refreshAlertCount(): void {
    this.dashboard.alerts().subscribe({
      next: (response) => this.alertCount.set(response.data.outOfStock + response.data.lowStock),
      error: () => this.alertCount.set(0),
    });
  }
}
