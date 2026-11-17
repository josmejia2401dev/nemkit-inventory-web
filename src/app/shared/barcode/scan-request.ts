/**
 * Pedido de escaneo hacia un diálogo. `seq` numera la petición porque el mismo
 * código puede escanearse dos veces seguidas: el contador fuerza el reenvío.
 */
export interface ScanRequest {
  code: string;
  seq: number;
}

export const EMPTY_SCAN: ScanRequest = { code: "", seq: 0 };

export function nextScan(current: ScanRequest, code: string): ScanRequest {
  return { code, seq: current.seq + 1 };
}
