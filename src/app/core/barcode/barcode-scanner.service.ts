import { DOCUMENT } from "@angular/common";
import { Injectable, OnDestroy, computed, inject, signal } from "@angular/core";
import { Subject } from "rxjs";
import { BarcodeConfigService } from "./barcode-config.service";
import { BarcodeDispatcherService } from "./barcode-dispatcher.service";
import { BarcodeScan } from "./barcode.types";

const MAX_BUFFER_LENGTH = 128;
const SUPPRESS_TERMINATOR_MS = 250;
const ACTIVITY_RESET_MS = 2 * 60 * 1000;
const ACTIVITY_KEY = "nemkit.barcode.lastActivity";

type CaptureElement = HTMLInputElement | HTMLTextAreaElement;

interface FieldSnapshot {
  element: CaptureElement;
  value: string;
}

export type BarcodeScannerState = "active" | "configured" | "idle" | "off";

/**
 * Escucha la pistola USB/Bluetooth en modo HID keyboard. Los caracteres llegan
 * como teclado; se detectan por velocidad y terminador para no confundirlos con
 * la escritura humana. Emite códigos y deja que el dispatcher decida qué hacer.
 */
@Injectable({ providedIn: "root" })
export class BarcodeScannerService implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly configService = inject(BarcodeConfigService);
  private readonly dispatcher = inject(BarcodeDispatcherService);

  private readonly scansSubject = new Subject<BarcodeScan>();
  readonly scans$ = this.scansSubject.asObservable();

  /** Actividad reciente (para el icono verde del header). */
  readonly recent = signal<boolean>(false);

  readonly state = computed<BarcodeScannerState>(() => {
    if (!this.configService.config().enabled) return "off";
    if (this.recent()) return "active";
    return this.configService.customized() ? "configured" : "idle";
  });

  private buffer = "";
  private gaps: number[] = [];
  private lastKeyAt = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshot: FieldSnapshot | null = null;
  private suspendDispatch = false;
  private terminatorUntil = 0;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.document.addEventListener("keydown", this.onKeyDown, true);
    if (this.readLastActivity()) this.markRecent();
  }

  ngOnDestroy(): void {
    this.document.removeEventListener("keydown", this.onKeyDown, true);
    this.clearSettleTimer();
    if (this.activityTimer) clearTimeout(this.activityTimer);
  }

  /**
   * Desvía los escaneos al diálogo de prueba sin ejecutar la acción de la
   * pantalla. El diálogo sigue recibiendo los códigos por `scans$`.
   */
  setDispatchSuspended(suspended: boolean): void {
    this.suspendDispatch = suspended;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    if (!this.configService.config().enabled) return;

    const key = event.key;
    const isTerminator = key === "Enter" || key === "Tab";

    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
      this.resetBuffer();
      return;
    }

    if (isTerminator) {
      if (this.buffer) {
        const accepted = this.finalize(key);
        if (accepted) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      // Enter de un formulario que llegó justo después del fin por pausa.
      if (Date.now() < this.terminatorUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (key === "Escape" || key === "Backspace" || key.length !== 1) {
      this.resetBuffer();
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement && this.isIgnored(target)) {
      this.resetBuffer();
      return;
    }

    if (!this.buffer) {
      this.gaps = [];
      this.captureSnapshot();
    } else {
      this.gaps.push(Date.now() - this.lastKeyAt);
    }

    this.lastKeyAt = Date.now();
    this.buffer += key;

    if (this.buffer.length > MAX_BUFFER_LENGTH) {
      this.resetBuffer();
      return;
    }

    this.scheduleSettle();
  };

  /**
   * Cierra la secuencia. Devuelve `true` si se trató de un escaneo válido.
   */
  private finalize(terminatorKey?: string): boolean {
    const raw = this.buffer;
    const gaps = [...this.gaps];
    const snapshot = this.snapshot;
    this.clearSettleTimer();
    this.resetBuffer();

    if (!this.qualifies(raw, gaps)) {
      // Fue tecleo humano: no se toca el valor del campo.
      return false;
    }

    const config = this.configService.config();
    if (terminatorKey === "Enter" && config.terminator === "tab") {
      this.restoreSnapshot(snapshot);
      return false;
    }
    if (terminatorKey === "Tab" && config.terminator === "enter") {
      this.restoreSnapshot(snapshot);
      return false;
    }

    const code = this.normalize(raw);
    if (!code) {
      this.restoreSnapshot(snapshot);
      return false;
    }

    // El código no debe quedar escrito en el campo que tenía el foco.
    this.restoreSnapshot(snapshot);
    this.terminatorUntil = Date.now() + SUPPRESS_TERMINATOR_MS;
    this.emit(code, "hid");
    return true;
  }

  private qualifies(raw: string, gaps: number[]): boolean {
    const config = this.configService.config();
    const code = this.normalize(raw);
    if (code.length < config.minLength) return false;
    if (!gaps.length) return false;
    if (gaps.some((gap) => gap > config.maxKeyGapMs)) return false;

    const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    return average <= config.maxAverageGapMs;
  }

  private normalize(raw: string): string {
    const config = this.configService.config();
    let code = raw;
    if (config.prefix && code.startsWith(config.prefix)) {
      code = code.slice(config.prefix.length);
    }
    if (config.suffix && code.endsWith(config.suffix)) {
      code = code.slice(0, -config.suffix.length);
    }
    return code.trim();
  }

  private scheduleSettle(): void {
    this.clearSettleTimer();
    const delay = this.configService.config().maxKeyGapMs + 20;
    this.settleTimer = setTimeout(() => {
      if (this.buffer) this.finalize();
    }, delay);
  }

  private clearSettleTimer(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  private resetBuffer(): void {
    this.buffer = "";
    this.gaps = [];
    this.lastKeyAt = 0;
    this.snapshot = null;
  }

  private captureSnapshot(): void {
    const element = this.document.activeElement;
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
      this.snapshot = null;
      return;
    }
    if (element.disabled || element.readOnly || element.type === "password") {
      this.snapshot = null;
      return;
    }
    this.snapshot = { element, value: element.value };
  }

  private restoreSnapshot(snapshot: FieldSnapshot | null): void {
    if (!snapshot) return;
    const { element, value } = snapshot;
    if (element.value === value) return;
    element.value = value;
    // Angular escucha `input`; así se restaura también el modelo del campo.
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private isIgnored(target: HTMLElement): boolean {
    if (target.closest("[data-barcode-ignore]")) return true;
    if (target.isContentEditable) return true;
    return false;
  }

  private emit(code: string, source: BarcodeScan["source"]): void {
    if (!code) return;
    const scan: BarcodeScan = { code, source, at: Date.now() };
    this.persistActivity(scan.at);
    this.markRecent();
    this.feedback();

    this.scansSubject.next(scan);
    if (!this.suspendDispatch) this.dispatcher.dispatch(scan);
  }

  private feedback(): void {
    const config = this.configService.config();
    if (config.vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(40);
      } catch {
        // Dispositivo sin vibración.
      }
    }
    if (config.beep) this.playBeep();
  }

  private playBeep(): void {
    if (typeof window === "undefined") return;
    try {
      const audioScope = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioCtor = audioScope.AudioContext ?? audioScope.webkitAudioContext;
      if (!AudioCtor) return;
      this.audioContext ??= new AudioCtor();
      const context = this.audioContext;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.09);
    } catch {
      // Audio no disponible: el escaneo sigue funcionando.
    }
  }

  private markRecent(): void {
    this.recent.set(true);
    if (this.activityTimer) clearTimeout(this.activityTimer);
    this.activityTimer = setTimeout(() => this.recent.set(false), ACTIVITY_RESET_MS);
  }

  private readLastActivity(): number | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const value = Number(localStorage.getItem(ACTIVITY_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  private persistActivity(at: number): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(ACTIVITY_KEY, String(at));
    } catch {
      // Sin almacenamiento: se mantiene en memoria.
    }
  }
}
