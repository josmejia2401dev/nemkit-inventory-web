import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { BarcodeScannerService } from "../../../core/barcode/barcode-scanner.service";
import { BarcodeToolsService } from "../../../core/barcode/barcode-tools.service";

const STORAGE_KEY = "nemkit.barcode.banner.v1";

/**
 * Aviso descartable que hace visible el escaneo (pistola o cámara). Aparece una
 * sola vez por navegador y desaparece cuando el escáner ya está en uso.
 */
@Component({
  selector: "app-barcode-discovery-banner",
  standalone: true,
  templateUrl: "./barcode-discovery-banner.component.html",
  styleUrl: "./barcode-discovery-banner.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeDiscoveryBannerComponent {
  private readonly scanner = inject(BarcodeScannerService);
  private readonly tools = inject(BarcodeToolsService);

  private readonly dismissed = signal(this.readDismissed());

  /** El banner sobra si la pistola ya está activa o configurada. */
  private readonly scannerReady = computed(() => {
    const state = this.scanner.state();
    return state === "active" || state === "configured";
  });

  readonly visible = computed(() => !this.dismissed() && !this.scannerReady());

  testCamera(): void {
    this.tools.requestCamera();
  }

  openConfig(): void {
    this.tools.openConfig();
  }

  dismiss(): void {
    this.dismissed.set(true);
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // Almacenamiento no disponible (modo privado): se oculta solo en memoria.
    }
  }

  private readDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === "dismissed";
    } catch {
      return false;
    }
  }
}
