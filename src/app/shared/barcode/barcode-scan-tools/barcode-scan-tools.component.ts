import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from "@angular/core";
import { BarcodeScannerService } from "../../../core/barcode/barcode-scanner.service";
import { BarcodeToolsService } from "../../../core/barcode/barcode-tools.service";
import { BarcodeCameraBarComponent } from "../barcode-camera-bar/barcode-camera-bar.component";

/**
 * Control inline de escaneo para páginas operativas: muestra el estado de la
 * pistola (actividad reciente) y el acceso a la cámara. La pistola HID no se
 * puede detectar como dispositivo desde el navegador; el estado refleja si ha
 * enviado códigos recientemente.
 */
@Component({
  selector: "app-barcode-scan-tools",
  standalone: true,
  imports: [BarcodeCameraBarComponent],
  templateUrl: "./barcode-scan-tools.component.html",
  styleUrl: "./barcode-scan-tools.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeScanToolsComponent {
  private readonly scanner = inject(BarcodeScannerService);
  private readonly tools = inject(BarcodeToolsService);

  /** Etiqueta accesible del botón de cámara. */
  readonly cameraLabel = input("Escanear con la cámara");
  /** Texto visible del botón de cámara. */
  readonly cameraText = input("Cámara");
  /** Permite ocultar la segunda línea de estado en espacios muy reducidos. */
  readonly showStatusText = input(true);

  readonly scanned = output<string>();
  readonly state = this.scanner.state;

  readonly statusLabel = computed(() => {
    switch (this.state()) {
      case "active":
        return "Activa";
      case "configured":
        return "Sin actividad";
      case "off":
        return "Desactivada";
      default:
        return "Escanea";
    }
  });

  readonly statusTitle = computed(() => {
    switch (this.state()) {
      case "active":
        return "Pistola activa: escanea un código o haz clic para probarla";
      case "configured":
        return "Pistola configurada sin actividad reciente: haz clic para probarla";
      case "off":
        return "Pistola desactivada: haz clic para activarla";
      default:
        return "Pistola lista: escanea un código o haz clic para configurarla";
    }
  });

  openConfig(): void {
    this.tools.openConfig();
  }
}
