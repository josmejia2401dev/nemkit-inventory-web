import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DocumentWorkbenchComponent } from "../documents/document-workbench/document-workbench.component";

@Component({
  selector: "app-purchases-page",
  standalone: true,
  imports: [DocumentWorkbenchComponent],
  templateUrl: "./purchases-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesPageComponent {}
