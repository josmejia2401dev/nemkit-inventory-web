import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DeliveryBoardComponent } from "../delivery-board.component";

@Component({
  selector: "app-delivery-operations-page",
  standalone: true,
  imports: [DeliveryBoardComponent],
  templateUrl: "./delivery-operations-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOperationsPageComponent {}
