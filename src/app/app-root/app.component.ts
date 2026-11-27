import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '@nemkit/foundation-web';
import { LoadingBarComponent } from '@nemkit/foundation-web';
import { ConfirmDialogComponent } from '@nemkit/foundation-web';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoadingBarComponent, ConfirmDialogComponent],
  templateUrl: "./app.component.html",
})
export class AppComponent {}
