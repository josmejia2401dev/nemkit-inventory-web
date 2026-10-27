import { ChangeDetectionStrategy, Component } from "@angular/core";
import { KitchenBoardComponent } from "../kitchen-board.component";

@Component({
  selector: "app-kitchen-service-page",
  standalone: true,
  imports: [KitchenBoardComponent],
  templateUrl: "./kitchen-service-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenServicePageComponent {}
