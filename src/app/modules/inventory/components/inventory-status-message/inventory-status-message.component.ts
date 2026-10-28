import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { debounceTime, interval, merge, timeout } from "rxjs";
import { InventoryService } from "../../../../core/services/inventory.service";

type InventoryNotice =
  | { type: "loading" }
  | { type: "unavailable" }
  | { type: "healthy" }
  | { type: "out-of-stock"; count: number }
  | { type: "low-stock"; count: number };

@Component({
  selector: "app-inventory-status-message",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./inventory-status-message.component.html",
})
export class InventoryStatusMessageComponent implements OnInit {
  private inventory = inject(InventoryService);
  private destroyRef = inject(DestroyRef);

  notice = signal<InventoryNotice>({ type: "loading" });

  ngOnInit(): void {
    this.refresh();

    merge(
      this.inventory.changes.pipe(debounceTime(250)),
      interval(60_000),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  refresh(): void {
    this.inventory
      .get<{ outOfStock: number; lowStock: number }>("/statistics/dashboard/alerts")
      .pipe(timeout(15_000))
      .subscribe({
        next: ({ data }) => {
          if (data.outOfStock > 0) {
            this.notice.set({ type: "out-of-stock", count: data.outOfStock });
            return;
          }

          if (data.lowStock > 0) {
            this.notice.set({ type: "low-stock", count: data.lowStock });
            return;
          }

          this.notice.set({ type: "healthy" });
        },
        error: () => this.notice.set({ type: "unavailable" }),
      });
  }
}
