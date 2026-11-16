import { HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
/** Evita reintentos en bucle: el reintento por failover ocurre una sola vez. */
export const FAILOVER_ATTEMPTED = new HttpContextToken<boolean>(() => false);
