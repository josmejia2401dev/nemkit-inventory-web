import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { BarcodeCameraService } from "../../../core/barcode/barcode-camera.service";
import { BarcodeScannerService } from "../../../core/barcode/barcode-scanner.service";
import { BarcodeToolsService } from "../../../core/barcode/barcode-tools.service";

/**
 * Iconos del topbar. Solo abren las ventanas compartidas; las ventanas viven en
 * `<app-barcode-overlays>` para escapar del contexto de apilado del topbar.
 */
@Component({
  selector: "app-barcode-status",
  standalone: true,
  templateUrl: "./barcode-status.component.html",
  styleUrl: "./barcode-status.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeStatusComponent {
  private readonly scanner = inject(BarcodeScannerService);
  private readonly camera = inject(BarcodeCameraService);
  private readonly tools = inject(BarcodeToolsService);

  readonly state = this.scanner.state;
  readonly cameraSupported = this.camera.supported;

  readonly scannerTitle = computed(() => {
    switch (this.state()) {
      case "active":
        return "Pistola de códigos activa · clic para configurar o probar";
      case "configured":
        return "Pistola configurada sin actividad reciente · clic para probar";
      case "off":
        return "Captura de pistola desactivada · clic para activar";
      default:
        return "Conectar o probar la pistola de códigos";
    }
  });

  openConfig(): void {
    this.tools.openConfig();
  }

  openCamera(): void {
    this.tools.requestCamera();
  }
}
