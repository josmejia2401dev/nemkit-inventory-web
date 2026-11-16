import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoadingService } from '../services/loading.service';
import { SKIP_LOADING } from '../http/http-context.tokens';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) return next(req);

  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(
    // El primer request contra Render puede durar todo el cold start, así que
    // el corte cubre ese escenario y no solo la latencia normal.
    timeout(environment.coldStartTimeoutMs + 15_000),
    finalize(() => loading.stop()),
  );
};
