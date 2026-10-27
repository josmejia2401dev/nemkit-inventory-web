import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DocumentWorkbenchComponent } from "../documents/document-workbench/document-workbench.component";

@Component({
  selector: "app-sales-page",
  standalone: true,
  imports: [DocumentWorkbenchComponent],
  templateUrl: "./sales-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesPageComponent {}
