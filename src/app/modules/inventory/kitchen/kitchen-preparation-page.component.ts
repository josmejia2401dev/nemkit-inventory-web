import { ChangeDetectionStrategy, Component } from "@angular/core";
import { KitchenBoardComponent } from "./kitchen-board.component";

@Component({
  selector: "app-kitchen-preparation-page",
  standalone: true,
  imports: [KitchenBoardComponent],
  template: `<app-kitchen-board [mode]="'preparation'" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenPreparationPageComponent {}
