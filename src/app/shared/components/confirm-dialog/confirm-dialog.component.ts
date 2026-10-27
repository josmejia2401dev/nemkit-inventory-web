import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: "./confirm-dialog.component.html",
})
export class ConfirmDialogComponent {
  confirmService = inject(ConfirmService);

  // Si el usuario cierra el diálogo (ESC/overlay), se trata como rechazo.
  onVisibleChange(visible: boolean): void {
    if (!visible) this.confirmService.reject();
  }
}
