import { ChangeDetectionStrategy, Component } from "@angular/core";
import { KitchenBoardComponent } from "./kitchen-board.component";

@Component({
  selector: "app-kitchen-service-page",
  standalone: true,
  imports: [KitchenBoardComponent],
  template: `<app-kitchen-board [mode]="'service'" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenServicePageComponent {}
