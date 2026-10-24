import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

export const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: "app-pagination",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pagination" aria-label="Paginación de resultados">
      <p class="pagination__summary" aria-live="polite">
        @if (totalItems > 0) {
          Mostrando <strong>{{ firstItem | number }}</strong>–<strong>{{ lastItem | number }}</strong>
          de <strong>{{ totalItems | number }}</strong> {{ itemLabel }}
        } @else {
          <strong>0</strong> {{ itemLabel }}
        }
      </p>

      <div class="pagination__controls">
        <button
          type="button"
          class="pagination__button"
          [disabled]="!canGoPrevious"
          (click)="goTo(1)"
          aria-label="Ir a la primera página"
          title="Primera página"
        >
          <i class="pi pi-angle-double-left" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="pagination__button"
          [disabled]="!canGoPrevious"
          (click)="goTo(page - 1)"
          aria-label="Ir a la página anterior"
          title="Anterior"
        >
          <i class="pi pi-angle-left" aria-hidden="true"></i>
          <span>Anterior</span>
        </button>

        <span class="pagination__page" aria-current="page">Página {{ page }} de {{ totalPages }}</span>

        <button
          type="button"
          class="pagination__button"
          [disabled]="!canGoNext"
          (click)="goTo(page + 1)"
          aria-label="Ir a la página siguiente"
          title="Siguiente"
        >
          <span>Siguiente</span>
          <i class="pi pi-angle-right" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="pagination__button"
          [disabled]="!canGoNext"
          (click)="goTo(totalPages)"
          aria-label="Ir a la última página"
          title="Última página"
        >
          <i class="pi pi-angle-double-right" aria-hidden="true"></i>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    :host { display: block; }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      border-top: 1px solid rgba(36, 65, 52, .08);
      color: #7e8c83;
      font-size: 12px;
    }
    .pagination__summary { margin: 0; }
    .pagination__summary strong { color: #34483b; font-weight: 650; }
    .pagination__controls { display: flex; align-items: center; gap: 6px; }
    .pagination__button {
      display: inline-flex;
      min-width: 36px;
      height: 36px;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 10px;
      border: 1px solid #e3eae5;
      border-radius: 10px;
      background: #fff;
      color: #405448;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background-color .16s ease, border-color .16s ease, color .16s ease;
    }
    .pagination__button:hover:not(:disabled) { background: #f3f7f4; border-color: #cbd9cf; }
    .pagination__button:focus-visible { outline: 3px solid rgba(74, 128, 91, .25); outline-offset: 2px; }
    .pagination__button:disabled { color: #b7c0ba; background: #f7f9f7; cursor: not-allowed; }
    .pagination__page { min-width: 92px; text-align: center; color: #526359; font-weight: 600; }
    @media (max-width: 600px) {
      .pagination { align-items: flex-start; flex-direction: column; gap: 10px; padding: 13px 15px; }
      .pagination__controls { width: 100%; justify-content: space-between; }
      .pagination__button { min-width: 38px; height: 38px; }
      .pagination__button span { display: none; }
      .pagination__page { flex: 1; }
    }
  `],
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
