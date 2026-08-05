import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Attaches the Firebase ID token to API requests.
 *
 * Firebase has always authenticated the user in the browser, but the token was never sent
 * anywhere — every request identified its caller by a `user_id` string that the API trusted
 * verbatim. This is the client half of closing that (FRONTEND_IMPROVEMENT_PLAN.md §4.1).
 *
 * Three details that matter:
 *
 * - **Scoped to our own API.** The token is attached only to `environment.apiUrl`. Sending
 *   a credential to a third-party host would be a leak, not a feature.
 * - **The SDK owns refresh.** `getIdToken()` returns a cached token and refreshes it
 *   automatically near its one-hour expiry, so nothing is cached here.
 * - **One retry, never a loop.** A 401 triggers a single forced refresh and replay. If that
 *   also fails the error propagates, rather than the interceptor spinning.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private afAuth: AngularFireAuth) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.url.startsWith(environment.apiUrl)) {
      return next.handle(request);
    }

    return this.token(false).pipe(
      switchMap((token) => next.handle(this.withToken(request, token))),
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          return throwError(() => error);
        }
        // The token may simply have expired mid-flight; force a refresh and replay once.
        return this.token(true).pipe(
          switchMap((token) =>
            token ? next.handle(this.withToken(request, token)) : throwError(() => error)
          )
        );
      })
    );
  }

  private token(forceRefresh: boolean): Observable<string | null> {
    // `currentUser` is a Promise in the compat layer, not an Observable.
    return from(this.afAuth.currentUser).pipe(
      take(1),
      switchMap((user) => (user ? from(user.getIdToken(forceRefresh)) : of(null))),
      catchError(() => of(null))
    );
  }

  private withToken(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
    return token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;
  }
}
