import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

export const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: "app-pagination",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./pagination.component.html",
  styleUrl: "./pagination.component.css",
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = DEFAULT_PAGE_SIZE;
  @Input() totalItems = 0;
  @Input() itemLabel = "registros";
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get firstItem(): number {
    return this.totalItems === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get lastItem(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  get canGoPrevious(): boolean {
    return this.page > 1 && this.totalItems > 0;
  }

  get canGoNext(): boolean {
    return this.page < this.totalPages && this.lastItem < this.totalItems;
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.pageChange.emit(page);
  }
}
