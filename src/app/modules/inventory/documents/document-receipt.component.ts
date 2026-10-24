import { CommonModule } from "@angular/common";
import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { InventoryDocument } from "../../../core/services/inventory.service";
import { formatCurrency } from "../../../shared/utils/currency.util";
import type { DocumentKind } from "./document.types";

@Component({
  selector: "app-document-receipt",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./document-receipt.component.html",
})
export class DocumentReceiptComponent {
  @Input({ required: true }) document!: InventoryDocument;
  @Input({ required: true }) kind!: DocumentKind;
  @Input({ required: true }) employeeLabel!: string;
  @Output() closed = new EventEmitter<void>();
  @ViewChild("printContent") private printContent?: ElementRef<HTMLElement>;

  get isSale(): boolean {
    return this.kind === "sales";
  }

  formatMoney(value: number | undefined): string {
    return formatCurrency(value);
  }

  print(): void {
    const content = this.printContent?.nativeElement;
    if (!content) {
      window.print();
      return;
    }

    const originalWidth = content.style.width;
    content.style.width = "72mm";
    const heightMm = Math.max(
      60,
      Math.ceil((content.getBoundingClientRect().height * 25.4) / 96 + 4),
    );
    content.style.width = originalWidth;

    const pageStyle = document.createElement("style");
    pageStyle.id = "inventory-print-page-size";
    pageStyle.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
    document.head.appendChild(pageStyle);
    window.addEventListener("afterprint", () => pageStyle.remove(), { once: true });
    window.print();
  }
}
