import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DocumentWorkbenchComponent } from "../documents/document-workbench.component";

@Component({
  selector: "app-purchases-page",
  standalone: true,
  imports: [DocumentWorkbenchComponent],
  template: `<app-inventory-documents [kind]="'purchases'" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesPageComponent {}
