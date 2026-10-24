import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DeliveryBoardComponent } from "./delivery-board.component";

@Component({
  selector: "app-delivery-operations-page",
  standalone: true,
  imports: [DeliveryBoardComponent],
  template: `<app-inventory-deliveries [mode]="'operations'" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOperationsPageComponent {}
