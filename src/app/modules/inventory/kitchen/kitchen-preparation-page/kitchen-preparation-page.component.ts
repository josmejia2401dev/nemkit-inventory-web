import { ChangeDetectionStrategy, Component } from "@angular/core";
import { KitchenBoardComponent } from "../kitchen-board.component";

@Component({
  selector: "app-kitchen-preparation-page",
  standalone: true,
  imports: [KitchenBoardComponent],
  templateUrl: "./kitchen-preparation-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenPreparationPageComponent {}
