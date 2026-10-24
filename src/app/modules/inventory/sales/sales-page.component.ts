import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DocumentWorkbenchComponent } from "../documents/document-workbench.component";

@Component({
  selector: "app-sales-page",
  standalone: true,
  imports: [DocumentWorkbenchComponent],
  template: `<app-inventory-documents [kind]="'sales'" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesPageComponent {}
