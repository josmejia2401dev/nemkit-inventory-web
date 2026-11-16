import { Injectable, signal } from "@angular/core";

/**
 * Estado de UI compartido entre el icono del topbar y las ventanas de escaneo.
 * Vive fuera del layout para que la cámara y el diálogo se pinten por encima de
 * cualquier contexto de apilado (topbar, barra móvil, diálogos de página).
 */
@Injectable({ providedIn: "root" })
export class BarcodeToolsService {
  readonly configOpen = signal(false);
  /** Cada incremento pide abrir la cámara del overlay. */
  readonly cameraToken = signal(0);

  openConfig(): void {
    this.configOpen.set(true);
  }

  setConfigOpen(open: boolean): void {
    this.configOpen.set(open);
  }

  requestCamera(): void {
    this.cameraToken.update((token) => token + 1);
  }
}
