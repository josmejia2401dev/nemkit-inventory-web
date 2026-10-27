import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '../shared/components/toast/toast.component';
import { LoadingBarComponent } from '../shared/components/loading-bar/loading-bar.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoadingBarComponent, ConfirmDialogComponent],
  templateUrl: "./app.component.html",
})
export class AppComponent {}
