import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { shouldRetryOnOtherNode } from '../http/backend-endpoint.policy';
import { FAILOVER_ATTEMPTED } from '../http/http-context.tokens';
import { BackendEndpointService } from '../services/backend-endpoint.service';

/**
 * Reintenta una sola vez las lecturas contra el otro nodo cuando el activo
 * falla por red o proxy. Nunca reintenta escrituras: el usuario decide si
 * repite la acción, así no se duplican ventas, compras ni pagos.
 */
export const failoverInterceptor: HttpInterceptorFn = (req, next) => {
  const endpoints = inject(BackendEndpointService);
  const failedBaseUrl = endpoints.resolveBase(req.url);

  if (!failedBaseUrl || req.context.get(FAILOVER_ATTEMPTED)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!shouldRetry(error, req.method)) return throwError(() => error);

      return from(endpoints.failover(failedBaseUrl)).pipe(
        switchMap((nextBaseUrl) => {
          if (!nextBaseUrl) return throwError(() => error);

          return next(
            req.clone({
              url: `${nextBaseUrl}${req.url.slice(failedBaseUrl.length)}`,
              context: req.context.set(FAILOVER_ATTEMPTED, true),
            }),
          );
        }),
      );
    }),
  );
};

function shouldRetry(error: unknown, method: string): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  return shouldRetryOnOtherNode(method, error.status, error.error);
}
