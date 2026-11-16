import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { BarcodeDispatcherService } from "../../../core/barcode/barcode-dispatcher.service";
import { BarcodeToolsService } from "../../../core/barcode/barcode-tools.service";
import { NotificationService } from "../../../core/services/notification.service";
import { BarcodeCameraBarComponent } from "../barcode-camera-bar/barcode-camera-bar.component";
import { BarcodeConfigDialogComponent } from "../barcode-config-dialog/barcode-config-dialog.component";

/**
 * Ventanas compartidas de escaneo. Se montan en la raíz del shell (no dentro
 * del topbar) para que la cámara y el diálogo queden por encima de la barra
 * móvil y de cualquier otro contexto de apilado.
 */
@Component({
  selector: "app-barcode-overlays",
  standalone: true,
  imports: [BarcodeCameraBarComponent, BarcodeConfigDialogComponent],
  templateUrl: "./barcode-overlays.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeOverlaysComponent {
  private readonly dispatcher = inject(BarcodeDispatcherService);
  private readonly notifications = inject(NotificationService);
  readonly tools = inject(BarcodeToolsService);

  /** La cámara del header entrega el código al contexto activo. */
  onCameraScanned(code: string): void {
    const handled = this.dispatcher.dispatch({
      code,
      source: "camera",
      at: Date.now(),
    });

    if (!handled) {
      this.notifications.info(
        "Código escaneado",
        `${code} · abre la pantalla donde quieras usarlo.`,
      );
    }
  }
}
