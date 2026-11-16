import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { LimitStatus } from "../../../core/services/limits.service";

@Component({
  selector: "app-plan-limit-banner",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./plan-limit-banner.component.html",
  styleUrl: "./plan-limit-banner.component.css",
})
export class PlanLimitBannerComponent {
  label = input.required<string>();
  plan = input.required<string>();
  limit = input<LimitStatus | null>(null);

  readonly atLimit = computed(() => (this.limit()?.remaining ?? 1) === 0);
}
