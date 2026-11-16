/** Origen de un código escaneado. */
export type BarcodeScanSource = "hid" | "camera";

export interface BarcodeScan {
  /** Código normalizado (sin prefijo/sufijo configurados). */
  code: string;
  source: BarcodeScanSource;
  /** Marca de tiempo del escaneo. */
  at: number;
}

/**
 * Un handler puede devolver `false` para indicar que no consumió el escaneo y
 * permitir que lo reciba el siguiente handler registrado.
 */
export type BarcodeScanHandler = (scan: BarcodeScan) => boolean | void;
