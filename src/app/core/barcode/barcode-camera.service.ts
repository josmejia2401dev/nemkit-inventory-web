import { Injectable, signal } from "@angular/core";

export const BARCODE_CAMERA_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
];

interface DetectedBarcodeLike {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcodeLike[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

export type CameraStop = () => void;

/**
 * Envoltura de la cámara y del detector nativo. No conoce productos: entrega
 * códigos a quien la abra y libera los tracks al detenerse.
 */
@Injectable({ providedIn: "root" })
export class BarcodeCameraService {
  /** Requiere contexto seguro (HTTPS/localhost) y un detector disponible. */
  readonly supported = signal(this.detectSupport());

  /**
   * Abre la cámara, reproduce en `video` y llama `onCode` por cada lectura.
   * Devuelve una función idempotente para cerrar cámara y detector.
   */
  async start(
    video: HTMLVideoElement,
    onCode: (code: string) => void,
  ): Promise<CameraStop> {
    const Detector = this.detectorConstructor();
    if (!Detector) throw new Error("unsupported");

    if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastCode = "";
    let lastAt = 0;

    const stop = (): void => {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      stream.getTracks().forEach((track) => track.stop());
      if (video.srcObject === stream) video.srcObject = null;
    };

    try {
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play();
    } catch (error) {
      stop();
      throw error;
    }

    const detector = new Detector({ formats: BARCODE_CAMERA_FORMATS });

    const tick = async (): Promise<void> => {
      if (stopped) return;
      try {
        if (video.readyState >= 2) {
          const results = await detector.detect(video);
          const code = results[0]?.rawValue?.trim() ?? "";
          const now = Date.now();
          if (code && (code !== lastCode || now - lastAt > 1500)) {
            lastCode = code;
            lastAt = now;
            onCode(code);
          }
        }
      } catch {
        // Un frame fallido no detiene el escaneo.
      }
      if (!stopped) timer = setTimeout(tick, 180);
    };

    timer = setTimeout(tick, 250);
    return stop;
  }

  private detectSupport(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const media = navigator.mediaDevices;
    return Boolean(
      media && typeof media.getUserMedia === "function" && this.detectorConstructor(),
    );
  }

  private detectorConstructor(): BarcodeDetectorCtor | null {
    if (typeof window === "undefined") return null;
    const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    return typeof ctor === "function" ? ctor : null;
  }
}
