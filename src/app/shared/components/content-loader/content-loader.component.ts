import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-content-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./content-loader.component.html",
  styleUrl: "./content-loader.component.css",
})
export class ContentLoaderComponent {
  message = input('Loading...');
}
