import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, delay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SKIP_AUTH } from '../../http/http-context.tokens';
import { AUTH_ENDPOINTS } from '../auth.config';
import { isJwtExpired } from '../utils/jwt.util';

/**
 * Attaches `Authorization: Bearer <token>` to every request unless the caller
 * opts out via `SKIP_AUTH`, and recovers from a 401 by delegating to
 * `AuthService.refreshToken()` — which is shared, so concurrent 401s only
 * trigger one round-trip.
 *
 * Proactive freshness: if the stored access token is already expired (or
 * within a short window of expiry), the interceptor refreshes BEFORE
 * sending. This eliminates the 401 → refresh → retry round-trip on startup
 * and avoids a storm of expired requests hitting the server simultaneously.
 *
 * Auth endpoints (login / refresh / logout) are excluded from both paths to
 * avoid recursion.
 */

/** Safety margin: treat a token expiring within this window as already expired. */
const EXPIRY_BUFFER_MS = 10_000;

/**
 * This backend has a confirmed, deterministic bug in how it serves non-2xx
 * response BODIES over HTTP/2: the 401 status and headers arrive intact
 * (confirmed via direct reproduction — IIS/ASP.NET headers are present), but
 * the moment any client actually reads the body — which every real HTTP
 * client does, `fetch()`/`HttpClient` included, to get the JSON error
 * payload — the connection resets with `net::ERR_HTTP2_PROTOCOL_ERROR` and
 * the request rejects as status 0 ("network error") instead of ever
 * surfacing as 401. This is NOT a race — it reproduces 100% of the time for
 * every 401 response from this backend, with any delay, while 200 responses
 * read their bodies fine. So a status-0 failure on an authenticated request
 * is, in practice, always really a 401: replaying the SAME (stale) token
 * would just hit the identical server bug again, so we skip straight to
 * refresh-and-retry with a NEW token instead of wasting a cycle on a replay
 * that's guaranteed to fail identically.
 */
const NETWORK_ERROR_STATUS = 0;

/**
 * Brief pause before the post-refresh retry. Not a workaround for the bug
 * above (that one is unconditional, not timing-sensitive) — just ordinary
 * defensive spacing so the retry doesn't share a wire-level race with
 * whatever tore down the previous request's connection.
 */
const RETRY_SETTLE_DELAY_MS = 200;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) return next(req);

  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  // Proactively refresh if the token is expired or about to expire.
  // `refreshToken()` is shared across concurrent callers so N startup
  // requests all hitting this path still produce only one network round-trip.
  if (token && isJwtExpired(token, EXPIRY_BUFFER_MS)) {
    return auth.refreshToken().pipe(
      switchMap((tokens) => next(withAuthHeader(req, tokens.accessToken))),
      catchError((err) => throwError(() => err)),
    );
  }

  const authReq = token ? withAuthHeader(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isAuthEndpoint(req.url)) return throwError(() => err);

      // See NETWORK_ERROR_STATUS above — a status-0 failure on an
      // authenticated request is treated the same as a real 401 rather than
      // a generic network error, since this backend's body-read bug means
      // that's what it almost always actually is.
      if (err.status === 401 || (err.status === NETWORK_ERROR_STATUS && token)) {
        return retryAfterRefresh(req, next, auth);
      }

      return throwError(() => err);
    })
  );
};

function retryAfterRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
) {
  // `force: true` — the server just rejected the current access token, so
  // the local "is it still fresh" shortcut inside `refreshToken()` must be
  // skipped; trusting it here is what let a server-invalidated-but-locally-
  // unexpired token get handed straight back instead of actually refreshed
  // (see AuthService.refreshToken's `force` param doc for the full story).
  return auth.refreshToken(true).pipe(
    delay(RETRY_SETTLE_DELAY_MS),
    switchMap((tokens) => next(withAuthHeader(req, tokens.accessToken))),
    catchError((refreshErr) =>
      // refreshToken() already cleared the session and redirected — just
      // surface the error so the original caller's stream completes.
      throwError(() => refreshErr)
    )
  );
}

function withAuthHeader(
  req: HttpRequest<unknown>,
  token: string,
): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(AUTH_ENDPOINTS.login) ||
    url.includes(AUTH_ENDPOINTS.refresh) ||
    url.includes(AUTH_ENDPOINTS.logout)
  );
}
