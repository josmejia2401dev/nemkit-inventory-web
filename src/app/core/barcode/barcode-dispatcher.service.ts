import { Injectable } from "@angular/core";
import { BarcodeScan, BarcodeScanHandler } from "./barcode.types";

/**
 * Enruta los escaneos al último handler registrado (el contexto activo).
 * El servicio no conoce productos, ventas ni ninguna otra pantalla: solo
 * entrega códigos a quien esté escuchando.
 */
@Injectable({ providedIn: "root" })
export class BarcodeDispatcherService {
  private readonly handlers = new Map<number, BarcodeScanHandler>();
  private readonly stack: number[] = [];
  private nextId = 1;

  /** Registra un handler y devuelve la función para desregistrarlo. */
  register(handler: BarcodeScanHandler): () => void {
    const id = this.nextId++;
    this.handlers.set(id, handler);
    this.stack.push(id);
    return () => this.unregister(id);
  }

  unregister(id: number): void {
    this.handlers.delete(id);
    const index = this.stack.lastIndexOf(id);
    if (index >= 0) this.stack.splice(index, 1);
  }

  /** `true` si algún handler consumió el escaneo. */
  dispatch(scan: BarcodeScan): boolean {
    for (let index = this.stack.length - 1; index >= 0; index -= 1) {
      const handler = this.handlers.get(this.stack[index]);
      if (!handler) continue;
      if (handler(scan) === false) continue;
      return true;
    }
    return false;
  }
}
