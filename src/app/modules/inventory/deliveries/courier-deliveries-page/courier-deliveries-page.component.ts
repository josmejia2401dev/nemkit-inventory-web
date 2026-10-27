import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DeliveryBoardComponent } from "../delivery-board.component";

@Component({
  selector: "app-courier-deliveries-page",
  standalone: true,
  imports: [DeliveryBoardComponent],
  templateUrl: "./courier-deliveries-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourierDeliveriesPageComponent {}
