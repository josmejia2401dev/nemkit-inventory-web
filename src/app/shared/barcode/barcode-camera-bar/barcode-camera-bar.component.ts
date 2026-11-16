import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { BarcodeCameraService, CameraStop } from "../../../core/barcode/barcode-camera.service";

@Component({
  selector: "app-barcode-camera-bar",
  standalone: true,
  templateUrl: "./barcode-camera-bar.component.html",
  styleUrl: "./barcode-camera-bar.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeCameraBarComponent implements OnChanges {
  private readonly camera = inject(BarcodeCameraService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>("video");

  readonly label = input("Escanear con cámara");
  /** Texto visible junto al icono cuando `withLabel` está activo. */
  readonly text = input("Cámara");
  /** Muestra texto junto al icono en vez de un botón solo-icono. */
  readonly withLabel = input(false);
  /** Oculta el botón cuando otro componente abre la cámara por nosotros. */
  readonly showTrigger = input(true);
  /** Cambiar el token abre la cámara (usado por el icono del topbar). */
  @Input() openToken = 0;

  readonly supported = this.camera.supported;
  readonly open = signal(false);
  readonly starting = signal(false);
  readonly error = signal<string | null>(null);

  @Output() scanned = new EventEmitter<string>();

  private stopCamera: CameraStop | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  ngOnChanges(changes: SimpleChanges): void {
    const token = changes["openToken"];
    if (token && !token.firstChange && this.openToken > 0) this.start();
  }

  start(): void {
    if (this.open()) return;
    if (!this.supported()) {
      this.error.set(this.messageFor(new Error("unsupported")));
      this.open.set(true);
      return;
    }
    this.open.set(true);
    this.error.set(null);
    this.starting.set(true);
    setTimeout(() => void this.attach(), 0);
  }

  close(): void {
    this.stop();
    this.open.set(false);
    this.starting.set(false);
  }

  @HostListener("document:visibilitychange")
  closeWhenHidden(): void {
    if (this.open() && document.visibilityState === "hidden") this.close();
  }

  private async attach(attempt = 0): Promise<void> {
    if (!this.open()) return;
    const video = this.videoRef()?.nativeElement;
    if (!video) {
      if (attempt < 10) setTimeout(() => void this.attach(attempt + 1), 30);
      return;
    }

    try {
      const stop = await this.camera.start(video, (code) => this.onCode(code));
      // Si cerraron el panel mientras se pedía permiso, apagamos de inmediato.
      if (!this.open()) {
        stop();
        return;
      }
      this.stopCamera = stop;
      this.starting.set(false);
    } catch (error) {
      this.starting.set(false);
      this.error.set(this.messageFor(error));
    }
  }

  private onCode(code: string): void {
    const value = code.trim();
    if (!value) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(40);
      } catch {
        // Dispositivo sin vibración.
      }
    }
    this.scanned.emit(value);
    this.close();
  }

  private stop(): void {
    this.stopCamera?.();
    this.stopCamera = null;
  }

  private messageFor(error: unknown): string {
    const name = (error as { name?: string } | null)?.name ?? "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Permiso de cámara denegado. Habilítalo en el navegador o escribe el código a mano.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No se encontró una cámara disponible en este dispositivo.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.";
    }
    if ((error as Error | null)?.message === "unsupported" || !this.supported()) {
      return "Este navegador no puede leer códigos con la cámara. Usa la pistola o escribe el código a mano.";
    }
    return "No pudimos abrir la cámara. Intenta de nuevo o escribe el código a mano.";
  }
}
