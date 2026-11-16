import { Injectable, signal } from "@angular/core";

export type BarcodeTerminator = "enter" | "tab" | "any";

export interface BarcodeConfig {
  /** Captura global de la pistola HID. */
  enabled: boolean;
  /** Longitud mínima del código para considerarlo un escaneo. */
  minLength: number;
  /** Tiempo máximo entre teclas consecutivas. */
  maxKeyGapMs: number;
  /** Tiempo promedio máximo de la secuencia completa. */
  maxAverageGapMs: number;
  /** Tecla que cierra el escaneo. */
  terminator: BarcodeTerminator;
  /** Prefijo que la pistola agrega al código (se elimina). */
  prefix: string;
  /** Sufijo que la pistola agrega al código (se elimina). */
  suffix: string;
  /** Emitir un tono corto al detectar un escaneo. */
  beep: boolean;
  /** Vibrar en dispositivos compatibles al detectar un escaneo. */
  vibrate: boolean;
}

export interface BarcodeSensitivity {
  value: "high" | "medium" | "low";
  label: string;
  minLength: number;
  maxKeyGapMs: number;
  maxAverageGapMs: number;
}

export const BARCODE_SENSITIVITIES: BarcodeSensitivity[] = [
  { value: "high", label: "Alta (pistolas rápidas)", minLength: 3, maxKeyGapMs: 100, maxAverageGapMs: 35 },
  { value: "medium", label: "Media (recomendada)", minLength: 4, maxKeyGapMs: 120, maxAverageGapMs: 50 },
  { value: "low", label: "Baja (pistolas lentas)", minLength: 6, maxKeyGapMs: 180, maxAverageGapMs: 80 },
];

const STORAGE_KEY = "nemkit.barcode.config.v1";

const DEFAULT_CONFIG: BarcodeConfig = {
  enabled: true,
  minLength: 4,
  maxKeyGapMs: 120,
  maxAverageGapMs: 50,
  terminator: "any",
  prefix: "",
  suffix: "",
  beep: true,
  vibrate: true,
};

/** Ajustes de captura HID persistidos por dispositivo. */
@Injectable({ providedIn: "root" })
export class BarcodeConfigService {
  private readonly state = signal<BarcodeConfig>(this.readConfig());
  private readonly custom = signal<boolean>(this.readCustomized());

  readonly config = this.state.asReadonly();
  readonly customized = this.custom.asReadonly();

  update(patch: Partial<BarcodeConfig>): void {
    this.state.update((current) => this.sanitize({ ...current, ...patch }));
    this.custom.set(true);
    this.persist();
  }

  applySensitivity(value: BarcodeSensitivity["value"]): void {
    const preset = BARCODE_SENSITIVITIES.find((item) => item.value === value);
    if (!preset) return;
    this.update({
      minLength: preset.minLength,
      maxKeyGapMs: preset.maxKeyGapMs,
      maxAverageGapMs: preset.maxAverageGapMs,
    });
  }

  /** Sensibilidad que coincide con los umbrales actuales (o "medium"). */
  sensitivity(): BarcodeSensitivity["value"] {
    const config = this.state();
    const match = BARCODE_SENSITIVITIES.find(
      (preset) =>
        preset.minLength === config.minLength &&
        preset.maxKeyGapMs === config.maxKeyGapMs &&
        preset.maxAverageGapMs === config.maxAverageGapMs,
    );
    return match?.value ?? "medium";
  }

  reset(): void {
    this.state.set({ ...DEFAULT_CONFIG });
    this.custom.set(false);
    this.persist();
  }

  private sanitize(config: BarcodeConfig): BarcodeConfig {
    return {
      ...config,
      minLength: this.clamp(config.minLength, 2, 32),
      maxKeyGapMs: this.clamp(config.maxKeyGapMs, 30, 400),
      maxAverageGapMs: this.clamp(config.maxAverageGapMs, 15, 200),
      prefix: String(config.prefix ?? "").slice(0, 16),
      suffix: String(config.suffix ?? "").slice(0, 16),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  }

  private readConfig(): BarcodeConfig {
    if (typeof localStorage === "undefined") return { ...DEFAULT_CONFIG };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ...DEFAULT_CONFIG };
      return this.sanitize({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private readCustomized(): boolean {
    if (typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem(`${STORAGE_KEY}.customized`) === "1";
    } catch {
      return false;
    }
  }

  private persist(): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
      localStorage.setItem(`${STORAGE_KEY}.customized`, this.custom() ? "1" : "0");
    } catch {
      // Sin almacenamiento disponible: la configuración vive solo en memoria.
    }
  }
}
